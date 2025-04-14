# Stage 1: Build React frontend
FROM --platform=linux/amd64 node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup Express backend
FROM --platform=linux/amd64 node:20
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
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxshmfence1 \
  xdg-utils \
  wget \
  unzip

WORKDIR /app
COPY --from=build /app /app

RUN npm install --omit=dev

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# 👇 THIS is the critical bit: make sure this path matches your actual server file
CMD ["node", "server/server.js"]
