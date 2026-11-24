/**
 * WhatsApp Connection States
 */
const ConnectionState = Object.freeze({
  INITIALIZING: "Initializing",
  QR_REQUIRED: "QR Required",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  AUTH_FAILED: "Authentication Failed",
  RECONNECTING: "Reconnecting"
});

module.exports = {
  ConnectionState
};
