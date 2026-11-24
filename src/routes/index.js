const express = require("express");
const statusRoutes = require("./status.routes");
const contactsRoutes = require("./contacts.routes");
const configRoutes = require("./config.routes");
const schedulerRoutes = require("./scheduler.routes");
const authRoutes = require("./auth.routes");

const router = express.Router();

router.use(statusRoutes);
router.use(contactsRoutes);
router.use(configRoutes);
router.use(schedulerRoutes);
router.use(authRoutes);

module.exports = router;
