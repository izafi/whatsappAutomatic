const express = require("express");
const { handleLogout } = require("../controllers/auth.controller");
const { requireDashboardToken } = require("../middleware/auth");

const router = express.Router();

router.post("/api/logout", requireDashboardToken, handleLogout);

module.exports = router;
