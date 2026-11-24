const { configService } = require("../config");
const { sendWhatsAppMessage, getSenderStatus } = require("../whatsapp/sender");
const { whatsappManager } = require("../whatsapp/client");
const logger = require("../utils/logger");

const TAG = "Scheduler";

class SchedulerEngine {
  constructor() {
    if (SchedulerEngine.instance) {
      return SchedulerEngine.instance;
    }
    SchedulerEngine.instance = this;

    this._timer = null;
    this._nextRunAt = null;
    this._isExecuting = false;

    // Attach to WhatsApp lifecycle
    whatsappManager.onReady(() => {
      const config = configService.getConfig();
      if (config.enabled && config.recipientId) {
        logger.info(TAG, "WhatsApp is ready and scheduling is enabled. Resuming scheduler...");
        this.startScheduler();
      }
    });

    whatsappManager.onDisconnected((reason) => {
      logger.warn(TAG, `WhatsApp disconnected: ${reason}. Pausing scheduler timer.`);
      this._pauseScheduler();
    });
  }

  /**
   * Current scheduler status snapshot
   */
  getStatus() {
    const sender = getSenderStatus();
    return {
      active: Boolean(this._timer),
      nextRunAt: this._nextRunAt,
      isExecuting: this._isExecuting,
      lastSentAt: sender.lastSentAt,
      lastError: sender.lastError
    };
  }

  /**
   * Internal pause (keeps config.enabled=true so it auto-resumes upon reconnection)
   */
  _pauseScheduler() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._nextRunAt = null;
      logger.info(TAG, "Scheduler timer paused due to temporary WhatsApp disconnection.");
    }
  }

  /**
   * Stops scheduling and marks enabled=false in persistent config
   */
  stopScheduler() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._nextRunAt = null;
    }
    configService.setEnabled(false);
    logger.info(TAG, "Scheduler stopped.");
    return {
      success: true,
      message: "Automation stopped."
    };
  }

  /**
   * Starts automatic scheduling
   *
   * Requirements:
   * 1. Send configured message automatically at selected interval.
   * 2. Default interval: 60 minutes.
   * 3. First automatic message sent only after the full selected interval.
   * 4. Do not send immediately when scheduler starts.
   * 5. Prevent duplicate timers.
   * 6. Do not send if WhatsApp is disconnected.
   * 7. Do not send if no contact is selected.
   */
  startScheduler() {
    // Prevent duplicate timers: always clear existing first
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._nextRunAt = null;
    }

    const config = configService.getConfig();

    // Verify WhatsApp is connected
    const status = whatsappManager.getStatus();
    if (!status.connected) {
      configService.setEnabled(true);
      logger.info(TAG, "Scheduler enabled. Waiting for WhatsApp connection before starting timer.");
      return {
        success: true,
        message: "Automation enabled. Waiting for WhatsApp connection.",
        active: false
      };
    }

    // Verify recipient number is entered
    const targetRecipient = config.recipientId || (config.phoneNumber ? `${config.phoneNumber}@c.us` : "");
    if (!targetRecipient) {
      logger.error(TAG, "Cannot start scheduler: No recipient phone number configured.");
      throw new Error("Enter a recipient phone number first before starting automation.");
    }

    const intervalMinutes = Math.max(1, Number(config.intervalMinutes) || 60);
    const intervalMs = intervalMinutes * 60 * 1000;

    // First automatic message sent only after the full interval (not immediately)
    this._nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    configService.setEnabled(true);

    this._timer = setInterval(() => {
      this.executeScheduledMessage().catch((err) => {
        logger.error(TAG, "Scheduled message execution error:", err.message);
      });
      this._nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    }, intervalMs);

    logger.info(TAG, `Scheduler started: repeating every ${intervalMinutes} minute(s). Next message scheduled at ${this._nextRunAt}`);

    return {
      success: true,
      message: `Automation started: repeating every ${intervalMinutes} minutes.`,
      active: true,
      nextRunAt: this._nextRunAt
    };
  }

  /**
   * Restarts the scheduler timer (useful when interval or recipient changes)
   */
  restartScheduler() {
    logger.info(TAG, "Restarting scheduler with updated settings...");
    this.stopScheduler();
    return this.startScheduler();
  }

  /**
   * Executes scheduled dispatch
   */
  async executeScheduledMessage() {
    // Prevent overlapping message sends
    if (this._isExecuting) {
      logger.warn(TAG, "Previous scheduled message execution is still running. Skipping this cycle.");
      return;
    }

    const status = whatsappManager.getStatus();
    if (!status.connected) {
      logger.warn(TAG, "WhatsApp disconnected. Skipping scheduled message.");
      return;
    }

    const config = configService.getConfig();
    if (!config.enabled) {
      logger.info(TAG, "Automation is disabled in config. Skipping scheduled message.");
      this.stopScheduler();
      return;
    }

    if (!config.recipientId && !config.phoneNumber) {
      logger.warn(TAG, "No recipient phone number configured. Skipping scheduled message.");
      return;
    }

    this._isExecuting = true;
    try {
      const client = whatsappManager.getClient();
      await sendWhatsAppMessage(client);
      logger.info(TAG, `Message sent: Scheduled reminder delivered to ${config.recipientName}`);
    } catch (err) {
      logger.error(TAG, `Message failed: ${err.message}`);
    } finally {
      this._isExecuting = false;
    }
  }
}

// Export singleton
const schedulerEngine = new SchedulerEngine();

module.exports = {
  schedulerEngine,
  SchedulerEngine,
  startScheduler: () => schedulerEngine.startScheduler(),
  stopScheduler: () => schedulerEngine.stopScheduler(),
  restartScheduler: () => schedulerEngine.restartScheduler(),
  executeScheduledMessage: () => schedulerEngine.executeScheduledMessage()
};
