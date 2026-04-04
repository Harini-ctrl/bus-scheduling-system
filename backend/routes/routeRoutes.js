const express = require("express");
const router  = express.Router();
const { getRoutes, getRouteById, addRoute, updateRoute, deleteRoute } = require("../controllers/routeController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/",       auth, getRoutes);
router.get("/:id",    auth, getRouteById);
router.post("/",      auth, role("admin", "scheduler"), addRoute);
router.put("/:id",    auth, role("admin", "scheduler"), updateRoute);
router.delete("/:id", auth, role("admin"), deleteRoute);

module.exports = router;