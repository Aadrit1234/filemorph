# ⚡ Filemorph

**Free Online File Converter & Audio Transcriber**

Convert documents, images, and audio between formats with 100% content preservation. Every pixel, table, font, and image stays exactly where it belongs.

🔗 **Live Demo:** [filemorph.vercel.app](https://filemorph.vercel.app) (Frontend) + [filemorph-xxo4.onrender.com](https://filemorph-xxo4.onrender.com) (Backend)

---

## ✨ Features

### 📄 Document Conversion
| Conversion | Method | Quality |
|---|---|---|
| **PDF → DOCX** | pdf2docx (Python) | ✅ Tables, formatting, code blocks, layout |
| **DOCX → PDF** | LibreOffice | ✅ Fonts, colors, images, page layout |
| **DOC → DOCX** | LibreOffice | ✅ Full content preservation |
| **PDF → PPTX/RTF/HTML/ODT** | LibreOffice | ✅ Full content preservation |
| **PPTX → PDF** | LibreOffice | ✅ Slides, animations, transitions |

### 🖼️ Image Conversion
JPG, PNG, WebP, TIFF, BMP, SVG, GIF — convert between any format with maximum quality retention via Sharp.

### 🎙️ Audio Transcription
Transcribe spoken audio in English and Hindi using Web Speech API. Upload files or use your microphone for real-time results.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **LibreOffice** — required for document conversions
- **Python 3.11+** with `pdf2docx` — required for PDF→DOCX

### Local Development

```bash
# Clone
git clone https://github.com/Aadrit1234/filemorph.git
cd filemorph

# Install dependencies
npm install
pip install pdf2docx

# Start server
npm start
```

Server runs at `http://localhost:3000`

---

## 🐳 Docker

```bash
# Build
docker build -t filemorph .

# Run
docker run -p 3000:3000 filemorph
```

---

## ☁️ Deployment

### Option 1: Render (Full Backend)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect GitHub repo `Aadrit1234/filemorph`
3. Select **Docker** runtime
4. Render auto-detects the `Dockerfile`
5. Deploy — done!

### Option 2: Vercel (Frontend) + Render (Backend)

1. Deploy backend on Render → note the URL
2. Update `vercel.json` with your Render URL
3. Deploy frontend on Vercel

---

## 📡 API

### Health Check
```
GET /api/health
→ { "status": "ok", "libreoffice": true }
```

### Convert File
```
POST /api/convert
Content-Type: multipart/form-data

file: <uploaded file>
targetFormat: pdf|docx|rtf|html|odt|pptx|txt|jpg|png|webp
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "/api/download/{fileId}/converted.docx",
  "filename": "converted.docx",
  "fileSize": 59530,
  "format": "docx"
}
```

### Download
```
GET /api/download/:fileId/:filename
```

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS (Glassmorphism), Vanilla JS |
| Backend | Node.js, Express.js |
| PDF → DOCX | pdf2docx (Python) |
| Document Conversion | LibreOffice (headless) |
| Image Conversion | Sharp |
| Transcription | Web Speech API |
| Deployment | Docker, Render, Vercel |

---

## 📁 Structure

```
filemorph/
├── server.js              # Express backend
├── pdf2docx_convert.py    # PDF→DOCX converter
├── Dockerfile             # Docker image
├── render.yaml            # Render config
├── vercel.json            # Vercel config
├── index.html             # Homepage
├── convert.html           # Converter page
├── transcribe.html        # Transcription page
├── css/style.css          # Styles
├── js/
│   ├── main.js            # Shared logic
│   ├── convert.js         # Conversion logic
│   └── transcribe.js      # Transcription logic
└── package.json
```

---

## 📄 License

MIT

---

## 🙏 Credits

Built with ❤️ by [Aadrit Chandravanci](https://github.com/Aadrit1234)
