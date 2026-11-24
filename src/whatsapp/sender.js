const { isValidIndividualChatId, toWhatsAppJid, sanitizePhoneNumber } = require("./contacts");
const { configService } = require("../config");
const logger = require("../utils/logger");

const TAG = "WhatsApp:Sender";

let isSending = false;
let lastSentAt = null;
let lastError = null;

/**
 * Sends a WhatsApp message to the specified phone number or contact
 *
 * @param {import("whatsapp-web.js").Client} client
 * @param {object} [customOptions]
 * @returns {Promise<{ success: boolean, sentAt: string, recipientId: string, recipientName: string }>}
 */
async function sendWhatsAppMessage(client, customOptions = {}) {
  // Prevent duplicate simultaneous sending requests
  if (isSending) {
    const errorMsg = "A message sending operation is currently in progress. Please wait.";
    lastError = errorMsg;
    logger.warn(TAG, errorMsg);
    throw new Error(errorMsg);
  }

  // Verify that WhatsApp is connected before sending
  if (!client) {
    const errorMsg = "WhatsApp is not connected. Please connect WhatsApp first.";
    lastError = errorMsg;
    logger.error(TAG, errorMsg);
    throw new Error(errorMsg);
  }

  const config = configService.getConfig();
  const rawRecipient = customOptions.recipientId || customOptions.phoneNumber || config.recipientId || config.phoneNumber;
  const message = customOptions.message !== undefined ? customOptions.message : config.message;

  // Verify that a recipient number or ID has been entered
  if (!rawRecipient || !String(rawRecipient).trim()) {
    const errorMsg = "No recipient phone number specified. Please enter a recipient number first.";
    lastError = errorMsg;
    logger.error(TAG, errorMsg);
    throw new Error(errorMsg);
  }

  // Validate format and ensure it's not a group chat
  if (!isValidIndividualChatId(rawRecipient)) {
    const errorMsg = `Recipient '${rawRecipient}' is invalid. Please enter a valid international phone number (7 to 15 digits).`;
    lastError = errorMsg;
    logger.error(TAG, errorMsg);
    throw new Error(errorMsg);
  }

  // Verify that the message is not empty
  if (typeof message !== "string" || !message.trim()) {
    const errorMsg = "Message cannot be empty.";
    lastError = errorMsg;
    logger.error(TAG, errorMsg);
    throw new Error(errorMsg);
  }

  const targetJid = toWhatsAppJid(rawRecipient);
  const cleanDigits = sanitizePhoneNumber(rawRecipient);
  const recipientName = customOptions.recipientName || config.recipientName || `+${cleanDigits}`;

  isSending = true;

  try {
    logger.info(TAG, `Sending message to +${cleanDigits} (${targetJid})...`);

    const result = await client.sendMessage(targetJid, message.trim());
    if (!result) {
      throw new Error("WhatsApp did not confirm receipt of the sent message.");
    }

    lastSentAt = new Date().toISOString();
    lastError = null;

    logger.info(TAG, `Message sent successfully to +${cleanDigits} at ${lastSentAt}`);

    return {
      success: true,
      sentAt: lastSentAt,
      recipientId: targetJid,
      phoneNumber: cleanDigits,
      recipientName
    };
  } catch (err) {
    lastError = err.message || "Failed to deliver WhatsApp message.";
    logger.error(TAG, `Message failed to +${cleanDigits}:`, lastError);
    throw err;
  } finally {
    isSending = false;
  }
}

/**
 * Returns current sending status and audit timestamps
 */
function getSenderStatus() {
  return {
    isSending,
    lastSentAt,
    lastError
  };
}

module.exports = {
  sendWhatsAppMessage,
  getSenderStatus
};
