 const Schedule = require("../models/Schedule");
const Driver = require("../models/Driver");

// GET ALL SCHEDULES
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

// GET SINGLE SCHEDULE
exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate("busId")
      .populate("driverId")
      .populate("routeId");
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE SCHEDULE
exports.createSchedule = async (req, res) => {
  try {
    console.log("=== CREATE SCHEDULE CALLED ===");
    console.log("Body:", req.body);

    const {
      busId,
      driverId,
      routeId,
      departureTime,
      arrivalTime,
      dutyType,
      restDuration,
    } = req.body;

    console.log("Extracted:", { busId, driverId, routeId, departureTime, arrivalTime, dutyType });

    // STEP 1 — validate required fields
    if (!busId || !driverId || !routeId || !departureTime || !arrivalTime || !dutyType) {
      return res.status(400).json({
        message: "All fields required: busId, driverId, routeId, departureTime, arrivalTime, dutyType",
      });
    }

    console.log("Step 1 passed - fields present");

    // STEP 2 — driver conflict
    const driverConflict = await Schedule.findOne({ driverId, departureTime });
    if (driverConflict) {
      return res.status(400).json({ message: "Driver already assigned at this departure time" });
    }

    console.log("Step 2 passed - no driver conflict");

    // STEP 3 — bus conflict
    const busConflict = await Schedule.findOne({ busId, departureTime });
    if (busConflict) {
      return res.status(400).json({ message: "Bus already assigned at this departure time" });
    }

    console.log("Step 3 passed - no bus conflict");

    // STEP 4 — rest period check
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    console.log("Step 4 - driver found:", driver.name);

    if (driver.restUntil && new Date() < new Date(driver.restUntil)) {
      return res.status(400).json({
        message: `Driver is on rest until ${new Date(driver.restUntil).toLocaleTimeString()}`,
      });
    }

    console.log("Step 4 passed - driver not on rest");

    // STEP 5 — linked duty check
    if (dutyType === "linked") {
      console.log("Step 5 - checking linked duty...");

      const previousLinked = await Schedule.findOne({
        driverId,
        dutyType: "linked",
        status: { $in: ["scheduled", "active"] },
      });

      console.log("Previous linked:", previousLinked);

      if (previousLinked) {
        console.log("previousLinked.busId:", previousLinked.busId);
        console.log("busId from request:", busId);

        const previousBusId = previousLinked.busId
          ? previousLinked.busId.toString()
          : null;

        if (previousBusId && previousBusId !== busId) {
          return res.status(400).json({
            message: "Driver already linked to a different bus",
          });
        }
      }
    }

    console.log("Step 5 passed - linked duty ok");

    // STEP 6 — create schedule
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
    console.log("Step 6 passed - schedule saved");

    // Update driver status
    await Driver.findByIdAndUpdate(driverId, { status: "on-duty" });
    console.log("Step 7 passed - driver status updated");

    res.status(201).json({
      message: "Schedule created successfully",
      schedule,
    });

  } catch (error) {
    console.log("=== ERROR ===", error.message);
    console.log("Stack:", error.stack);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE SCHEDULE STATUS
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const schedule = await Schedule.findById(req.params.id).populate("driverId");
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    schedule.status = status;
    await schedule.save();

    if (status === "completed" && schedule.dutyType === "unlinked") {
      const restMinutes = schedule.restDuration || 30;
      const restUntil = new Date(Date.now() + restMinutes * 60 * 1000);
      await Driver.findByIdAndUpdate(schedule.driverId, {
        status: "on-rest",
        restUntil,
      });
    }

    if (status === "completed" && schedule.dutyType === "linked") {
      await Driver.findByIdAndUpdate(schedule.driverId, {
        status: "available",
        restUntil: null,
      });
    }

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

// DELETE SCHEDULE
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });
    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};