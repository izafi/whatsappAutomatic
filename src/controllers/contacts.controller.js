const { whatsappManager, getIndividualChats } = require("../whatsapp");

/**
 * GET /api/chats
 * Fetches synced individual WhatsApp chats
 */
async function getChats(_req, res, next) {
  try {
    const wsStatus = whatsappManager.getStatus();
    if (!wsStatus.connected) {
      return res.status(400).json({
        error: "Connect WhatsApp first before loading contacts."
      });
    }

    const client = whatsappManager.getClient();
    const chats = await getIndividualChats(client);

    res.json({
      success: true,
      chats
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getChats
};
