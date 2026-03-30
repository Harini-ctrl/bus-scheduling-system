 const express = require("express");
const router = express.Router();
const { getRoutes, getRouteById, addRoute, updateRoute, deleteRoute } = require("../controllers/routeController");

router.get("/",      getRoutes);
router.get("/:id",   getRouteById);
router.post("/",     addRoute);
router.put("/:id",   updateRoute);
router.delete("/:id",deleteRoute);

module.exports = router;