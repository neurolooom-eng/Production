# Single-image build: compiles the React app and runs the Express server,
# which serves both the API and the web app on one port.
FROM node:22-slim

# Build tools for the better-sqlite3 native module.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cached layer).
COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

# Build the web app.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]
