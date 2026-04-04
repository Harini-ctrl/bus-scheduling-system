 const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
require("dotenv").config();

const authRoutes     = require("./routes/authRoutes");
const busRoutes      = require("./routes/busRoutes");
const driverRoutes   = require("./routes/driverRoutes");
const routeRoutes    = require("./routes/routeRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://bus-scheduling-system.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth",      authRoutes);
app.use("/api/buses",     busRoutes);
app.use("/api/drivers",   driverRoutes);
app.use("/api/routes",    routeRoutes);
app.use("/api/schedules", scheduleRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Bus Scheduling API running", status: "ok" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// Connect DB then start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });