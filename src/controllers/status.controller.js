const { whatsappManager } = require("../whatsapp");
const { schedulerEngine } = require("../scheduler");
const { configService } = require("../config");

/**
 * Unauthenticated health check endpoint
 * GET /health
 */
function getHealth(_req, res) {
  const ws = whatsappManager.getStatus();
  res.json({
    ok: true,
    connected: ws.connected,
    state: ws.state
  });
}

/**
 * Aggregate system status
 * GET /api/status
 */
function getStatus(_req, res) {
  const wsStatus = whatsappManager.getStatus();
  const schedStatus = schedulerEngine.getStatus();
  const config = configService.getConfig();

  res.json({
    connected: wsStatus.connected,
    state: wsStatus.state,
    qrAvailable: wsStatus.qrAvailable,
    config,
    lastSentAt: schedStatus.lastSentAt,
    lastError: wsStatus.lastError || schedStatus.lastError,
    sending: schedStatus.isExecuting,
    schedulerActive: schedStatus.active,
    nextRunAt: schedStatus.nextRunAt
  });
}

/**
 * Retrieve QR Data URL for device pairing
 * GET /api/qr
 */
function getQr(_req, res) {
  const qr = whatsappManager.getQRCode();
  if (!qr) {
    return res.status(404).json({
      error: "QR code is not available yet."
    });
  }
  res.json({ qr });
}

module.exports = {
  getHealth,
  getStatus,
  getQr
};
