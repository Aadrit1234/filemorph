const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { PDFDocument } = require('pdf-lib');
const { execSync, exec, execFileSync } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(require('child_process').execFile);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Detect LibreOffice ───
let libreAvailable = false;
let librePath = null;

function detectLibreOffice() {
  const candidates = [
    'libreoffice',
    'soffice',
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/usr/local/bin/libreoffice',
    'C:/Program Files/LibreOffice/program/soffice.exe',
    'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
  ];
  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ['--version'], { timeout: 5000, stdio: 'pipe' });
      libreAvailable = true;
      librePath = cmd;
      console.log(`  ✅ LibreOffice detected: ${cmd}`);
      return;
    } catch (e) { /* not found, try next */ }
  }
  console.log('  ⚠️  LibreOffice not found — document conversions (PDF↔DOCX etc.) will be limited');
  console.log('     Install LibreOffice: https://www.libreoffice.org/download/');
}

detectLibreOffice();

// ─── Directories ───
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'output');
[UPLOAD_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Multer ───
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx',
      '.jpg','.jpeg','.png','.gif','.bmp','.tiff','.tif','.webp','.svg',
      '.txt','.rtf','.csv',
      '.mp3','.wav','.ogg','.m4a','.flac','.webm','.mp4'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext) ? true : new Error(`Unsupported file type: ${ext}`));
  }
});

app.use(express.json());

// ─── CORS (allow Vercel frontend) ───
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(__dirname));

// ─── Error handler for multer ───
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ─── Health ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', libreoffice: libreAvailable, timestamp: new Date().toISOString() });
});

// ─── Supported conversions (smart list) ───
app.get('/api/conversions', (req, res) => {
  // pdf2docx availability for PDF→DOCX
  let pdf2docxAvailable = false;
  try {
    const pyCheck = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'];
    for (const p of pyCheck) {
      try {
        execFileSync(p, ['-c', 'import pdf2docx'], { timeout: 5000, stdio: 'pipe' });
        pdf2docxAvailable = true;
        break;
      } catch (e) {}
    }
  } catch (e) {}

  const docConversions = {};
  if (pdf2docxAvailable || libreAvailable) {
    docConversions['pdf-to-docx'] = { label: 'PDF → DOCX', icon: '📄', method: pdf2docxAvailable ? 'pdf2docx' : 'libreoffice' };
  }
  if (libreAvailable) {
    docConversions['docx-to-pdf'] = { label: 'DOCX → PDF', icon: '📝' };
    docConversions['doc-to-docx'] = { label: 'DOC → DOCX', icon: '📄' };
    docConversions['pdf-to-pptx'] = { label: 'PDF → PPTX', icon: '📊' };
    docConversions['pptx-to-pdf'] = { label: 'PPTX → PDF', icon: '📊' };
    docConversions['pdf-to-rtf'] = { label: 'PDF → RTF', icon: '📝' };
    docConversions['pdf-to-html'] = { label: 'PDF → HTML', icon: '🌐' };
    docConversions['pdf-to-odt'] = { label: 'PDF → ODT', icon: '📄' };
    docConversions['docx-to-rtf'] = { label: 'DOCX → RTF', icon: '📝' };
    docConversions['docx-to-html'] = { label: 'DOCX → HTML', icon: '🌐' };
    docConversions['docx-to-odt'] = { label: 'DOCX → ODT', icon: '📄' };
    docConversions['xls-to-pdf'] = { label: 'XLS → PDF', icon: '📈' };
    docConversions['xlsx-to-pdf'] = { label: 'XLSX → PDF', icon: '📈' };
  }

  res.json({
    libreoffice: libreAvailable,
    pdf2docx: pdf2docxAvailable,
    document: docConversions,
    image: {
      'jpg-to-png': { label: 'JPG → PNG' },
      'png-to-jpg': { label: 'PNG → JPG' },
      'png-to-webp': { label: 'PNG → WebP' },
      'webp-to-png': { label: 'WebP → PNG' },
      'tiff-to-png': { label: 'TIFF → PNG' },
      'bmp-to-png': { label: 'BMP → PNG' },
      'gif-to-png': { label: 'GIF → PNG' },
      'svg-to-png': { label: 'SVG → PNG' },
    },
    text: {
      'pdf-to-txt': { label: 'PDF → TXT' },
      'docx-to-txt': { label: 'DOCX → TXT' },
    }
  });
});

// ═══════════════════════════════════════════════════════
// CONVERT ENDPOINT
// ═══════════════════════════════════════════════════════
app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { targetFormat } = req.body;
  const inputPath = req.file.path;
  const fileId = uuidv4();
  const ext = path.extname(req.file.originalname).toLowerCase();
  const target = targetFormat.toLowerCase();

  try {
    let result;

    // ── Text extraction (PDF, DOCX → TXT) ──
    if (target === 'txt') {
      result = await extractText(inputPath, ext, fileId);
    }
    // ── Image conversions ──
    else if (isImageConversion(ext, target)) {
      result = await convertImage(inputPath, target, fileId);
    }
    // ── PDF → DOCX (uses pdf2docx for 100% content preservation) ──
    else if (ext === '.pdf' && target === 'docx') {
      try {
        result = await convertPdfToDocx(inputPath, fileId);
      } catch (e) {
        console.log('  pdf2docx failed, falling back to LibreOffice:', e.message);
        if (!libreAvailable) throw e;
        result = await convertWithLibreOffice(inputPath, 'docx', fileId);
      }
    }
    // ── DOC → DOCX (upgrade legacy format) ──
    else if (ext === '.doc' && target === 'docx') {
      result = await convertWithLibreOffice(inputPath, 'docx', fileId);
    }
    // ── Document conversions (needs LibreOffice) ──
    else if (isDocumentConversion(ext, target)) {
      if (!libreAvailable) {
        throw new Error('Document conversion requires LibreOffice. Please install it from https://www.libreoffice.org/download/ or use the Docker version.');
      }
      result = await convertWithLibreOffice(inputPath, target, fileId);
    }
    else {
      throw new Error(`Conversion from ${ext} to ${target} is not supported`);
    }

    // Cleanup upload
    fs.unlink(inputPath, () => {});
    res.json(result);

  } catch (err) {
    console.error('Conversion error:', err.message);
    fs.unlink(inputPath, () => {});
    res.status(500).json({ error: err.message || 'Conversion failed' });
  }
});

// ─── Download ───
app.get('/api/download/:fileId/:filename', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, req.params.fileId, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, req.params.filename, () => {
      fs.rm(path.dirname(filePath), { recursive: true, force: true }, () => {});
    });
  } else {
    res.status(404).json({ error: 'File not found or expired' });
  }
});

// ═══════════════════════════════════════════════════════
// IMAGE CONVERSION (via Sharp)
// ═══════════════════════════════════════════════════════
async function convertImage(inputPath, target, fileId) {
  const outputDir = path.join(OUTPUT_DIR, fileId);
  fs.mkdirSync(outputDir, { recursive: true });

  const formatMap = {
    png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp',
    tiff: 'tiff', gif: 'gif', bmp: 'bmp'
  };

  const format = formatMap[target] || target;
  const ext = format === 'jpeg' ? 'jpg' : format;
  const outputPath = path.join(outputDir, `converted.${ext}`);

  let img = sharp(inputPath);

  // Get metadata to preserve quality
  const metadata = await img.metadata();

  switch (format) {
    case 'jpeg':
      img = img.jpeg({ quality: 95, mozjpeg: true });
      break;
    case 'png':
      img = img.png({ compressionLevel: 6 });
      break;
    case 'webp':
      img = img.webp({ quality: 90 });
      break;
    case 'tiff':
      img = img.tiff({ compression: 'lzw' });
      break;
    case 'gif':
      img = img.gif();
      break;
    case 'bmp':
      img = img.bmp();
      break;
  }

  await img.toFile(outputPath);
  const stats = fs.statSync(outputPath);

  return {
    success: true,
    downloadUrl: `/api/download/${fileId}/converted.${ext}`,
    filename: `converted.${ext}`,
    fileSize: stats.size,
    format: ext
  };
}

// ═══════════════════════════════════════════════════════
// TEXT EXTRACTION
// ═══════════════════════════════════════════════════════
async function extractText(inputPath, ext, fileId) {
  const outputDir = path.join(OUTPUT_DIR, fileId);
  fs.mkdirSync(outputDir, { recursive: true });
  let text = '';

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(inputPath);
    try {
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } catch (parseErr) {
      // pdf-parse can fail on some PDFs — fall back to LibreOffice text extraction
      if (libreAvailable) {
        const txtBuffer = await libreOfficeConvert(dataBuffer, '.txt', '.pdf');
        text = txtBuffer.toString('utf-8');
      } else {
        throw new Error('PDF text extraction failed: ' + parseErr.message);
      }
    }
  } else if (ext === '.docx' || ext === '.doc') {
    const dataBuffer = fs.readFileSync(inputPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    text = result.value;
  } else if (ext === '.txt') {
    text = fs.readFileSync(inputPath, 'utf-8');
  } else if (ext === '.csv') {
    text = fs.readFileSync(inputPath, 'utf-8');
  } else if (libreAvailable) {
    // Use LibreOffice to convert to txt first
    const buffer = fs.readFileSync(inputPath);
    const txtBuffer = await libreOfficeConvert(buffer, '.txt', ext);
    text = txtBuffer.toString('utf-8');
  } else {
    throw new Error('Text extraction for this file type requires LibreOffice');
  }

  const outputPath = path.join(outputDir, 'converted.txt');
  fs.writeFileSync(outputPath, text, 'utf-8');
  const stats = fs.statSync(outputPath);

  return {
    success: true,
    downloadUrl: `/api/download/${fileId}/converted.txt`,
    filename: 'converted.txt',
    fileSize: stats.size,
    format: 'txt',
    preview: text.substring(0, 3000)
  };
}

// ═══════════════════════════════════════════════════════
// LIBREOFFICE CONVERSION (execFile for 100% content preservation)
// ═══════════════════════════════════════════════════════
const { execFile } = require('child_process');

/**
 * Convert a buffer via LibreOffice with 100% content preservation.
 * Uses execFile (no shell) + UserInstallation env for reliability.
 */
function libreOfficeConvert(inputBuffer, targetExt, sourceExt) {
  return new Promise((resolve, reject) => {
    // Use project-local temp dirs (not system temp) for LibreOffice reliability
    const workDir = fs.mkdtempSync(path.join(OUTPUT_DIR, 'lo_work_'));
    const profileDir = fs.mkdtempSync(path.join(OUTPUT_DIR, 'lo_profile_'));
    const fileName = `source${sourceExt || '.' + targetExt}`;
    const srcFile = path.join(workDir, fileName);
    fs.writeFileSync(srcFile, inputBuffer);

    // Export filter map — only where explicit filter improves fidelity
    const filterMap = {
      pdf: 'writer_pdf_Export',   // Ensures Writer-quality PDF export
      pptx: 'Impress MS PowerPoint 2007 XML',
      xlsx: 'Calc MS Excel 2007 XML',
    };
    const filter = filterMap[targetExt];
    const fmt = filter ? `${targetExt}:${filter}` : targetExt;

    const args = [
      `-env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
      '--headless',
    ];

    // When converting FROM PDF, force Writer to open it (Draw can't export to doc/docx/rtf/html/odt)
    if (sourceExt === '.pdf') {
      args.push('--infilter=writer_pdf_import');
    }

    args.push('--convert-to', fmt, '--outdir', workDir, srcFile);

    const libreDir = path.dirname(librePath);
    execFile(librePath, args, { timeout: 120000, cwd: libreDir }, (err, stdout, stderr) => {
      if (err) {
        fs.rmSync(workDir, { recursive: true, force: true });
        fs.rmSync(profileDir, { recursive: true, force: true });
        reject(new Error(`LibreOffice conversion failed: ${stderr || err.message}`));
        return;
      }

      try {
        // Find output file
        const outName = fileName.replace(/\.[^.]+$/, '') + '.' + targetExt;
        const outPath = path.join(workDir, outName);

        let outputBuffer;
        if (fs.existsSync(outPath)) {
          outputBuffer = fs.readFileSync(outPath);
        } else {
          const files = fs.readdirSync(workDir).filter(f => f !== fileName);
          if (files.length === 0) {
            reject(new Error('LibreOffice produced no output'));
            return;
          }
          outputBuffer = fs.readFileSync(path.join(workDir, files[0]));
        }
        resolve(outputBuffer);
      } catch (readErr) {
        reject(new Error(`Failed to read output: ${readErr.message}`));
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
        fs.rmSync(profileDir, { recursive: true, force: true });
      }
    });
  });
}

async function convertPdfToDocx(inputPath, fileId) {
  const outputDir = path.join(OUTPUT_DIR, fileId);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'converted.docx');
  const scriptPath = path.join(__dirname, 'pdf2docx_convert.py');

  // Find Python executable (cross-platform)
  const pythonPaths = [
    'python3', 'python',
    '/usr/bin/python3', '/usr/bin/python',
    '/usr/local/bin/python3', '/usr/local/bin/python',
    'C:/Users/jeet1/AppData/Local/Programs/Python/Python313/python.exe',
    'C:/Users/jeet1/AppData/Local/Programs/Python/Python312/python.exe',
    'C:/Users/jeet1/AppData/Local/Programs/Python/Python311/python.exe',
  ];
  let pythonExe = null;
  for (const p of pythonPaths) {
    try { execFileSync(p, ['--version'], { timeout: 5000, stdio: 'pipe' }); pythonExe = p; break; } catch (e) {}
  }
  if (!pythonExe) throw new Error('Python not found. Required for PDF→DOCX conversion.');

  try {
    const { stdout } = await execFileAsync(pythonExe, [scriptPath, inputPath, outputPath], {
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
    });
    const lines = stdout.trim().split('\n');
    const okLine = lines.find(l => l.startsWith('OK:'));
    if (!okLine) {
      throw new Error(lines.join(' '));
    }
    const stats = fs.statSync(outputPath);
    return {
      success: true,
      downloadUrl: `/api/download/${fileId}/converted.docx`,
      filename: 'converted.docx',
      fileSize: stats.size,
      format: 'docx'
    };
  } catch (err) {
    console.error('pdf2docx error:', err.message);
    // Fallback to LibreOffice
    if (libreAvailable) {
      console.log('  Falling back to LibreOffice for PDF→DOCX...');
      return convertWithLibreOffice(inputPath, 'docx', fileId);
    }
    throw new Error('PDF→DOCX conversion failed: ' + err.message);
  }
}

async function convertWithLibreOffice(inputPath, target, fileId) {
  const outputDir = path.join(OUTPUT_DIR, fileId);
  fs.mkdirSync(outputDir, { recursive: true });
  const ext = path.extname(inputPath).toLowerCase();
  const inputBuffer = fs.readFileSync(inputPath);
  const result = await libreOfficeConvert(inputBuffer, target, ext);
  const outputPath = path.join(outputDir, `converted.${target}`);
  fs.writeFileSync(outputPath, result);
  const stats = fs.statSync(outputPath);

  return {
    success: true,
    downloadUrl: `/api/download/${fileId}/converted.${target}`,
    filename: `converted.${target}`,
    fileSize: stats.size,
    format: target
  };
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function isImageConversion(ext, target) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.svg'];
  const imageTargets = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'gif', 'bmp'];
  return imageExts.includes(ext) && imageTargets.includes(target);
}

function isDocumentConversion(ext, target) {
  const docExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.rtf'];
  const docTargets = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'rtf', 'html', 'odt'];
  return docExts.includes(ext) && docTargets.includes(target);
}

// ─── Cleanup old files every hour ───
setInterval(() => {
  const maxAge = 60 * 60 * 1000;
  [UPLOAD_DIR, OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(sub => {
      const subPath = path.join(dir, sub);
      try {
        if (fs.statSync(subPath).mtimeMs < Date.now() - maxAge) {
          fs.rm(subPath, { recursive: true, force: true }, () => {});
        }
      } catch (e) {}
    });
  });
}, 60 * 60 * 1000);

// ─── Start ───
app.listen(PORT, () => {
  console.log(`\n  🎨 Filemorph Server running on http://localhost:${PORT}`);
  console.log(`  📦 LibreOffice: ${libreAvailable ? '✅ Available' : '❌ Not installed (document conversions limited)'}\n`);
});
