 const Route = require("../models/Route");

// GET ALL ROUTES
exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SINGLE ROUTE
exports.getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD ROUTE + DETECT OVERLAPS
exports.addRoute = async (req, res) => {
  try {
    const { routeName, startLocation, endLocation, stops, distance, coordinates } = req.body;

    const existingRoutes = await Route.find();

    // Detect stop overlaps with existing routes
    const overlaps = [];
    existingRoutes.forEach((route) => {
      const commonStops = route.stops.filter((stop) => stops.includes(stop));
      if (commonStops.length > 0) {
        overlaps.push({
          routeId: route._id,
          routeName: route.routeName,
          overlappingStops: commonStops,
        });
      }
    });

    const newRoute = new Route({
      routeName,
      startLocation,
      endLocation,
      stops,
      distance,
      coordinates: coordinates || [],
    });

    await newRoute.save();

    res.status(201).json({
      message: "Route created successfully",
      route: newRoute,
      overlaps, // empty array if no overlaps
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ROUTE
exports.updateRoute = async (req, res) => {
  try {
    const { routeName, startLocation, endLocation, stops, distance, coordinates } = req.body;

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { routeName, startLocation, endLocation, stops, distance, coordinates },
      { new: true, runValidators: true }
    );

    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE ROUTE
exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json({ message: "Route deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};