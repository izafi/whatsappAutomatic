const fs = require("fs");
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

      // Auto-clean any stale DevToolsActivePort from previous interrupted runs to prevent Puppeteer hanging
      try {
        const stalePortFile = path.join(authDataPath, "session", "DevToolsActivePort");
        if (fs.existsSync(stalePortFile)) {
          fs.unlinkSync(stalePortFile);
          logger.info(TAG, "Cleaned up stale DevToolsActivePort lock file.");
        }
      } catch (cleanErr) {
        logger.warn(TAG, "Note on stale port cleanup:", cleanErr.message);
      }

      // Headless flag: defaults to true unless explicitly disabled with HEADLESS=false
      const isHeadless = process.env.HEADLESS !== "false";

      const puppeteerOptions = {
        headless: isHeadless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu"
        ]
      };

      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      const webVersionCacheConfig = process.env.WEB_VERSION_CACHE_TYPE === "remote"
        ? {
            type: "remote",
            remotePath: process.env.WEB_VERSION_REMOTE_PATH || "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
            strict: false
          }
        : {
            type: "none"
          };

      const clientOptions = {
        authStrategy: new LocalAuth({
          dataPath: authDataPath
        }),
        authTimeoutMs: Number(process.env.AUTH_TIMEOUT_MS) || 120000,
        qrTimeoutMs: Number(process.env.QR_TIMEOUT_MS) || 60000,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        webVersionCache: webVersionCacheConfig,
        puppeteer: puppeteerOptions
      };

      this._client = new Client(clientOptions);

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

  /**
   * Request an 8-character pairing code for a phone number
   */
  async requestPairingCode(phoneNumber) {
    if (!this._client) {
      logger.info(TAG, "Client not active, initializing before requesting code...");
      await this.initialize();
    }
    const cleanNumber = String(phoneNumber).replace(/[^0-9]/g, "");
    if (!cleanNumber || cleanNumber.length < 8) {
      throw new Error("Please enter a valid phone number with country code (e.g. 923414618574).");
    }
    logger.info(TAG, `Requesting pairing code for phone: +${cleanNumber}`);
    const code = await this._client.requestPairingCode(cleanNumber);
    logger.info(TAG, `Received pairing code: ${code}`);
    return code;
  }

  /**
   * Manually trigger re-initialization (e.g. from dashboard retry button)
   */
  async reconnect() {
    logger.info(TAG, "Reconnecting client session...");
    await this.destroy();
    return this.initialize();
  }
}

// Export singleton instance
const whatsappManager = new WhatsAppConnectionManager();

module.exports = {
  whatsappManager,
  ConnectionState
};
