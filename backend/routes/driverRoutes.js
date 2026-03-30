 const express = require("express");
const router = express.Router();
const { getDrivers, getDriverById, addDriver, updateDriver, deleteDriver } = require("../controllers/driverController");

router.get("/",      getDrivers);
router.get("/:id",   getDriverById);
router.post("/",     addDriver);
router.put("/:id",   updateDriver);
router.delete("/:id",deleteDriver);

module.exports = router;