const crypto = require("crypto");
const logger = require("../utils/logger");

const TAG = "Security:Auth";

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware ensuring requests to /api are authenticated with DASHBOARD_TOKEN
 */
function requireDashboardToken(req, res, next) {
  const configuredToken = process.env.DASHBOARD_TOKEN;
  if (!configuredToken || configuredToken.length < 24) {
    logger.error(TAG, "Server misconfigured: DASHBOARD_TOKEN is missing or under 24 characters.");
    return res.status(500).json({
      error: "Server configuration error. Contact administrator."
    });
  }

  const incomingToken = req.get("x-dashboard-token");
  if (!incomingToken || !timingSafeCompare(incomingToken, configuredToken)) {
    logger.warn(TAG, `Unauthorized API attempt from ${req.ip || "unknown"}`);
    return res.status(401).json({
      error: "Unauthorized. Enter your valid dashboard token."
    });
  }

  next();
}

module.exports = {
  timingSafeCompare,
  requireDashboardToken
};
