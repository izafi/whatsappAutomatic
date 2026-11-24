const express = require("express");
const { handleStart, handleStop, handleSendNow } = require("../controllers/scheduler.controller");
const { requireDashboardToken } = require("../middleware/auth");

const router = express.Router();

router.post("/api/start", requireDashboardToken, handleStart);
router.post("/api/stop", requireDashboardToken, handleStop);
router.post("/api/send-now", requireDashboardToken, handleSendNow);

module.exports = router;
