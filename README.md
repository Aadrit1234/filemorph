# 🎨 Filemorph

**File Converter & Audio Transcriber with 100% Content Preservation**

Convert documents, images, and audio between formats — every pixel, table, font, and image stays exactly where it belongs. Plus, transcribe audio in English and Hindi.

🔗 **Live Demo:** [filemorph.vercel.app](https://filemorph.vercel.app)

---

## ✨ Features

### 📄 Document Conversion (100% Content Preservation)
| Conversion | Method | Preservation |
|---|---|---|
| **PDF → DOCX** | pdf2docx (Python) | ✅ Tables, formatting, code blocks, layout |
| **DOCX → PDF** | LibreOffice | ✅ Fonts, colors, images, page layout |
| **PDF → PPTX/RTF/HTML/ODT** | LibreOffice | ✅ Full content preservation |
| **DOCX → RTF/HTML/ODT** | LibreOffice | ✅ Full content preservation |
| **PPTX → PDF** | LibreOffice | ✅ Slides, animations, transitions |

### 🖼️ Image Conversion
JPG, PNG, WebP, TIFF, BMP, SVG, GIF — convert between any format with maximum quality retention via Sharp.

### 🎙️ Audio Transcription
Transcribe spoken audio in English and Hindi using Whisper AI. Upload files or use your microphone for real-time results.

### 🛡️ Privacy & Security
- Files processed server-side, auto-deleted after 1 hour
- No sign-up required
- No file size limits for most conversions
- Open source — inspect the code yourself

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **LibreOffice** ([install](https://www.libreoffice.org/download/)) — required for document conversions
- **Python 3.11+** with `pdf2docx` — required for PDF→DOCX with full preservation

### Installation

```bash
git clone https://github.com/Aadrit1234/filemorph.git
cd filemorph
npm install
pip install pdf2docx
```

### Run

```bash
npm start
```

Server starts at `http://localhost:3000`.

---

## 🐳 Docker (Recommended for Production)

The Docker image includes LibreOffice + Python + pdf2docx for full functionality.

```bash
# Build
docker build -t filemorph .

# Run
docker run -p 3000:3000 filemorph
```

---

## ☁️ Deployment

### Option 1: Render (Recommended — Full Backend)

Render supports Docker with persistent storage — perfect for this app.

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Select **Docker** as runtime
5. Render auto-detects the `Dockerfile` and `render.yaml`
6. Deploy — done!

The `render.yaml` is pre-configured with health checks and auto-deploy.

### Option 2: Vercel (Frontend Only) + Render (Backend)

Vercel can host the static frontend, while the backend runs on Render.

1. **Deploy backend to Render** (see above) — note the URL (e.g., `https://filemorph-api.onrender.com`)
2. **Deploy frontend to Vercel:**
   - Update `vercel.json` with your actual backend URL
   - Push to GitHub
   - Import in [vercel.com](https://vercel.com)
3. Vercel proxies `/api/*` requests to your Render backend

### Option 3: Railway / Fly.io / DigitalOcean

Any platform that supports Docker will work. Just use the included `Dockerfile`.

---

## 📡 API Documentation

### Health Check
```
GET /api/health
```
```json
{ "status": "ok", "libreoffice": true }
```

### Convert File
```
POST /api/convert
Content-Type: multipart/form-data

file: <uploaded file>
targetFormat: pdf|docx|rtf|html|odt|pptx|txt|jpg|png|webp|tiff
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "/api/download/{fileId}/converted.{ext}",
  "filename": "converted.docx",
  "fileSize": 59530,
  "format": "docx"
}
```

### Download Converted File
```
GET /api/download/:fileId/:filename
```

### Supported Conversions

| Input | Output Formats |
|---|---|
| PDF | DOCX, PPTX, RTF, HTML, ODT, TXT |
| DOCX | PDF, RTF, HTML, ODT, TXT |
| PPTX | PDF, TXT |
| XLSX | PDF, CSV |
| JPG/PNG/WebP/TIFF/BMP/GIF/SVG | PNG, JPG, WebP, TIFF, BMP, GIF |

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | HTML, CSS (Claymorphism), Vanilla JS |
| **Backend** | Node.js, Express.js |
| **PDF → DOCX** | pdf2docx (Python) — extracts tables, formatting, layout |
| **Document Conversion** | LibreOffice (headless) — DOCX↔PDF, PPTX→PDF, etc. |
| **Image Conversion** | Sharp — pixel-perfect format conversion |
| **Audio Transcription** | Whisper AI |
| **Deployment** | Docker, Render, Vercel (frontend) |

---

## 📁 Project Structure

```
filemorph/
├── server.js              # Express backend with conversion APIs
├── pdf2docx_convert.py    # Python wrapper for PDF→DOCX conversion
├── Dockerfile             # Full Docker image (LibreOffice + Python)
├── render.yaml            # Render deployment config
├── vercel.json            # Vercel frontend deployment config
├── index.html             # Homepage
├── convert.html           # File converter page
├── transcribe.html        # Audio transcription page
├── css/
│   └── style.css          # Claymorphism UI design
├── js/
│   ├── main.js            # Shared UI logic
│   ├── convert.js         # Conversion logic
│   └── transcribe.js      # Transcription logic
└── package.json
```

---

## ⚡ Performance

- **PDF → DOCX:** ~4 seconds per page (pdf2docx)
- **DOCX → PDF:** ~2 seconds (LibreOffice)
- **Image conversions:** <1 second (Sharp)
- **Max file size:** 100MB
- **Auto-cleanup:** Files deleted after 1 hour

---

## 📄 License

MIT — use freely, modify freely.

---

## 🙏 Credits

Built with ❤️ by [Aadrit Chandravanci](https://github.com/Aadrit1234)
