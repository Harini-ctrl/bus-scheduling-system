 const Driver = require("../models/Driver");

// GET ALL DRIVERS
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE DRIVER
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD DRIVER
exports.addDriver = async (req, res) => {
  try {
    const { name, licenseNumber, phone, shiftStart, shiftEnd } = req.body;

    // Check duplicate license
    const existing = await Driver.findOne({ licenseNumber });
    if (existing) {
      return res.status(400).json({ message: "License number already registered" });
    }

    const driver = new Driver({ name, licenseNumber, phone, shiftStart, shiftEnd });
    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE DRIVER
exports.updateDriver = async (req, res) => {
  try {
    const { name, licenseNumber, phone, shiftStart, shiftEnd, status } = req.body;

    if (licenseNumber) {
      const existing = await Driver.findOne({
        licenseNumber,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ message: "License number already in use" });
      }
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { name, licenseNumber, phone, shiftStart, shiftEnd, status },
      { new: true, runValidators: true }
    );

    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE DRIVER
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};