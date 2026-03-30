 const express = require("express");
const router = express.Router();
const { getBuses, getBusById, addBus, updateBus, deleteBus } = require("../controllers/busController");

router.get("/",      getBuses);
router.get("/:id",   getBusById);
router.post("/",     addBus);
router.put("/:id",   updateBus);
router.delete("/:id",deleteBus);

module.exports = router;