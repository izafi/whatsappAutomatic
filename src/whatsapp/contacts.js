const logger = require("../utils/logger");

const TAG = "WhatsApp:Contacts";

/**
 * Sanitizes an entered phone number or WhatsApp JID to clean digits
 * @param {string} input
 * @returns {string} Digits only
 */
function sanitizePhoneNumber(input) {
  if (typeof input !== "string" && typeof input !== "number") return "";
  const str = String(input).trim();
  // If it ends with @c.us, take the part before @
  const cleanPart = str.endsWith("@c.us") ? str.split("@")[0] : str;
  return cleanPart.replace(/[^0-9]/g, "");
}

/**
 * Formats a phone number or ID into a standard WhatsApp individual contact JID
 * e.g. "923001234567" -> "923001234567@c.us"
 * @param {string} input
 * @returns {string} WhatsApp individual JID
 */
function toWhatsAppJid(input) {
  const digits = sanitizePhoneNumber(input);
  return digits ? `${digits}@c.us` : "";
}

/**
 * Validates whether a string represents a valid WhatsApp individual recipient
 * Accepts:
 * - Direct international phone numbers (e.g. "923001234567", "+92 300 1234567")
 * - WhatsApp individual JIDs (e.g. "923001234567@c.us")
 * Rejects group chats (@g.us), broadcast lists, and newsletters.
 *
 * @param {string} input
 * @returns {boolean}
 */
function isValidIndividualChatId(input) {
  if (typeof input !== "string" && typeof input !== "number") return false;
  const trimmed = String(input).trim();

  // Reject group chats, broadcast lists, and newsletters
  if (trimmed.includes("@g.us") || trimmed.includes("@broadcast") || trimmed.includes("@newsletter")) {
    return false;
  }

  // Extract clean digits
  const digits = sanitizePhoneNumber(trimmed);

  // International phone numbers under E.164 are between 7 and 15 digits
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Optional helper to fetch synced individual chats from WhatsApp Web
 */
async function getIndividualChats(client) {
  if (!client) {
    throw new Error("WhatsApp client is not available. Please connect WhatsApp first.");
  }

  logger.info(TAG, "Fetching individual chats from WhatsApp Web...");

  let chats = [];
  try {
    chats = await client.getChats();
  } catch (err) {
    logger.error(TAG, "Failed to call client.getChats():", err.message);
    throw new Error(`Unable to fetch chats from WhatsApp: ${err.message}`);
  }

  if (!Array.isArray(chats)) {
    return [];
  }

  const individualChats = chats
    .filter((chat) => {
      if (!chat || chat.isGroup || chat.isReadOnly) return false;
      const id = chat.id?._serialized;
      return typeof id === "string" && isValidIndividualChatId(id);
    })
    .map((chat) => {
      const id = chat.id._serialized;
      const name =
        (typeof chat.name === "string" && chat.name.trim()) ||
        (typeof chat.pushname === "string" && chat.pushname.trim()) ||
        (typeof chat.formattedTitle === "string" && chat.formattedTitle.trim()) ||
        (chat.id?.user ? `+${chat.id.user}` : id);

      return {
        id,
        name: name.trim()
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return individualChats;
}

module.exports = {
  sanitizePhoneNumber,
  toWhatsAppJid,
  isValidIndividualChatId,
  getIndividualChats
};
