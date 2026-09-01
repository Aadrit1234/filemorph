FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-draw \
    fonts-liberation \
    fonts-dejavu-core \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install pdf2docx --break-system-packages --no-cache-dir

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

RUN mkdir -p uploads output

EXPOSE 3000
CMD ["node", "server.js"]
