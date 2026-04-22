// controllers/scheduleController.js

const Schedule = require("../models/Schedule");
const Driver = require("../models/Driver");
const {
  checkBusConflict,
  checkDriverConflict,
  checkLinkedDutyConflict,
  isDriverOnRest,
} = require("../utils/conflictDetection");

// ─────────────────────────────────────────────
// GET ALL SCHEDULES
// ─────────────────────────────────────────────
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate("busId")
      .populate("driverId")
      .populate("routeId")
      .sort({ createdAt: -1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE SCHEDULE
// ─────────────────────────────────────────────
exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate("busId")
      .populate("driverId")
      .populate("routeId");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// CREATE SCHEDULE
// ─────────────────────────────────────────────
exports.createSchedule = async (req, res) => {
  try {
    const {
      busId,
      driverId,
      routeId,
      departureTime,
      arrivalTime,
      dutyType,
      restDuration,
    } = req.body;

    // STEP 1 — validate required fields
    if (!busId || !driverId || !routeId || !departureTime || !arrivalTime || !dutyType) {
      return res.status(400).json({
        message:
          "All fields required: busId, driverId, routeId, departureTime, arrivalTime, dutyType",
      });
    }

    // Validate dutyType value
    if (!["linked", "unlinked"].includes(dutyType)) {
      return res.status(400).json({
        message: "dutyType must be 'linked' or 'unlinked'",
      });
    }

    // Validate time format "HH:MM"
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(departureTime) || !timeRegex.test(arrivalTime)) {
      return res.status(400).json({
        message: "departureTime and arrivalTime must be in HH:MM format (e.g. 08:00)",
      });
    }

    // Validate departure is before arrival
    const [depH, depM] = departureTime.split(":").map(Number);
    const [arrH, arrM] = arrivalTime.split(":").map(Number);
    if (depH * 60 + depM >= arrH * 60 + arrM) {
      return res.status(400).json({
        message: "departureTime must be earlier than arrivalTime",
      });
    }

    // STEP 2 — fetch driver and verify existence
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // STEP 3 — rest period check (uses driver.restUntil from Driver document)
    if (isDriverOnRest(driver.restUntil)) {
      return res.status(400).json({
        message: `Driver is on rest until ${new Date(driver.restUntil).toLocaleTimeString()}`,
      });
    }

    // STEP 4 — fetch all active schedules for overlap checks
    // Only check against scheduled/active — completed/cancelled cannot conflict
    const activeSchedules = await Schedule.find({
      status: { $in: ["scheduled", "active"] },
    }).lean();

    // STEP 5 — driver conflict (interval overlap — fixes the exact-match bug)
    const driverConflict = checkDriverConflict(
      driverId,
      departureTime,
      arrivalTime,
      activeSchedules
    );
    if (driverConflict.conflict) {
      return res.status(400).json({
        message: `Driver is already assigned to a schedule between ${driverConflict.schedule.departureTime} and ${driverConflict.schedule.arrivalTime}`,
      });
    }

    // STEP 6 — bus conflict (interval overlap — fixes the exact-match bug)
    const busConflict = checkBusConflict(
      busId,
      departureTime,
      arrivalTime,
      activeSchedules
    );
    if (busConflict.conflict) {
      return res.status(400).json({
        message: `Bus is already scheduled between ${busConflict.schedule.departureTime} and ${busConflict.schedule.arrivalTime}`,
      });
    }

    // STEP 7 — linked duty check (driver cannot be linked to two different buses)
    if (dutyType === "linked") {
      const linkedConflict = checkLinkedDutyConflict(
        driverId,
        busId,
        activeSchedules
      );
      if (linkedConflict.conflict) {
        return res.status(400).json({ message: linkedConflict.message });
      }
    }

    // STEP 8 — create and save schedule
    const schedule = new Schedule({
      busId,
      driverId,
      routeId,
      departureTime,
      arrivalTime,
      dutyType,
      restDuration: restDuration || 30,
      status: "scheduled",
    });

    await schedule.save();

    // STEP 9 — update driver status to on-duty
    await Driver.findByIdAndUpdate(driverId, { status: "on-duty" });

    // Return populated schedule so frontend gets full bus/driver/route objects
    const populated = await Schedule.findById(schedule._id)
      .populate("busId")
      .populate("driverId")
      .populate("routeId");

    res.status(201).json({
      message: "Schedule created successfully",
      schedule: populated,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE SCHEDULE STATUS
// ─────────────────────────────────────────────
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate the incoming status value
    const allowedStatuses = ["scheduled", "active", "completed", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const schedule = await Schedule.findById(req.params.id).populate("driverId");
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Prevent re-updating already completed or cancelled schedules
    if (["completed", "cancelled"].includes(schedule.status)) {
      return res.status(400).json({
        message: `Cannot update a schedule that is already ${schedule.status}`,
      });
    }

    schedule.status = status;
    await schedule.save();

    // When unlinked duty completes — put driver on rest for restDuration minutes
    if (status === "completed" && schedule.dutyType === "unlinked") {
      const restMinutes = schedule.restDuration || 30;
      const restUntil = new Date(Date.now() + restMinutes * 60 * 1000);
      await Driver.findByIdAndUpdate(schedule.driverId, {
        status: "on-rest",
        restUntil,
      });
    }

    // When linked duty completes — driver becomes available immediately
    if (status === "completed" && schedule.dutyType === "linked") {
      await Driver.findByIdAndUpdate(schedule.driverId, {
        status: "available",
        restUntil: null,
      });
    }

    // When schedule is cancelled — driver becomes available immediately
    if (status === "cancelled") {
      await Driver.findByIdAndUpdate(schedule.driverId, {
        status: "available",
        restUntil: null,
      });
    }

    res.json({ message: `Schedule marked as ${status}`, schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE SCHEDULE
// ─────────────────────────────────────────────
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // If deleted schedule had an active driver — free them up
    if (["scheduled", "active"].includes(schedule.status)) {
      await Driver.findByIdAndUpdate(schedule.driverId, {
        status: "available",
        restUntil: null,
      });
    }

    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};