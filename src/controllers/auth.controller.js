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

module.exports = {
  handleLogout
};
