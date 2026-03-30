 const Bus = require("../models/Bus");

// GET ALL BUSES
exports.getBuses = async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.json(buses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE BUS
exports.getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    res.json(bus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD BUS
exports.addBus = async (req, res) => {
  try {
    const { busNumber, capacity, status } = req.body;

    // Check duplicate bus number
    const existing = await Bus.findOne({ busNumber });
    if (existing) {
      return res.status(400).json({ message: "Bus number already exists" });
    }

    const bus = new Bus({ busNumber, capacity, status });
    await bus.save();
    res.status(201).json(bus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE BUS
exports.updateBus = async (req, res) => {
  try {
    const { busNumber, capacity, status } = req.body;

    // If busNumber is changing, check it's not taken by another bus
    if (busNumber) {
      const existing = await Bus.findOne({
        busNumber,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ message: "Bus number already in use" });
      }
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { busNumber, capacity, status },
      { new: true, runValidators: true }
    );

    if (!bus) return res.status(404).json({ message: "Bus not found" });
    res.json(bus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE BUS
exports.deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    res.json({ message: "Bus deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};