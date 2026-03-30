const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    shiftStart: {
      type: String, // "08:00" format
    },
    shiftEnd: {
      type: String, // "16:00" format
    },
    status: {
      type: String,
      enum: ["available", "on-duty", "on-rest", "off-duty"],
      default: "available",
    },
    restUntil: {
      type: Date,
      default: null, // null = not on rest
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", DriverSchema);