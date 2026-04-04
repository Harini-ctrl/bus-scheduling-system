const express = require("express");
const router  = express.Router();
const { getBuses, getBusById, addBus, updateBus, deleteBus } = require("../controllers/busController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

router.get("/",       auth, getBuses);
router.get("/:id",    auth, getBusById);
router.post("/",      auth, role("admin", "scheduler"), addBus);
router.put("/:id",    auth, role("admin", "scheduler"), updateBus);
router.delete("/:id", auth, role("admin"), deleteBus);

module.exports = router;