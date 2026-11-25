require("dotenv").config();

const express = require("express");
const path = require("path");
const routes = require("./src/routes");
const { errorHandler, notFoundHandler } = require("./src/middleware/errorHandler");
const { whatsappManager } = require("./src/whatsapp");
const { stopScheduler } = require("./src/scheduler");
const logger = require("./src/utils/logger");

const TAG = "Server";
const app = express();
const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.DASHBOARD_TOKEN;

if (!TOKEN || TOKEN.length < 24) {
  logger.error(TAG, "FATAL: DASHBOARD_TOKEN in .env must be set and be at least 24 characters long.");
  process.exit(1);
}

// Security: Disable X-Powered-By header
app.disable("x-powered-by");

// Parse JSON request bodies with size guard
app.use(express.json({ limit: "20kb" }));

// Restrict static files strictly to the public directory (protects .env, data/, and .wwebjs_auth/)
app.use(express.static(path.join(__dirname, "public"), {
  dotfiles: "ignore",
  index: "index.html",
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  }
}));

// Mount all modular application routes
app.use(routes);

// 404 handler for undefined API routes
app.use("/api/*", notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

// Bind server and start background services
if (require.main === module) {
  // Listen on PORT without explicit HOST to bind directly to all interfaces (0.0.0.0 / ::) without getaddrinfo DNS lookup
  const server = app.listen(PORT, () => {
    logger.info(TAG, `==========================================================`);
    logger.info(TAG, ` WhatsApp Bot Server active on port ${PORT}`);
    logger.info(TAG, ` Dashboard URL: http://localhost:${PORT}`);
    logger.info(TAG, `==========================================================`);

    // Initiate WhatsApp client in background
    whatsappManager.initialize().catch((err) => {
      logger.error(TAG, "WhatsApp background initialization error:", err.message);
    });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(TAG, `FATAL: Port ${PORT} is already in use by another process.`);
      logger.error(TAG, `To kill previous instances in PowerShell, run: Stop-Process -Name "node" -Force`);
    } else {
      logger.error(TAG, "Server error:", err.message);
    }
    process.exit(1);
  });

  // Clean graceful shutdown handling
  async function shutdown() {
    logger.info(TAG, "Graceful shutdown initiated...");
    stopScheduler();

    try {
      await whatsappManager.destroy();
    } catch (error) {
      logger.error(TAG, "Error destroying WhatsApp client:", error.message);
    }

    server.close(() => {
      logger.info(TAG, "Server stopped cleanly.");
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = app;
