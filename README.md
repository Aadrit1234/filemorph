# FileMorph - Transform Any File Into Anything

🌐 **Live Demo:** [filemorph.vercel.app](https://filemorph.vercel.app)

A powerful, free, client-side file converter and audio transcriber. Convert between 38+ format pairs across 22 file types, and transcribe audio in 50+ languages — all without uploading anything to a server.

## ✨ Features

- **38 Conversion Pairs** — Images, documents, audio, data formats
- **22 File Types** — PNG, JPG, WEBP, SVG, GIF, BMP, PDF, DOCX, TXT, HTML, MD, RTF, MP3, WAV, OGG, M4A, AAC, FLAC, CSV, TSV, JSON, XML
- **50+ Transcription Languages** — Hindi, English, Spanish, French, Japanese, Chinese, Arabic, and many more
- **100% Client-Side** — No data leaves your browser. Zero server uploads.
- **Content Preservation** — Images, tables, formatting, fonts preserved during conversion
- **Live Microphone Transcription** — Real-time speech-to-text
- **Dark/Light Theme** — Toggle with persistent preference
- **Mobile Responsive** — Works on all devices

## 🚀 Deployment (Free)

### Option 1: Vercel (Recommended)
```bash
npm i -g vercel
vercel login
vercel
```

### Option 2: Netlify
1. Push to GitHub
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "Add new site" → Import from Git
4. Select your repo → Deploy

### Option 3: GitHub Pages
1. Push to GitHub
2. Go to repo Settings → Pages
3. Set source to `main` branch, root `/`
4. Save

### Option 4: Cloudflare Pages
1. Push to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages
3. Connect your repo → Deploy

## 🛠️ Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript** — No framework needed
- **jsPDF** — PDF generation
- **pdf.js** — PDF reading
- **mammoth.js** — DOCX reading
- **Tesseract.js** — OCR for scanned documents
- **html2pdf.js** — HTML to PDF rendering
- **Web Speech API** — Audio transcription
- **Web Audio API** — Audio visualization

## 📁 Project Structure

```
├── index.html          # Landing page
├── convert.html        # File converter
├── transcribe.html     # Audio transcriber
├── about.html          # About & FAQ
├── css/
│   └── style.css       # Design system
└── js/
    ├── main.js         # Shared utilities
    ├── convert.js      # Conversion engine
    └── transcribe.js   # Transcription engine
```

## 📄 License

MIT — Free to use, modify, and distribute.
