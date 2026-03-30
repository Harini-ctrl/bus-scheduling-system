const express = require("express");
const router = express.Router();
const {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateScheduleStatus,
  deleteSchedule,
} = require("../controllers/scheduleController");

router.get("/",             getSchedules);
router.get("/:id",          getScheduleById);
router.post("/",            createSchedule);
router.patch("/:id/status", updateScheduleStatus);
router.delete("/:id",       deleteSchedule);

module.exports = router;
