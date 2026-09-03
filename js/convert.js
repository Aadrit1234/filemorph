/* ═══════════════════════════════════════════════════════════
   FILEMORPH — File Conversion Logic (v2)
   Clean workflow: Upload → Select Format → Convert → Download
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ───
  let selectedFile = null;
  let selectedFormat = null;

  // ─── DOM Elements ───
  const stepUpload = document.getElementById('stepUpload');
  const stepSelect = document.getElementById('stepSelect');
  const stepConverting = document.getElementById('stepConverting');
  const stepDone = document.getElementById('stepDone');

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const removeFileBtn = document.getElementById('removeFile');

  const fileTypeIcon = document.getElementById('fileTypeIcon');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const fileExt = document.getElementById('fileExt');

  const formatTabs = document.getElementById('formatTabs');
  const formatGrid = document.getElementById('formatGrid');
  const actionBar = document.getElementById('actionBar');
  const convertBtn = document.getElementById('convertBtn');

  const convSourceIcon = document.getElementById('convSourceIcon');
  const convSourceLabel = document.getElementById('convSourceLabel');
  const convTargetIcon = document.getElementById('convTargetIcon');
  const convTargetLabel = document.getElementById('convTargetLabel');
  const convProgressFill = document.getElementById('convProgressFill');
  const convStatus = document.getElementById('convStatus');

  const doneInfo = document.getElementById('doneInfo');
  const downloadBtn = document.getElementById('downloadBtn');
  const convertAnotherBtn = document.getElementById('convertAnotherBtn');

  // ═══════════════════════════════════════════════════════
  // FORMAT DEFINITIONS
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
    pdf:  { icon: 'file-text', label: 'PDF',  desc: 'Document' },
    docx: { icon: 'file', label: 'DOCX', desc: 'Word' },
    doc:  { icon: 'file', label: 'DOC',  desc: 'Legacy Word' },
    pptx: { icon: 'presentation', label: 'PPTX', desc: 'Slides' },
    ppt:  { icon: 'presentation', label: 'PPT',  desc: 'Legacy Slides' },
    xlsx: { icon: 'table', label: 'XLSX', desc: 'Spreadsheet' },
    xls:  { icon: 'table', label: 'XLS',  desc: 'Legacy Excel' },
    txt:  { icon: 'align-left', label: 'TXT',  desc: 'Plain Text' },
    rtf:  { icon: 'align-left', label: 'RTF',  desc: 'Rich Text' },
    html: { icon: 'globe', label: 'HTML', desc: 'Web Page' },
    odt:  { icon: 'file', label: 'ODT',  desc: 'OpenDocument' },
    csv:  { icon: 'table', label: 'CSV',  desc: 'Comma-Separated' },
    png:  { icon: 'image', label: 'PNG',  desc: 'Lossless' },
    jpg:  { icon: 'image', label: 'JPG',  desc: 'Compressed' },
    jpeg: { icon: 'image', label: 'JPEG', desc: 'Compressed' },
    webp: { icon: 'globe', label: 'WebP', desc: 'Modern' },
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
  var libreAvailable = false;

  var alwaysSupported = {
    jpg:  ['png', 'webp', 'tiff', 'gif', 'bmp'],
    jpeg: ['png', 'webp', 'tiff', 'gif', 'bmp'],
    png:  ['jpg', 'webp', 'tiff', 'gif', 'bmp'],
    gif:  ['png', 'jpg', 'webp'],
    bmp:  ['png', 'jpg', 'webp'],
    tiff: ['png', 'jpg', 'webp'],
    tif:  ['png', 'jpg', 'webp'],
    webp: ['png', 'jpg', 'tiff'],
    svg:  ['png', 'jpg', 'webp'],
    pdf:  ['txt'],
    doc:  ['txt'],
    docx: ['txt'],
    txt:  [],
    csv:  ['txt'],
    rtf:  ['txt'],
  };

  var libreOnly = {
    pdf:  ['docx', 'pptx', 'xlsx', 'rtf', 'html', 'odt'],
    doc:  ['pdf', 'docx', 'rtf', 'html', 'odt'],
    docx: ['pdf', 'rtf', 'html', 'odt'],
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

  function showStep(step) {
    [stepUpload, stepSelect, stepConverting, stepDone].forEach(function(s) {
      if (s) s.classList.add('hidden');
    });
    if (step) step.classList.remove('hidden');
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
    var info = extensionInfo[ext] || { icon: 'file', label: ext.toUpperCase(), category: 'document' };

    selectedFile = file;
    selectedFormat = null;

    // Update file card
    fileTypeIcon.innerHTML = '<i data-lucide="' + info.icon + '"></i>';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileExt.textContent = info.label;

    // Build format grid
    var targets = getSupportedFormats(ext);
    if (targets.length === 0) {
      if (window.showToast) window.showToast('No conversions available for ' + info.label, 'error');
      return;
    }

    formatGrid.innerHTML = '';
    targets.forEach(function (targetExt) {
      var meta = formatMeta[targetExt];
      if (!meta) return;

      var chip = document.createElement('div');
      chip.className = 'format-chip';
      chip.dataset.format = targetExt;
      chip.dataset.category = info.category;
      chip.innerHTML =
        '<div class="format-chip-icon"><i data-lucide="' + meta.icon + '"></i></div>' +
        '<div class="format-chip-text">' +
          '<div class="format-chip-label">' + meta.label + '</div>' +
          '<div class="format-chip-desc">' + meta.desc + '</div>' +
        '</div>';
      chip.addEventListener('click', function () { selectFormat(targetExt, chip); });
      formatGrid.appendChild(chip);
    });

    // Show step 2
    showStep(stepSelect);
    actionBar.classList.add('hidden');
    convertBtn.disabled = true;

    if (window.lucide) lucide.createIcons();
  }

  // ─── Select Format ───
  function selectFormat(format, element) {
    selectedFormat = format;
    formatGrid.querySelectorAll('.format-chip').forEach(function (c) { c.classList.remove('selected'); });
    element.classList.add('selected');
    convertBtn.disabled = false;
    actionBar.classList.remove('hidden');
  }

  // ─── Remove File ───
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function () {
      selectedFile = null;
      selectedFormat = null;
      fileInput.value = '';
      showStep(stepUpload);
    });
  }

  // ─── Category Tabs ───
  if (formatTabs) {
    formatTabs.querySelectorAll('.cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        formatTabs.querySelectorAll('.cat-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cat = btn.dataset.category;
        formatGrid.querySelectorAll('.format-chip').forEach(function (chip) {
          if (cat === 'all') {
            chip.style.display = '';
          } else {
            chip.style.display = chip.dataset.category === cat ? '' : 'none';
          }
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // CONVERT
  // ═══════════════════════════════════════════════════════

  if (convertBtn) {
    convertBtn.addEventListener('click', function () {
      if (!selectedFile || !selectedFormat) return;

      var srcExt = getExt(selectedFile.name).toUpperCase();
      var srcInfo = extensionInfo[getExt(selectedFile.name)] || { icon: 'file', label: srcExt };
      var tgtInfo = formatMeta[selectedFormat] || { icon: 'file', label: selectedFormat.toUpperCase() };

      // Show converting step
      showStep(stepConverting);

      // Setup animation
      convSourceIcon.innerHTML = '<i data-lucide="' + srcInfo.icon + '"></i>';
      convSourceLabel.textContent = srcInfo.label;
      convTargetIcon.innerHTML = '<i data-lucide="' + tgtInfo.icon + '"></i>';
      convTargetLabel.textContent = tgtInfo.label;
      convProgressFill.style.width = '0%';
      convStatus.textContent = 'Uploading...';

      var convSource = document.querySelector('.conv-source');
      var convTarget = document.querySelector('.conv-target');
      convSource.classList.add('processing');
      convTarget.classList.remove('done');

      if (window.lucide) lucide.createIcons();

      // Progress animation
      var progress = 0;
      var interval = setInterval(function () {
        progress = Math.min(progress + Math.random() * 12, 88);
        convProgressFill.style.width = progress + '%';

        if (progress < 30) convStatus.textContent = 'Uploading file...';
        else if (progress < 55) convStatus.textContent = 'Analyzing content...';
        else if (progress < 75) convStatus.textContent = 'Converting with full preservation...';
        else convStatus.textContent = 'Almost done...';
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
          convProgressFill.style.width = '100%';
          convStatus.textContent = 'Done!';
          convSource.classList.remove('processing');
          convTarget.classList.add('done');

          setTimeout(function () {
            showStep(stepDone);
            doneInfo.textContent = selectedFile.name + ' → ' + result.filename + ' (' + formatFileSize(result.fileSize) + ')';
            downloadBtn.href = result.downloadUrl;
            downloadBtn.download = result.filename;

            if (window.showToast) window.showToast('Conversion successful!', 'success');
          }, 800);
        })
        .catch(function (err) {
          clearInterval(interval);
          showStep(stepSelect);
          convSource.classList.remove('processing');
          convTarget.classList.remove('done');

          if (window.showToast) window.showToast(err.message || 'Conversion failed.', 'error');
        });
    });
  }

  // ─── Convert Another ───
  if (convertAnotherBtn) {
    convertAnotherBtn.addEventListener('click', function () {
      selectedFile = null;
      selectedFormat = null;
      fileInput.value = '';
      showStep(stepUpload);
    });
  }

})();
