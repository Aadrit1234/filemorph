# FileMorph — LibreOffice-powered file converter
# This Docker image runs both the static frontend AND the conversion API
FROM node:20-slim

# Install LibreOffice and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-draw \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node.js dependencies
COPY package.json ./
RUN npm install --production

# Copy all frontend files and server
COPY . .

# Create temp directory for uploads
RUN mkdir -p /tmp/filemorph

EXPOSE 3000

CMD ["node", "server.js"]
