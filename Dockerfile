# Stage 1: Build the React frontend
FROM --platform=linux/amd64 node:20 as build

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies (including CRA)
RUN npm install

# Copy all files (including public/, src/, etc.)
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Setup the server with Puppeteer and serve the built frontend
FROM --platform=linux/amd64 node:20

# Install Puppeteer Chromium dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only what's needed from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/build ./client/build

# Install only backend deps + puppeteer
RUN npm install && \
    npx puppeteer browsers install chrome && \
    ls -R /home/node/.cache/puppeteer || echo "Chrome not found"

# Expose port
EXPOSE 5000

# Start the backend server
CMD ["node", "server/server.js"]
