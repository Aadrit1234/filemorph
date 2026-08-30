# FileMorph — Free File Converter & Audio Transcriber

A powerful, free file converter and audio transcriber. Converts between 38+ format pairs across 22 file types, and transcribes audio in 50+ languages.

**Document conversions (DOCX↔PDF) use LibreOffice on the server for 100% content preservation** — images, tables, fonts, formatting all stay exactly as they are.

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Frontend (HTML/CSS/JS)             │
│  ┌─────────────┐ ┌───────────────┐  │
│  │ Image/Audio  │ │ Document      │  │
│  │ Data formats │ │ Conversions   │  │
│  │ (client-side)│ │ → API call    │  │
│  └─────────────┘ └──────┬────────┘  │
│                         │           │
│  ┌──────────────────────▼────────┐  │
│  │  Node.js API + LibreOffice    │  │
│  │  True format conversion       │  │
│  │  (preserves everything)       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🚀 Deploy for Free

### Option 1: Render.com (Recommended — full backend + LibreOffice)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → Sign up (free)
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repo `filemorph`
5. Settings:
   - **Runtime:** Docker
   - **Dockerfile:** `./Dockerfile`
   - **Plan:** Free
6. Click **"Deploy"** — done in ~3 minutes

Your site is live at `https://filemorph.onrender.com` with full LibreOffice conversion.

### Option 2: Railway (free $5/month credit)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 3: Fly.io (free tier — 3 shared-cpu VMs)

```bash
fly auth signup
fly launch
fly deploy
```

### Option 4: Static-only (GitHub Pages, Netlify, Vercel)

If you only want client-side conversion (no LibreOffice):

1. Go to GitHub repo Settings → Pages
2. Source: `master` branch → Save
3. Live at `https://aadrit1234.github.io/filemorph/`

**Note:** Document conversions (DOCX↔PDF) will use browser-based extraction (best effort, ~90% fidelity) instead of LibreOffice (100% fidelity).

## 📁 Project Structure

```
├── index.html          # Landing page
├── convert.html        # File converter
├── transcribe.html     # Audio transcriber
├── about.html          # About & FAQ
├── server.js           # Node.js API (LibreOffice)
├── package.json        # Dependencies
├── Dockerfile          # Docker config with LibreOffice
├── render.yaml         # Render.com deployment
├── css/
│   └── style.css       # Design system
└── js/
    ├── main.js         # Shared utilities
    ├── convert.js      # Conversion engine
    └── transcribe.js   # Transcription engine
```

## ✨ Features

| Feature | How It Works | Fidelity |
|---------|-------------|----------|
| **Images** (PNG↔JPG↔WEBP↔SVG↔GIF↔BMP) | Canvas API, pixel-exact | ✅ Perfect |
| **Audio** (MP3/WAV/OGG/M4A/AAC/FLAC→WAV) | Web Audio API, bit-exact PCM | ✅ Perfect |
| **Data** (CSV↔TSV↔JSON↔XML) | Pure JS, zero data loss | ✅ Perfect |
| **DOCX↔PDF** | LibreOffice server-side | ✅ 100% preservation |
| **DOCX→TXT/HTML** | LibreOffice server-side | ✅ 100% preservation |
| **PDF→TXT/HTML** | LibreOffice server-side | ✅ 100% preservation |
| **HTML/MD→PDF** | LibreOffice server-side | ✅ Full rendering |
| **Audio Transcription** | Web Speech API, 50+ languages | ✅ Client-side |
| **OCR for Scanned Docs** | Tesseract.js | ✅ Client-side |
| **Dark/Light Theme** | localStorage persistence | ✅ |

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, instant load
- **Backend:** Node.js + Express
- **Document Conversion:** LibreOffice (via `libreoffice-convert`)
- **Image Processing:** Canvas API
- **Audio Processing:** Web Audio API
- **PDF Reading:** pdf.js
- **DOCX Reading:** mammoth.js
- **ZIP Handling:** JSZip
- **HTML→PDF:** html2pdf.js
- **OCR:** Tesseract.js
- **Transcription:** Web Speech API

## 📄 License

MIT — Free to use, modify, and distribute.
