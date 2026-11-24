const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { ConnectionState } = require("./constants");
const { registerClientEvents } = require("./events");
const logger = require("../utils/logger");

const TAG = "WhatsApp:Client";

class WhatsAppConnectionManager {
  constructor() {
    if (WhatsAppConnectionManager.instance) {
      return WhatsAppConnectionManager.instance;
    }

    WhatsAppConnectionManager.instance = this;

    // Internal state
    this._state = {
      state: ConnectionState.DISCONNECTED,
      qrDataUrl: null,
      rawQr: null,
      lastError: null,
      lastConnectedAt: null,
      loadingPercent: 0,
      loadingMessage: ""
    };

    this._client = null;
    this._isInitializing = false;
    this._onReadyCallbacks = new Set();
    this._onDisconnectedCallbacks = new Set();
  }

  /**
   * Return the current connection state snapshot
   */
  getStatus() {
    return {
      state: this._state.state,
      connected: this._state.state === ConnectionState.CONNECTED,
      qrAvailable: Boolean(this._state.qrDataUrl),
      lastError: this._state.lastError,
      lastConnectedAt: this._state.lastConnectedAt,
      loading: {
        percent: this._state.loadingPercent,
        message: this._state.loadingMessage
      }
    };
  }

  /**
   * Return current QR Data URL if available
   */
  getQRCode() {
    return this._state.qrDataUrl;
  }

  /**
   * Register a callback triggered when client reaches READY state
   */
  onReady(callback) {
    if (typeof callback === "function") {
      this._onReadyCallbacks.add(callback);
      // If already connected, trigger immediately
      if (this._state.state === ConnectionState.CONNECTED) {
        callback();
      }
    }
  }

  /**
   * Register a callback triggered when client disconnects
   */
  onDisconnected(callback) {
    if (typeof callback === "function") {
      this._onDisconnectedCallbacks.add(callback);
    }
  }

  /**
   * Initialize WhatsApp Web client singleton
   * Enforces:
   * 1. No multiple instances
   * 2. LocalAuth persistence targeting project .wwebjs_auth folder
   * 3. Configurable headless mode
   */
  async initialize() {
    if (this._client && this._state.state === ConnectionState.CONNECTED) {
      logger.info(TAG, "WhatsApp client already connected.");
      return this._client;
    }

    if (this._isInitializing) {
      logger.info(TAG, "WhatsApp client initialization already in progress.");
      return this._client;
    }

    this._isInitializing = true;
    this._state.state = ConnectionState.INITIALIZING;
    this._state.lastError = null;

    try {
      logger.info(TAG, "Setting up WhatsApp client with LocalAuth...");

      // Ensure persistence directory points to .wwebjs_auth (or custom volume on Railway)
      const authDataPath = process.env.WWEBJS_AUTH_PATH || path.resolve(__dirname, "../../.wwebjs_auth");

      // Headless flag: defaults to false if not specified, true if HEADLESS=true
      const isHeadless = process.env.HEADLESS === "true";

      const puppeteerOptions = {
        headless: isHeadless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote"
        ]
      };

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      this._client = new Client({
        authStrategy: new LocalAuth({
          dataPath: authDataPath
        }),
        authTimeoutMs: 120000,
        webVersionCache: {
          type: "none"
        },
        puppeteer: puppeteerOptions
      });

      // Register all lifecycle events
      registerClientEvents(
        this._client,
        this._state,
        () => {
          for (const cb of this._onReadyCallbacks) {
            try {
              cb();
            } catch (err) {
              logger.error(TAG, "Error in onReady subscriber:", err.message);
            }
          }
        },
        (reason) => {
          for (const cb of this._onDisconnectedCallbacks) {
            try {
              cb(reason);
            } catch (err) {
              logger.error(TAG, "Error in onDisconnected subscriber:", err.message);
            }
          }
        }
      );

      logger.info(TAG, "Launching WhatsApp Web browser instance...");
      await this._client.initialize();
      logger.info(TAG, "Client initialization initiated.");

      return this._client;
    } catch (error) {
      this._state.state = ConnectionState.DISCONNECTED;
      this._state.lastError = `Initialization failed: ${error.message}`;
      logger.error(TAG, this._state.lastError);
      throw error;
    } finally {
      this._isInitializing = false;
    }
  }

  /**
   * Return underlying whatsapp-web.js client instance
   */
  getClient() {
    return this._client;
  }

  /**
   * Log out of current WhatsApp Web session and re-initialize for a new QR scan
   */
  async logout() {
    logger.info(TAG, "Logging out from WhatsApp session...");
    if (this._client) {
      try {
        await this._client.logout();
        logger.info(TAG, "WhatsApp client logged out successfully.");
      } catch (err) {
        logger.warn(TAG, "Error during client.logout(), destroying client instead:", err.message);
        await this.destroy();
      }
    }
    this._state.state = ConnectionState.DISCONNECTED;
    this._state.qrDataUrl = null;
    this._state.rawQr = null;

    // Trigger re-initialization in background to generate fresh QR code
    this.initialize().catch((err) => {
      logger.error(TAG, "Error re-initializing client after logout:", err.message);
    });

    return { success: true, message: "Logged out from WhatsApp. Re-initializing for a new session..." };
  }

  /**
   * Graceful disconnect and browser cleanup
   */
  async destroy() {
    logger.info(TAG, "Destroying WhatsApp client session...");
    if (this._client) {
      try {
        await this._client.destroy();
      } catch (err) {
        logger.error(TAG, "Error during client destroy:", err.message);
      }
      this._client = null;
    }
    this._state.state = ConnectionState.DISCONNECTED;
    this._state.qrDataUrl = null;
    this._state.rawQr = null;
    this._isInitializing = false;
    logger.info(TAG, "WhatsApp client destroyed.");
  }
}

// Export singleton instance
const whatsappManager = new WhatsAppConnectionManager();

module.exports = {
  whatsappManager,
  ConnectionState
};
