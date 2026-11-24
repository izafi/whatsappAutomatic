const { configService } = require("../config");
const { schedulerEngine } = require("../scheduler");

/**
 * GET /api/config
 * Returns current configuration
 */
function getConfig(_req, res) {
  res.json({
    success: true,
    config: configService.getConfig()
  });
}

/**
 * PUT /api/config
 * Validates and updates configuration
 */
function updateConfig(req, res, next) {
  try {
    const updated = configService.updateConfig(req.body);

    // If automation is actively running, restart timer to adopt new settings immediately
    if (updated.enabled) {
      schedulerEngine.restartScheduler();
    }

    res.json({
      success: true,
      config: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConfig,
  updateConfig
};
