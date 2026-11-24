require("dotenv").config();

const TOKEN = process.env.DASHBOARD_TOKEN;
const PORT = Number(process.env.PORT || 3000);
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();
const isJson = args.includes("--json");

if (!TOKEN) {
  console.error("Error: DASHBOARD_TOKEN is missing in .env file.");
  process.exit(1);
}

const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Make an authenticated HTTP request to the running server
 */
async function api(route, method = "GET", body = null) {
  try {
    const res = await fetch(`${BASE_URL}${route}`, {
      method,
      headers: {
        "x-dashboard-token": TOKEN,
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.cause?.code === "ECONNREFUSED" || (err.message && err.message.includes("fetch failed"))) {
      throw new Error(`Cannot connect to server at ${BASE_URL}. Ensure the bot server is running ('npm start').`);
    }
    throw err;
  }
}

function printUsage() {
  console.log(`
WhatsApp Hourly Message Bot - CLI Interface

Usage: node cli.js <command> [--json]

Available Commands:
  status    Display WhatsApp connection, contact, interval, and scheduler status
  start     Start the automatic message scheduler
  stop      Stop the automatic message scheduler
  send      Send an immediate test message to the selected contact
  config    Display the currently saved configuration
  chats     List individual WhatsApp contacts synced to WhatsApp Web
  logout    Unlink WhatsApp session and prepare new QR code

Options:
  --json    Output raw JSON response
`);
}

async function handleStatus() {
  const data = await api("/api/status");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const isConn = Boolean(data.connected);
  const connStatus = isConn ? "Connected" : (data.state || "Not Connected");
  const isSchedActive = Boolean(data.schedulerActive);
  const recipient = data.config.phoneNumber
    ? `+${data.config.phoneNumber}`
    : (data.config.recipientId ? `${data.config.recipientName || "Contact"} (${data.config.recipientId})` : "None (Enter in dashboard)");
  const nextRun = isSchedActive && data.nextRunAt ? new Date(data.nextRunAt).toLocaleString() : "—";
  const lastSent = data.lastSentAt ? new Date(data.lastSentAt).toLocaleString() : "Never";
  const lastErr = data.lastError || "None";

  console.log("==================================================");
  console.log("      WhatsApp Hourly Message Bot - Status        ");
  console.log("==================================================");
  console.log(`WhatsApp Connection : ${connStatus}`);
  console.log(`Scheduler State     : ${isSchedActive ? "Active" : "Inactive"}`);
  console.log(`Automation Flag     : ${data.config.enabled ? "Enabled" : "Stopped"}`);
  console.log(`Selected Contact    : ${recipient}`);
  console.log(`Message Text        : "${data.config.message}"`);
  console.log(`Sending Interval    : ${data.config.intervalMinutes} minute(s)`);
  console.log(`Next Scheduled Run  : ${nextRun}`);
  console.log(`Last Message Sent   : ${lastSent}`);
  console.log(`Last Error          : ${lastErr}`);
  console.log("==================================================");
}

async function handleStart() {
  const data = await api("/api/start", "POST");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(`✔ ${data.message}`);
  if (data.nextRunAt) {
    console.log(`  Next message scheduled for: ${new Date(data.nextRunAt).toLocaleString()}`);
  }
}

async function handleStop() {
  const data = await api("/api/stop", "POST");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(`✔ ${data.message}`);
}

async function handleSend() {
  console.log("Sending test message to selected contact...");
  const data = await api("/api/send-now", "POST");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(`✔ Test message delivered successfully!`);
  console.log(`  Recipient : ${data.recipientName} (${data.recipientId})`);
  console.log(`  Timestamp : ${new Date(data.sentAt).toLocaleString()}`);
}

async function handleConfig() {
  const data = await api("/api/config");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const c = data.config;
  console.log("Current Configuration:");
  console.log(`  Recipient ID   : ${c.recipientId || "None"}`);
  console.log(`  Recipient Name : ${c.recipientName || "None"}`);
  console.log(`  Message        : "${c.message}"`);
  console.log(`  Interval       : ${c.intervalMinutes} minutes`);
  console.log(`  Enabled        : ${c.enabled}`);
}

async function handleChats() {
  const data = await api("/api/chats");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const chats = data.chats || [];
  if (chats.length === 0) {
    console.log("No individual WhatsApp chats found. Ensure chats exist on WhatsApp Web.");
    return;
  }
  console.log(`Available Individual WhatsApp Contacts (${chats.length}):`);
  chats.forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.name} (${c.id})`);
  });
}

async function handleLogout() {
  const data = await api("/api/logout", "POST");
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(`✔ ${data.message}`);
}

async function main() {
  switch (command) {
    case "status":
      await handleStatus();
      break;
    case "start":
      await handleStart();
      break;
    case "stop":
      await handleStop();
      break;
    case "send":
      await handleSend();
      break;
    case "config":
      await handleConfig();
      break;
    case "chats":
      await handleChats();
      break;
    case "logout":
      await handleLogout();
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printUsage();
      break;
    default:
      console.error(`Unknown command: '${command}'`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("CLI Error:", err.message);
  process.exit(1);
});
