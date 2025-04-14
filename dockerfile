# Stage 1: Build React frontend
FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve backend and built frontend
FROM node:20

# Puppeteer dependencies
RUN apt-get update && apt-get install -y \
  fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 \
  libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 \
  libxcomposite1 libxdamage1 libxrandr2 xdg-utils wget unzip libxshmfence1

WORKDIR /app
COPY --from=build /app /app
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server/server.js"]
