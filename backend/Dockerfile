# Use a Debian-based slim image
FROM node:20-bookworm-slim

# Install Chromium and required fonts/dependencies for Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Skip Puppeteer's internal Chromium download to save space and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5600

# Start command (overridden by docker-compose for dev, but good for prod)
CMD ["npm", "start"]