/* ===================================================================
   FileMorph Server — LibreOffice-powered conversion for documents
   Images, audio, data formats still convert client-side (faster, perfect)
   This server handles ONLY: DOCX↔PDF, PPTX, XLSX, RTF, HTML→PDF etc.
   =================================================================== */
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const libre = require('libreoffice-convert');

const convert = promisify(libre.convert);
const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS from anywhere (it's a free tool)
app.use(cors());
app.use(express.json());

// Serve static files (the frontend)
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html'
}));

// File upload config — temp directory
const upload = multer({
  dest: '/tmp/filemorph/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// LibreOffice binary detection
function findLibreOffice() {
  const candidates = [
    // Linux (Docker, VPS, Render, Railway)
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/usr/lib/libreoffice/program/soffice',
    '/usr/local/bin/soffice',
    // macOS
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    // Windows
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Fallback: hope it's on PATH
  return 'soffice';
}

const SOFFICE = findLibreOffice();

// Map file extensions to LibreOffice output formats
const FORMAT_MAP = {
  // Document conversions
  'pdf':  'pdf',
  'docx': 'docx',
  'doc':  'docx',
  'pptx': 'pptx',
  'ppt':  'pptx',
  'xlsx': 'xlsx',
  'xls':  'xlsx',
  'rtf':  'rtf',
  'odt':  'odt',
  'ods':  'ods',
  'odp':  'odp',
  'txt':  'txt',
  'html': 'html',
  'htm':  'html',
  'csv':  'csv',
  'md':   'html',    // LibreOffice doesn't do MD natively
  'svg':  'png',     // LibreOffice renders SVG
};

// Supported input formats for server-side conversion
const SUPPORTED_SERVER = new Set([
  'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls',
  'rtf', 'odt', 'ods', 'odp', 'html', 'htm', 'csv',
  'txt', 'md', 'svg'
]);

/* ===== Health check ===== */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    libreoffice: SOFFICE,
    supported: Array.from(SUPPORTED_SERVER),
    version: '2.0.0'
  });
});

/* ===== Main conversion endpoint ===== */
app.post('/api/convert', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const targetFormat = (req.body.targetFormat || '').toLowerCase().replace('.', '');
    if (!targetFormat) {
      return res.status(400).json({ error: 'No target format specified.' });
    }

    // Validate input format
    const inputExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    if (!SUPPORTED_SERVER.has(inputExt)) {
      return res.status(400).json({
        error: `Server cannot convert .${inputExt} files. Use client-side conversion for images, audio, and data formats.`
      });
    }

    // Validate output format
    const outputExt = FORMAT_MAP[targetFormat];
    if (!outputExt) {
      return res.status(400).json({
        error: `Cannot convert to .${targetFormat}. Supported: ${Object.keys(FORMAT_MAP).join(', ')}`
      });
    }

    console.log(`[CONVERT] ${req.file.originalname} → .${targetFormat} (${inputExt} → ${outputExt})`);

    // Read the uploaded file
    const inputData = fs.readFileSync(req.file.path);
    const inputBuffer = Buffer.from(inputData);

    // Convert with LibreOffice
    const outputBuffer = await convert(inputBuffer, '.' + outputExt, undefined);

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    // Build output filename
    const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const outputName = baseName + '.' + outputExt;

    // Content types
    const mimeTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'rtf': 'application/rtf',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      'txt': 'text/plain',
      'html': 'text/html',
      'csv': 'text/csv',
      'png': 'image/png',
    };

    const elapsed = Date.now() - startTime;
    console.log(`[DONE] ${outputName} (${(outputBuffer.length / 1024).toFixed(1)} KB) in ${elapsed}ms`);

    // Send the file as download
    res.setHeader('Content-Type', mimeTypes[outputExt] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    res.setHeader('X-Original-Name', req.file.originalname);
    res.setHeader('X-Conversion-Time', elapsed + 'ms');
    res.send(outputBuffer);

  } catch (err) {
    // Clean up temp file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    console.error('[ERROR]', err.message);
    res.status(500).json({
      error: 'Conversion failed: ' + err.message,
      hint: 'Make sure LibreOffice is installed on the server.'
    });
  }
});

/* ===== Fallback to index.html ===== */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ===== Start ===== */
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║         🔮 FileMorph Server v2.0         ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  Running on http://localhost:${PORT}        ║`);
  console.log(`  ║  LibreOffice: ${SOFFICE.substring(0, 26).padEnd(26)}║`);
  console.log('  ║  API: POST /api/convert                 ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
