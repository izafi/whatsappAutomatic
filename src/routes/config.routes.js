const express = require("express");
const { getConfig, updateConfig } = require("../controllers/config.controller");
const { requireDashboardToken } = require("../middleware/auth");

const router = express.Router();

router.get("/api/config", requireDashboardToken, getConfig);
router.put("/api/config", requireDashboardToken, updateConfig);

module.exports = router;
