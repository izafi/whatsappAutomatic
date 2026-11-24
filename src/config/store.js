const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const TAG = "Config:Store";
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const defaultConfig = {
  phoneNumber: "",
  recipientId: "",
  recipientName: "",
  message: process.env.MESSAGE || "Stay healthy stay hydrated 💧",
  intervalMinutes: Math.max(1, Number(process.env.INTERVAL_MINUTES || 60)),
  enabled: false
};

/**
 * Safely reads the persistent configuration
 * Preserves selected contact / phone number across server restarts
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      saveConfig(defaultConfig);
      return { ...defaultConfig };
    }

    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);

    const recipientId = typeof parsed.recipientId === "string" ? parsed.recipientId.trim() : "";
    const phoneNumber = typeof parsed.phoneNumber === "string" && parsed.phoneNumber.trim()
      ? parsed.phoneNumber.trim()
      : (recipientId ? recipientId.replace(/[^0-9]/g, "") : "");

    return {
      ...defaultConfig,
      ...parsed,
      phoneNumber,
      recipientId: recipientId || (phoneNumber ? `${phoneNumber}@c.us` : ""),
      recipientName: typeof parsed.recipientName === "string" ? parsed.recipientName.trim() : (phoneNumber ? `+${phoneNumber}` : ""),
      message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : defaultConfig.message,
      intervalMinutes: Math.max(1, Number(parsed.intervalMinutes) || defaultConfig.intervalMinutes),
      enabled: Boolean(parsed.enabled)
    };
  } catch (err) {
    logger.error(TAG, "Failed to read config, returning default:", err.message);
    return { ...defaultConfig };
  }
}

/**
 * Persists the configuration to data/config.json
 */
function saveConfig(configData) {
  try {
    const serialized = JSON.stringify(configData, null, 2);
    fs.writeFileSync(CONFIG_FILE, serialized, "utf8");
    logger.info(TAG, "Configuration saved successfully.");
    return true;
  } catch (err) {
    logger.error(TAG, "Failed to save configuration:", err.message);
    throw new Error(`Unable to save config: ${err.message}`);
  }
}

module.exports = {
  readConfig,
  saveConfig,
  defaultConfig
};
