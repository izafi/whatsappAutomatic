FROM node:20-slim

# Install Chromium and required runtime libraries for headless WhatsApp Web
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer environment for Railway / Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    HEADLESS=true \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Storage directory for Railway Volume persistence
RUN mkdir -p /app/storage/data /app/storage/.wwebjs_auth

EXPOSE 3000

CMD ["npm", "start"]
