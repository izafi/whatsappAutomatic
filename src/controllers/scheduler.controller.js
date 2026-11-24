const { schedulerEngine, startScheduler, stopScheduler } = require("../scheduler");
const { whatsappManager, sendWhatsAppMessage } = require("../whatsapp");

/**
 * POST /api/start
 * Starts the automatic message scheduler
 */
function handleStart(_req, res, next) {
  try {
    const result = startScheduler();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/stop
 * Stops the message scheduler
 */
function handleStop(_req, res) {
  const result = stopScheduler();
  res.json(result);
}

/**
 * POST /api/send-now
 * Sends test or on-demand message immediately
 */
async function handleSendNow(req, res, next) {
  try {
    const client = whatsappManager.getClient();
    const result = await sendWhatsAppMessage(client, req.body || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleStart,
  handleStop,
  handleSendNow
};
