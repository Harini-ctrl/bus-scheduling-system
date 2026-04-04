const express = require("express");
const router  = express.Router();
const {
  getSchedules, getScheduleById,
  createSchedule, updateScheduleStatus, deleteSchedule,
} = require("../controllers/scheduleController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/",              auth, getSchedules);
router.get("/:id",           auth, getScheduleById);
router.post("/",             auth, role("admin", "scheduler"), createSchedule);
router.patch("/:id/status",  auth, role("admin", "scheduler"), updateScheduleStatus);
router.delete("/:id",        auth, role("admin"), deleteSchedule);

module.exports = router;