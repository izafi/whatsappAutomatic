const { whatsappManager } = require("../whatsapp");
const { stopScheduler } = require("../scheduler");
const logger = require("../utils/logger");

const TAG = "Auth:Controller";

/**
 * POST /api/logout
 * Logs out of the current WhatsApp Web session and unlinks device
 */
async function handleLogout(_req, res, next) {
  try {
    logger.info(TAG, "User requested WhatsApp logout.");

    // Stop active scheduler first
    stopScheduler();

    // Log out client and restart for new QR code
    const result = await whatsappManager.logout();

    res.json({
      success: true,
      message: result.message || "Logged out from WhatsApp successfully."
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reconnect
 * Triggers WhatsApp client re-initialization
 */
async function handleReconnect(_req, res, next) {
  try {
    logger.info(TAG, "Reconnection requested via API.");
    whatsappManager.reconnect().catch((err) => {
      logger.error(TAG, "Reconnection failed in background:", err.message);
    });

    res.json({
      success: true,
      message: "WhatsApp reconnection started. Refreshing QR..."
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pairing-code
 * Requests an 8-digit WhatsApp pairing code for phone number
 */
async function handlePairingCode(req, res, next) {
  try {
    const { phoneNumber } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: "Please enter your phone number with country code." });
    }
    const code = await whatsappManager.requestPairingCode(phoneNumber);
    res.json({
      success: true,
      code
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleLogout,
  handleReconnect,
  handlePairingCode
};
