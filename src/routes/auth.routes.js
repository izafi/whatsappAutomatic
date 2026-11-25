const express = require("express");
const { handleLogout, handleReconnect, handlePairingCode } = require("../controllers/auth.controller");
const { requireDashboardToken } = require("../middleware/auth");

const router = express.Router();

router.post("/api/logout", requireDashboardToken, handleLogout);
router.post("/api/reconnect", requireDashboardToken, handleReconnect);
router.post("/api/pairing-code", requireDashboardToken, handlePairingCode);

module.exports = router;
