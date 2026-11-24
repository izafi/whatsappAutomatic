const express = require("express");
const { getChats } = require("../controllers/contacts.controller");
const { requireDashboardToken } = require("../middleware/auth");

const router = express.Router();

router.get("/api/chats", requireDashboardToken, getChats);

module.exports = router;
