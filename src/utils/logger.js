/**
 * Standardized logger for application modules
 */

function formatTime() {
  return new Date().toISOString();
}

const logger = {
  info: (tag, ...args) => {
    console.log(`[${formatTime()}] [INFO] [${tag}]`, ...args);
  },
  warn: (tag, ...args) => {
    console.warn(`[${formatTime()}] [WARN] [${tag}]`, ...args);
  },
  error: (tag, ...args) => {
    console.error(`[${formatTime()}] [ERROR] [${tag}]`, ...args);
  },
  debug: (tag, ...args) => {
    if (process.env.DEBUG === "true") {
      console.log(`[${formatTime()}] [DEBUG] [${tag}]`, ...args);
    }
  }
};

module.exports = logger;
