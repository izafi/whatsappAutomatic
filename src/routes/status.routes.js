const express = require("express");
const { getHealth, getStatus, getQr } = require("../controllers/status.controller");
const { requireDashboardToken } = require("../middleware/auth");

const router = express.Router();

// Public health check
router.get("/health", getHealth);

// Authenticated status endpoints
router.get("/api/status", requireDashboardToken, getStatus);
router.get("/api/qr", requireDashboardToken, getQr);

module.exports = router;
