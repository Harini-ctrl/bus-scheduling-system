const express = require("express");
const router  = express.Router();
const { getDrivers, getDriverById, addDriver, updateDriver, deleteDriver } = require("../controllers/driverController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/",       auth, getDrivers);
router.get("/:id",    auth, getDriverById);
router.post("/",      auth, role("admin", "scheduler"), addDriver);
router.put("/:id",    auth, role("admin", "scheduler"), updateDriver);
router.delete("/:id", auth, role("admin"), deleteDriver);

module.exports = router;