const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    departureTime: {
      type: String,
      required: true, // "08:00" format
    },
    arrivalTime: {
      type: String,
      required: true, // "10:00" format
    },
    dutyType: {
      type: String,
      enum: ["linked", "unlinked"],
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled",
    },
    restDuration: {
      type: Number,
      default: 30, // rest minutes after completing unlinked duty
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schedule", ScheduleSchema);