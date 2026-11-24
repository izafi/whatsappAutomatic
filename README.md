# WhatsApp Hourly Auto Message Bot

A single-recipient WhatsApp Web automation sample with a web dashboard and terminal controls.

## Important

This project uses `whatsapp-web.js`, an unofficial library that automates WhatsApp Web. It is not the official WhatsApp Business Platform. WhatsApp may change its web client, automation may stop working, and use may expose your account to restrictions. Use only with a recipient who has agreed to receive these reminders. For supported business messaging, use the official WhatsApp Business Platform and follow its opt-in, template, and messaging rules.

## Requirements

- Ubuntu 22.04/24.04 VPS (recommended), Node.js 18+ (Node 20 LTS recommended)
- SSH access
- A WhatsApp account to link
- A domain and HTTPS reverse proxy are strongly recommended before exposing the dashboard publicly

## Local setup

1. Copy `.env.example` to `.env`.
2. Set a long random `DASHBOARD_TOKEN` (at least 24 characters).
3. Set `PORT`, and optionally the initial number/message/interval.
4. Install dependencies: `npm install`
5. Start: `npm start`
6. Open `http://localhost:3000`, enter the dashboard token, and scan the QR code using WhatsApp > Linked devices.
7. Enter the recipient's full international number, save settings, and click **Send test now**.
8. Click **Start automation**. The first scheduled message is sent after one full interval, then at each interval.

Phone number example for Pakistan: `923001234567` (country code 92, no leading 0, plus sign, spaces or dashes).

## Terminal controls

In another terminal, from the project directory:

- `node cli.js status`
- `node cli.js start`
- `node cli.js stop`
- `node cli.js send`

## Deploy on an Ubuntu VPS

1. SSH into your VPS.
2. Install Node.js 20 LTS and npm using the NodeSource instructions for your Ubuntu version.
3. Install Chromium/Puppeteer system dependencies if prompted by Puppeteer. The project config includes the no-sandbox flags commonly needed on a headless VPS.
4. Upload this folder to the VPS.
5. Run `npm install`.
6. Create `.env` from `.env.example`, set a strong secret, and set the port.
7. Start once with `npm start`, open the dashboard through a protected HTTPS reverse proxy, and scan the QR.
8. Stop the foreground process with Ctrl+C.
9. Install PM2 globally: `sudo npm install -g pm2`
10. Start the app: `pm2 start server.js --name whatsapp-hourly-bot`
11. Configure startup: `pm2 startup` and run the exact command PM2 prints.
12. Save the process list: `pm2 save`.

PM2 keeps the Node process alive and can restore it after a server reboot. Keep `.wwebjs_auth/` and `data/` on persistent disk and back them up securely. Never upload `.env` or `.wwebjs_auth/` to GitHub.

## Security

- Do not expose port 3000 directly to the public internet without HTTPS and additional access restrictions.
- Use a reverse proxy such as Nginx with HTTPS, and restrict access by IP or VPN where possible.
- Use a long, unique dashboard token.
- Do not share your QR code, session folder, or dashboard token.
- The dashboard token is stored in browser session storage while the dashboard tab is open.
- Back up `.wwebjs_auth/` securely; it contains sensitive login session data.

## Behavior and troubleshooting

- Automation does not send an immediate message when started. It waits one complete interval. Use **Send test now** to test.
- The scheduler starts only when WhatsApp is connected.
- If WhatsApp disconnects, the scheduler pauses. Reconnect/restart the app and scan again if needed.
- A VPS must have persistent storage. Ephemeral hosting may erase the linked session.
- Use `pm2 logs whatsapp-hourly-bot` to inspect logs.
