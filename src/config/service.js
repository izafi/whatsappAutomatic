const { readConfig, saveConfig, defaultConfig } = require("./store");
const { validateConfigUpdate } = require("./validation");
const logger = require("../utils/logger");

const TAG = "Config:Service";

class ConfigurationService {
  constructor() {
    this._config = readConfig();
    logger.info(TAG, "Configuration loaded successfully:", {
      recipientId: this._config.recipientId ? `${this._config.recipientId} (${this._config.recipientName})` : "None",
      intervalMinutes: this._config.intervalMinutes,
      enabled: this._config.enabled
    });
  }

  /**
   * Returns a copy of the current configuration
   * @returns {{ recipientId: string, recipientName: string, message: string, intervalMinutes: number, enabled: boolean }}
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * Safely updates configuration with validation
   * Only updates provided valid fields; preserves all existing fields
   * @param {object} updates
   * @returns {object} Updated configuration
   */
  updateConfig(updates = {}) {
    const { valid, error, sanitized } = validateConfigUpdate(updates, this._config);
    if (!valid) {
      throw new Error(error);
    }

    // Merge validated changes over current config
    this._config = {
      ...this._config,
      ...sanitized
    };

    saveConfig(this._config);
    logger.info(TAG, "Configuration updated successfully.");
    return { ...this._config };
  }

  /**
   * Sets the automation enabled flag
   * @param {boolean} enabled
   * @returns {object} Updated configuration
   */
  setEnabled(enabled) {
    this._config.enabled = Boolean(enabled);
    saveConfig(this._config);
    return { ...this._config };
  }

  /**
   * Resets configuration to defaults while preserving existing recipient if requested
   */
  resetToDefaults(preserveRecipient = true) {
    const existingRecipient = {
      recipientId: this._config.recipientId,
      recipientName: this._config.recipientName
    };

    this._config = {
      ...defaultConfig,
      ...(preserveRecipient ? existingRecipient : {})
    };

    saveConfig(this._config);
    return { ...this._config };
  }
}

// Export singleton instance
const configService = new ConfigurationService();

module.exports = {
  configService,
  ConfigurationService
};
