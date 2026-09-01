/* ═══════════════════════════════════════════════════════════
   FILEMORPH — File Conversion Logic
   Smart format filtering + conversion animation
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ───
  let selectedFile = null;
  let selectedFormat = null;

  // ─── DOM Elements ───
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const previewIcon = document.getElementById('previewIcon');
  const previewName = document.getElementById('previewName');
  const previewSize = document.getElementById('previewSize');
  const removeFileBtn = document.getElementById('removeFile');
  const formatSection = document.getElementById('formatSection');
  const formatTabs = document.getElementById('formatTabs');
  const formatGrid = document.getElementById('formatGrid');
  const convertBtnWrapper = document.getElementById('convertBtnWrapper');
  const convertBtn = document.getElementById('convertBtn');
  const conversionAnim = document.getElementById('conversionAnim');
  const animSource = document.getElementById('animSource');
  const animSourceIcon = document.getElementById('animSourceIcon');
  const animSourceLabel = document.getElementById('animSourceLabel');
  const animTarget = document.getElementById('animTarget');
  const animTargetIcon = document.getElementById('animTargetIcon');
  const animTargetLabel = document.getElementById('animTargetLabel');
  const animArrow = document.getElementById('animArrow');
  const animProgressFill = document.getElementById('animProgressFill');
  const animStatus = document.getElementById('animStatus');
  const conversionResult = document.getElementById('conversionResult');
  const downloadBtn = document.getElementById('downloadBtn');
  const resultInfo = document.getElementById('resultInfo');
  const convertAnotherBtn = document.getElementById('convertAnotherBtn');

  // ═══════════════════════════════════════════════════════
  // SMART FORMAT MAP — only what's actually supported
  // ═══════════════════════════════════════════════════════

  var extensionInfo = {
    pdf:  { icon: 'file-text', label: 'PDF',  category: 'document' },
    doc:  { icon: 'file', label: 'DOC',  category: 'document' },
    docx: { icon: 'file', label: 'DOCX', category: 'document' },
    xls:  { icon: 'table', label: 'XLS',  category: 'document' },
    xlsx: { icon: 'table', label: 'XLSX', category: 'document' },
    ppt:  { icon: 'presentation', label: 'PPT',  category: 'document' },
    pptx: { icon: 'presentation', label: 'PPTX', category: 'document' },
    jpg:  { icon: 'image', label: 'JPG',  category: 'image' },
    jpeg: { icon: 'image', label: 'JPEG', category: 'image' },
    png:  { icon: 'image', label: 'PNG',  category: 'image' },
    gif:  { icon: 'image', label: 'GIF',  category: 'image' },
    bmp:  { icon: 'box', label: 'BMP',  category: 'image' },
    tiff: { icon: 'image', label: 'TIFF', category: 'image' },
    tif:  { icon: 'image', label: 'TIF',  category: 'image' },
    webp: { icon: 'globe', label: 'WebP', category: 'image' },
    svg:  { icon: 'pen-tool', label: 'SVG',  category: 'image' },
    txt:  { icon: 'align-left', label: 'TXT',  category: 'text' },
    rtf:  { icon: 'align-left', label: 'RTF',  category: 'text' },
    csv:  { icon: 'table', label: 'CSV',  category: 'text' },
    mp3:  { icon: 'music', label: 'MP3',  category: 'audio' },
    wav:  { icon: 'music', label: 'WAV',  category: 'audio' },
    ogg:  { icon: 'music', label: 'OGG',  category: 'audio' },
    m4a:  { icon: 'music', label: 'M4A',  category: 'audio' },
    flac: { icon: 'music', label: 'FLAC', category: 'audio' },
  };

  var formatMeta = {
    pdf:  { icon: 'file-text', label: 'PDF',  desc: 'Portable Document' },
    docx: { icon: 'file', label: 'DOCX', desc: 'Word Document' },
    doc:  { icon: 'file', label: 'DOC',  desc: 'Legacy Word' },
    pptx: { icon: 'presentation', label: 'PPTX', desc: 'PowerPoint' },
    ppt:  { icon: 'presentation', label: 'PPT',  desc: 'Legacy PowerPoint' },
    xlsx: { icon: 'table', label: 'XLSX', desc: 'Excel Spreadsheet' },
    xls:  { icon: 'table', label: 'XLS',  desc: 'Legacy Excel' },
    txt:  { icon: 'align-left', label: 'TXT',  desc: 'Plain Text' },
    rtf:  { icon: 'align-left', label: 'RTF',  desc: 'Rich Text' },
    html: { icon: 'globe', label: 'HTML', desc: 'Web Page' },
    odt:  { icon: 'file', label: 'ODT',  desc: 'OpenDocument' },
    csv:  { icon: 'table', label: 'CSV',  desc: 'Spreadsheet' },
    png:  { icon: 'image', label: 'PNG',  desc: 'Lossless' },
    jpg:  { icon: 'image', label: 'JPG',  desc: 'Compressed' },
    jpeg: { icon: 'image', label: 'JPEG', desc: 'Compressed' },
    webp: { icon: 'globe', label: 'WebP', desc: 'Modern Format' },
    tiff: { icon: 'image', label: 'TIFF', desc: 'Print Quality' },
    gif:  { icon: 'image', label: 'GIF',  desc: 'Animated' },
    bmp:  { icon: 'box', label: 'BMP',  desc: 'Bitmap' },
    svg:  { icon: 'pen-tool', label: 'SVG',  desc: 'Vector' },
    mp3:  { icon: 'music', label: 'MP3',  desc: 'Compressed' },
    wav:  { icon: 'music', label: 'WAV',  desc: 'Uncompressed' },
    ogg:  { icon: 'music', label: 'OGG',  desc: 'Open Format' },
    m4a:  { icon: 'music', label: 'M4A',  desc: 'Apple Audio' },
    flac: { icon: 'music', label: 'FLAC', desc: 'Lossless' },
  };

  // ─── Supported conversions per input extension ───
  var libreAvailable = false; // checked via API on load

  // Always supported (Sharp + pdf-parse + mammoth)
  var alwaysSupported = {
    // Images
    jpg:  ['png', 'webp', 'tiff', 'gif', 'bmp'],
    jpeg: ['png', 'webp', 'tiff', 'gif', 'bmp'],
    png:  ['jpg', 'webp', 'tiff', 'gif', 'bmp'],
    gif:  ['png', 'jpg', 'webp'],
    bmp:  ['png', 'jpg', 'webp'],
    tiff: ['png', 'jpg', 'webp'],
    tif:  ['png', 'jpg', 'webp'],
    webp: ['png', 'jpg', 'tiff'],
    svg:  ['png', 'jpg', 'webp'],
    // Text extraction
    pdf:  ['txt'],
    doc:  ['txt'],
    docx: ['txt'],
    txt:  [],
    csv:  ['txt'],
    rtf:  ['txt'],
  };

  // Need LibreOffice
  var libreOnly = {
    pdf:  ['docx', 'pptx', 'xlsx', 'rtf', 'html'],
    doc:  ['pdf', 'docx', 'rtf', 'html'],
    docx: ['pdf', 'rtf', 'html'],
    ppt:  ['pdf', 'pptx', 'txt'],
    pptx: ['pdf', 'txt'],
    xls:  ['pdf', 'xlsx', 'csv'],
    xlsx: ['pdf', 'csv'],
    csv:  ['xlsx'],
    rtf:  ['pdf', 'docx'],
  };

  function getSupportedFormats(ext) {
    var base = alwaysSupported[ext] || [];
    if (libreAvailable && libreOnly[ext]) {
      return base.concat(libreOnly[ext]);
    }
    return base;
  }

  // ─── Check LibreOffice availability ───
  fetch('/api/health').then(function(r){return r.json()}).then(function(data){
    libreAvailable = !!data.libreoffice;
  }).catch(function(){});

  // ─── Helpers ───
  function getExt(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ═══════════════════════════════════════════════════════
  // DRAG & DROP
  // ═══════════════════════════════════════════════════════

  if (dropZone) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropZone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(function (evt) {
      dropZone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
    });

    dropZone.addEventListener('click', function (e) {
      if (e.target.tagName !== 'BUTTON') fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
    });
  }

  // ═══════════════════════════════════════════════════════
  // FILE SELECTED
  // ═══════════════════════════════════════════════════════

  function handleFileSelect(file) {
    var ext = getExt(file.name);
    var info = extensionInfo[ext] || { icon: '📄', label: ext.toUpperCase(), category: 'document' };

    selectedFile = file;

    // Show preview
    previewIcon.innerHTML = '<i data-lucide="' + info.icon + '"></i>';
    if (window.lucide) lucide.createIcons();
    previewName.textContent = file.name;
    previewSize.textContent = formatFileSize(file.size);
    filePreview.classList.add('active');
    dropZone.style.display = 'none';

    // Build supported format grid
    var targets = getSupportedFormats(ext);
    if (targets.length === 0) {
      if (window.showToast) window.showToast('No supported conversions for this file type', 'error');
      return;
    }

    formatGrid.innerHTML = '';
    targets.forEach(function (targetExt) {
      var meta = formatMeta[targetExt];
      if (!meta) return;

      var div = document.createElement('div');
      div.className = 'format-option';
      div.dataset.format = targetExt;
      div.innerHTML =
        '<div class="format-icon"><i data-lucide="' + meta.icon + '"></i></div>' +
        '<div class="format-label">' + meta.label + '</div>' +
        '<div class="format-desc">' + meta.desc + '</div>';
      div.addEventListener('click', function () { selectFormat(targetExt, div); });
      formatGrid.appendChild(div);
    });

    // Show format section
    formatSection.style.display = 'block';

    // Init Lucide icons in the new grid
    if (window.lucide) lucide.createIcons();
    selectedFormat = null;
    convertBtn.disabled = true;
    convertBtnWrapper.style.display = 'none';
    conversionAnim.classList.remove('active');
    conversionResult.classList.remove('active');
  }

  // ─── Select Format ───
  function selectFormat(format, element) {
    selectedFormat = format;
    formatGrid.querySelectorAll('.format-option').forEach(function (opt) { opt.classList.remove('selected'); });
    element.classList.add('selected');
    convertBtn.disabled = false;
    convertBtnWrapper.style.display = 'block';
  }

  // ─── Remove File ───
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function () {
      selectedFile = null;
      selectedFormat = null;
      filePreview.classList.remove('active');
      formatSection.style.display = 'none';
      convertBtnWrapper.style.display = 'none';
      conversionAnim.classList.remove('active');
      conversionResult.classList.remove('active');
      dropZone.style.display = '';
      fileInput.value = '';
    });
  }

  // ═══════════════════════════════════════════════════════
  // CONVERT WITH ANIMATION
  // ═══════════════════════════════════════════════════════

  if (convertBtn) {
    convertBtn.addEventListener('click', function () {
      if (!selectedFile || !selectedFormat) return;

      var srcExt = getExt(selectedFile.name).toUpperCase();
      var srcInfo = extensionInfo[getExt(selectedFile.name)] || { icon: '📄', label: srcExt };
      var tgtInfo = formatMeta[selectedFormat] || { icon: '📄', label: selectedFormat.toUpperCase() };

      // Setup animation
      convertBtn.disabled = true;
      convertBtn.style.display = 'none';
      conversionAnim.classList.add('active');
      conversionResult.classList.remove('active');

      animSourceIcon.innerHTML = '<i data-lucide="' + srcInfo.icon + '"></i>';
      animSourceLabel.textContent = srcInfo.label;
      animTargetIcon.innerHTML = '<i data-lucide="' + tgtInfo.icon + '"></i>';
      animTargetLabel.textContent = tgtInfo.label;
      if (window.lucide) lucide.createIcons();
      animTarget.classList.remove('done');
      animSource.classList.remove('processing');
      animArrow.classList.remove('active');
      animProgressFill.style.width = '0%';
      animStatus.textContent = 'Uploading file...';

      // Animate stages
      var progress = 0;

      // Stage 1: Source processing
      setTimeout(function () {
        animSource.classList.add('processing');
        animArrow.classList.add('active');
      }, 400);

      // Stage 2: Progress
      var interval = setInterval(function () {
        progress = Math.min(progress + Math.random() * 12, 88);
        animProgressFill.style.width = progress + '%';

        if (progress < 30) animStatus.textContent = 'Uploading file...';
        else if (progress < 55) animStatus.textContent = 'Analyzing content...';
        else if (progress < 75) animStatus.textContent = 'Converting with full preservation...';
        else animStatus.textContent = 'Almost done...';
      }, 350);

      // API call
      var formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('targetFormat', selectedFormat);

      fetch('/api/convert', { method: 'POST', body: formData })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Conversion failed'); });
          return res.json();
        })
        .then(function (result) {
          clearInterval(interval);

          // Complete animation
          animProgressFill.style.width = '100%';
          animStatus.textContent = 'Conversion complete!';
          animSource.classList.remove('processing');
          animArrow.classList.remove('active');
          animTarget.classList.add('done');

          setTimeout(function () {
            conversionAnim.classList.remove('active');
            conversionResult.classList.add('active');
            var ext = selectedFormat.toUpperCase();
            resultInfo.textContent = selectedFile.name + ' → ' + result.filename + ' (' + formatFileSize(result.fileSize) + ')';
            downloadBtn.href = result.downloadUrl;
            downloadBtn.download = result.filename;
            convertBtn.style.display = '';
            convertBtn.disabled = false;

            if (window.showToast) window.showToast('Conversion successful!', 'success');
          }, 1200);
        })
        .catch(function (err) {
          clearInterval(interval);
          conversionAnim.classList.remove('active');
          convertBtn.style.display = '';
          convertBtn.disabled = false;
          animSource.classList.remove('processing');
          animArrow.classList.remove('active');
          animTarget.classList.remove('done');

          if (window.showToast) window.showToast(err.message || 'Conversion failed.', 'error');
        });
    });
  }

  // ─── Convert Another ───
  if (convertAnotherBtn) {
    convertAnotherBtn.addEventListener('click', function () {
      selectedFile = null;
      selectedFormat = null;
      filePreview.classList.remove('active');
      formatSection.style.display = 'none';
      convertBtnWrapper.style.display = 'none';
      conversionAnim.classList.remove('active');
      conversionResult.classList.remove('active');
      dropZone.style.display = '';
      fileInput.value = '';
      convertBtn.disabled = true;
      convertBtn.style.display = '';
      convertBtn.textContent = '🔄 Convert Now';
      animProgressFill.style.width = '0%';
    });
  }

})();
