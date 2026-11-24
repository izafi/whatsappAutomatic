const QRCode = require("qrcode");
const { ConnectionState } = require("./constants");
const logger = require("../utils/logger");

/**
 * Registers all WhatsApp Web client event listeners
 *
 * @param {import("whatsapp-web.js").Client} client
 * @param {object} stateManager - Internal state holder for connection status
 * @param {Function} [onReadyCallback] - Optional callback triggered when client is ready
 * @param {Function} [onDisconnectedCallback] - Optional callback triggered when client disconnects
 */
function registerClientEvents(client, stateManager, onReadyCallback, onDisconnectedCallback) {
  const TAG = "WhatsApp:Events";

  // Loading screen (initial web app asset loading & sync)
  client.on("loading_screen", (percent, message) => {
    logger.info(TAG, `Loading WhatsApp Web: ${percent}% - ${message || "Please wait"}`);
    if (stateManager.state !== ConnectionState.CONNECTED) {
      stateManager.state = ConnectionState.INITIALIZING;
      stateManager.loadingPercent = percent;
      stateManager.loadingMessage = message;
    }
  });

  // QR Code received for device pairing
  client.on("qr", async (qr) => {
    logger.info(TAG, "QR code received. Scan using WhatsApp Linked Devices.");

    // Print QR code in terminal for headless VPS/SSH sessions
    try {
      const qrcodeTerminal = require("qrcode-terminal");
      qrcodeTerminal.generate(qr, { small: true });
    } catch {
      // Optional fallback
    }

    try {
      const dataUrl = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 300
      });
      stateManager.qrDataUrl = dataUrl;
      stateManager.rawQr = qr;
      stateManager.state = ConnectionState.QR_REQUIRED;
      stateManager.lastError = null;
    } catch (err) {
      stateManager.lastError = `Failed to generate QR code: ${err.message}`;
      logger.error(TAG, stateManager.lastError);
    }
  });

  // Authentication succeeded
  client.on("authenticated", () => {
    logger.info(TAG, "Session authenticated successfully.");
    stateManager.qrDataUrl = null;
    stateManager.rawQr = null;
    stateManager.lastError = null;
  });

  // Client is fully initialized and synced
  client.on("ready", () => {
    logger.info(TAG, "WhatsApp client is READY and connected.");
    stateManager.state = ConnectionState.CONNECTED;
    stateManager.qrDataUrl = null;
    stateManager.rawQr = null;
    stateManager.lastError = null;
    stateManager.lastConnectedAt = new Date().toISOString();

    if (typeof onReadyCallback === "function") {
      try {
        onReadyCallback();
      } catch (err) {
        logger.error(TAG, "Error in onReady callback:", err.message);
      }
    }
  });

  // Authentication failure (e.g. invalid session or logged out from phone)
  client.on("auth_failure", (message) => {
    stateManager.state = ConnectionState.AUTH_FAILED;
    stateManager.lastError = `Authentication failed: ${message || "Invalid credentials"}`;
    logger.error(TAG, stateManager.lastError);
    if (typeof onDisconnectedCallback === "function") {
      try {
        onDisconnectedCallback(stateManager.lastError);
      } catch (err) {
        logger.error(TAG, "Error in onDisconnected callback:", err.message);
      }
    }
  });

  // Disconnected from WhatsApp Web
  client.on("disconnected", (reason) => {
    stateManager.state = ConnectionState.DISCONNECTED;
    stateManager.lastError = `WhatsApp disconnected: ${reason || "Connection dropped"}`;
    logger.warn(TAG, stateManager.lastError);
    if (typeof onDisconnectedCallback === "function") {
      try {
        onDisconnectedCallback(reason || "Connection dropped");
      } catch (err) {
        logger.error(TAG, "Error in onDisconnected callback:", err.message);
      }
    }
  });

  // WhatsApp connection state changed (e.g. OPENING, PAIRING, TIMEOUT)
  client.on("change_state", (state) => {
    logger.info(TAG, `WhatsApp state transition: ${state}`);
    if (state === "PAIRING") {
      stateManager.state = ConnectionState.QR_REQUIRED;
    } else if (state === "OPENING") {
      stateManager.state = ConnectionState.RECONNECTING;
    } else if (state === "UNPAIRED") {
      stateManager.state = ConnectionState.QR_REQUIRED;
    } else if (state === "CONNECTED") {
      stateManager.state = ConnectionState.CONNECTED;
    }
  });
}

module.exports = {
  registerClientEvents
};
