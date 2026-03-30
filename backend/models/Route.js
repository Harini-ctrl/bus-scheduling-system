const mongoose = require("mongoose");

const CoordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    label: { type: String, default: "" }, // stop name e.g. "Connaught Place"
  },
  { _id: false } // no separate _id for each coordinate
);

const RouteSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    startLocation: {
      type: String,
      required: true,
    },
    endLocation: {
      type: String,
      required: true,
    },
    stops: {
      type: [String],
      default: [],
    },
    distance: {
      type: Number, // in km
    },
    coordinates: {
      type: [CoordinateSchema],
      default: [], // array of { lat, lng, label }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Route", RouteSchema);