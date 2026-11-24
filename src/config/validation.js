const { isValidIndividualChatId, sanitizePhoneNumber, toWhatsAppJid } = require("../whatsapp/contacts");

const DEFAULT_MESSAGE = "Stay healthy stay hydrated 💧";
const DEFAULT_INTERVAL_MINUTES = 60;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 10080; // 7 days

/**
 * Validates message text
 */
function validateMessage(message) {
  if (message === undefined || message === null) {
    return { valid: false, error: "Message text is required." };
  }
  const str = String(message).trim();
  if (str.length === 0) {
    return { valid: false, error: "Message cannot be empty." };
  }
  if (str.length > 2000) {
    return { valid: false, error: "Message must not exceed 2000 characters." };
  }
  return { valid: true, value: str };
}

/**
 * Validates sending interval
 */
function validateIntervalMinutes(intervalMinutes) {
  if (intervalMinutes === undefined || intervalMinutes === null || intervalMinutes === "") {
    return { valid: false, error: "Interval minutes is required." };
  }
  const num = Number(intervalMinutes);
  if (!Number.isInteger(num)) {
    return { valid: false, error: "Interval minutes must be an integer." };
  }
  if (num < MIN_INTERVAL_MINUTES || num > MAX_INTERVAL_MINUTES) {
    return {
      valid: false,
      error: `Interval must be between ${MIN_INTERVAL_MINUTES} and ${MAX_INTERVAL_MINUTES} minutes.`
    };
  }
  return { valid: true, value: num };
}

/**
 * Validates recipient phone number or WhatsApp ID
 */
function validateRecipient(recipientInput, recipientName) {
  if (recipientInput === undefined || recipientInput === null || String(recipientInput).trim() === "") {
    return { valid: false, error: "Recipient phone number is required." };
  }

  const rawInput = String(recipientInput).trim();

  if (!isValidIndividualChatId(rawInput)) {
    return {
      valid: false,
      error: "Please enter a valid international phone number (7 to 15 digits, e.g. 923001234567)."
    };
  }

  const cleanDigits = sanitizePhoneNumber(rawInput);
  const jid = toWhatsAppJid(cleanDigits);
  const cleanName = typeof recipientName === "string" && recipientName.trim() && recipientName !== "Selected contact"
    ? recipientName.trim()
    : `+${cleanDigits}`;

  return {
    valid: true,
    recipientId: jid,
    phoneNumber: cleanDigits,
    recipientName: cleanName
  };
}

/**
 * Validates a partial or full configuration update payload
 */
function validateConfigUpdate(payload = {}, currentConfig = {}) {
  const sanitized = {};

  // Check for phoneNumber, number, or recipientId
  const candidateNumber = payload.phoneNumber || payload.number || payload.recipientId;

  if (candidateNumber !== undefined && candidateNumber !== null && String(candidateNumber).trim() !== "") {
    const res = validateRecipient(candidateNumber, payload.recipientName || currentConfig.recipientName);
    if (!res.valid) return { valid: false, error: res.error };
    sanitized.recipientId = res.recipientId;
    sanitized.phoneNumber = res.phoneNumber;
    sanitized.recipientName = res.recipientName;
  } else if ("recipientName" in payload && currentConfig.recipientId) {
    sanitized.recipientName = String(payload.recipientName).trim() || currentConfig.recipientName;
  }

  // Validate message if provided
  if ("message" in payload) {
    const res = validateMessage(payload.message);
    if (!res.valid) return { valid: false, error: res.error };
    sanitized.message = res.value;
  }

  // Validate interval if provided
  if ("intervalMinutes" in payload) {
    const res = validateIntervalMinutes(payload.intervalMinutes);
    if (!res.valid) return { valid: false, error: res.error };
    sanitized.intervalMinutes = res.value;
  }

  // Validate enabled flag if provided
  if ("enabled" in payload) {
    sanitized.enabled = Boolean(payload.enabled);
  }

  return { valid: true, sanitized };
}

module.exports = {
  DEFAULT_MESSAGE,
  DEFAULT_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  validateMessage,
  validateIntervalMinutes,
  validateRecipient,
  validateConfigUpdate
};
