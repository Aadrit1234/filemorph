FROM node:20-slim

# Install LibreOffice + Python for document conversion
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-pdfimport \
    fonts-liberation \
    fonts-dejavu-core \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install pdf2docx Python package
RUN pip3 install pdf2docx --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

RUN mkdir -p uploads output

EXPOSE 3000
CMD ["node", "server.js"]
