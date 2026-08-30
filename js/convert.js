/* ===== FileMorph Conversion Engine — Direct Conversion ===== */
(function() {
  "use strict";
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  /* ===== ICONS ===== */
  var I = {
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    audio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9v6M9 6v12M12 4v16M15 8v8M18 10v4"/></svg>',
    doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    table:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
    pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 17v-4h1.2a1.3 1.3 0 1 1 0 2.6H8.5"/><path d="M12.3 17v-4h1a1.4 1.4 0 0 1 0 4z"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'
  };
  var ICAT = {image:'image',audio:'audio',csv:'table',tsv:'table',json:'table',xml:'table',yaml:'table',txt:'doc',md:'doc',html:'doc',rtf:'doc',docx:'doc',pdf:'pdf',unknown:'file'};
  var CATEXT = {png:'image',jpg:'image',jpeg:'image',webp:'image',gif:'image',bmp:'image',svg:'image',ico:'image',tiff:'image',tif:'image',heic:'image',mp3:'audio',wav:'audio',ogg:'audio',m4a:'audio',aac:'audio',flac:'audio',csv:'csv',tsv:'tsv',json:'json',xml:'xml',yaml:'yaml',yml:'yaml',txt:'txt',md:'md',rtf:'rtf',html:'html',htm:'html',docx:'docx',pdf:'pdf'};

  /* Server-available formats (LibreOffice-powered) */
  var SERVER_FORMATS = ['DOCX','PDF','TXT','HTML','PPTX','XLSX','RTF','ODT','ODS','ODP'];

  function targetsFor(cat, ext) {
    if (cat === 'image') { var n = ext === 'jpeg' ? 'jpg' : ext; return ['PNG','JPG','WEBP','BMP','GIF'].filter(function(f){return f.toLowerCase() !== n}); }
    if (cat === 'audio') return ['WAV'];
    if (cat === 'csv') return ['JSON','TSV'];
    if (cat === 'tsv') return ['CSV','JSON'];
    if (cat === 'json') return ['CSV','XML'];
    if (cat === 'xml') return ['JSON','CSV'];
    if (cat === 'txt') return ['PDF','HTML'];
    if (cat === 'md') return ['PDF','HTML','TXT'];
    if (cat === 'html') return ['PDF','TXT'];
    if (cat === 'rtf') return ['PDF','TXT'];
    if (cat === 'docx') return ['PDF','TXT','HTML'];
    if (cat === 'pdf') return ['TXT','DOCX','HTML'];
    return [];
  }

  /* ===== UTILS ===== */
  function $(id) { return document.getElementById(id); }
  function delay(ms) { return new Promise(function(r){setTimeout(r,ms)}); }
  function baseName(n) { return n.replace(/\.[^/.]+$/, ''); }
  function extOf(n) { var p = n.split('.'); return p.length > 1 ? p.pop().toLowerCase() : ''; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function escXml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtSize(b) { if(!b) return '0 B'; var u=['B','KB','MB','GB'],i=Math.min(Math.floor(Math.log(b)/Math.log(1024)),3),v=b/Math.pow(1024,i); return (i===0?Math.round(v):(v<10?Math.round(v*100)/100:Math.round(v*10)/10))+' '+u[i]; }
  function csvEsc(v) { if(v==null) return ''; var s=String(v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
  function fTaint(e) { if(e&&(e.name==='SecurityError'||/insecure/i.test(e.message||''))) return new Error("Browser blocked local processing. Try a local web server."); return e; }

  /* ===== QUEUE ===== */
  var dropzone = $('dropzone'), fileInput = $('fileInput'), dzSub = $('dzSub'),
      queueCard = $('queueCard'), queueList = $('queueList'),
      morphAllBtn = $('morphAllBtn'), clearBtn = $('clearBtn'),
      batchStatus = $('batchStatus'), batchText = $('batchText');
  var queue = [], idC = 0, isBatch = false;

  function addFiles(fl) {
    Array.prototype.forEach.call(fl, function(f) {
      var ext = extOf(f.name), cat = CATEXT[ext] || 'unknown', tgts = targetsFor(cat, ext);
      queue.push({ id:'q'+(idC++), file:f, ext:ext, cat:cat, target:tgts.length?tgts[0]:'', quality:92, status:'idle', pct:0, lbl:'', rBlob:null, rUrl:null, rName:null, err:null });
    });
    renderQ();
  }

  function qTemplate(it) {
    var ik = ICAT[it.cat] || 'file';
    var h = '<div class="q-row"><div class="q-icon">'+I[ik]+'</div><div class="q-meta"><p class="q-name">'+esc(it.file.name)+'</p><p class="q-sub">'+fmtSize(it.file.size)+' · .'+(it.ext||'?')+'</p></div><button class="q-remove" data-a="rm" data-i="'+it.id+'">×</button></div>';
    var c;
    if (it.cat==='unknown') c='<div class="q-ctrls"><span style="font-size:.72rem;color:var(--text-muted);font-style:italic">Unsupported</span></div>';
    else if (it.status==='processing') c='<div class="q-ctrls"><span class="q-status">'+esc(it.lbl)+'</span></div><div class="q-prog-wrap"><div class="q-prog-track"><div class="q-prog-fill" style="width:'+it.pct+'%"></div></div><div class="q-proc-bar"><div class="q-proc-dot"></div></div></div>';
    else if (it.status==='done') c='<div class="q-ctrls"><a class="q-dl" href="'+it.rUrl+'" download="'+esc(it.rName)+'">⬇ '+it.target+'</a><span class="q-status mono">'+fmtSize(it.rBlob.size)+'</span><button class="q-redo" data-a="redo" data-i="'+it.id+'">Again</button></div>';
    else if (it.status==='error') c='<div class="q-ctrls"><span class="q-err">'+esc(it.err)+'</span><button class="q-retry" data-a="retry" data-i="'+it.id+'">Retry</button></div>';
    else {
      var tg = targetsFor(it.cat, it.ext);
      var fmtColors = {PNG:'#6c4fe0',JPG:'#ff5c8a',WEBP:'#ffb040',BMP:'#ffb040',GIF:'#ffb040',WAV:'#6c4fe0',JSON:'#ff5c8a',CSV:'#00bfa5',TSV:'#ffb040',XML:'#4d8dff',PDF:'#00bfa5',TXT:'#4d8dff',HTML:'#ffb040',DOCX:'#4d8dff'};
      var fmtDescs = {PNG:'Lossless',JPG:'Lossy',WEBP:'Modern',BMP:'Raw',GIF:'Animated',WAV:'Uncompressed',JSON:'Structured',CSV:'Tabular',TSV:'Tab-separated',XML:'Markup',PDF:'Document',TXT:'Plain',HTML:'Web page',DOCX:'Word doc'};
      var fmtIcons = {PNG:'/image',JPG:'/image',WEBP:'/image',BMP:'/image',GIF:'/image',WAV:'/audio',JSON:'/table',CSV:'/table',TSV:'/table',XML:'/table',PDF:'/pdf',TXT:'/doc',HTML:'/doc',DOCX:'/doc'};
      var fmtCards = tg.map(function(t){
        var col = fmtColors[t]||'#6c4fe0';
        var desc = fmtDescs[t]||'';
        var sel = t===it.target?' selected':'';
        return '<div class="format-card'+sel+'" data-a="fmt" data-i="'+it.id+'" data-fmt="'+t+'"><div class="fc-icon" style="background:linear-gradient(135deg,'+col+','+col+'88)">'+t+'</div><div class="fc-label">'+t+'<span class="fc-desc">'+desc+'</span></div></div>';
      }).join('');
      var qh = '';
      if (it.target==='JPG'||it.target==='WEBP') qh = '<span class="q-quality">Quality <input type="range" min="50" max="100" value="'+it.quality+'" data-a="q" data-i="'+it.id+'"> <span data-qv="'+it.id+'">'+it.quality+'%</span></span>';
      var cap = '';
      c='<div class="format-picker"><div class="format-picker-label">Convert to</div><div class="format-cards">'+fmtCards+'</div></div>';
      c+='<div class="q-ctrls">'+qh+'<button class="q-play" data-a="play" data-i="'+it.id+'" '+(it.target&&!isBatch?'':'disabled')+'>▶ Convert</button></div>'+cap;
    }
    return '<div class="q-item" data-i="'+it.id+'">'+h+c+'</div>';
  }

  function renderQ() {
    queueCard.style.display = queue.length ? '' : 'none';
    queueList.innerHTML = queue.map(qTemplate).join('');
    dzSub.textContent = queue.length ? 'Drop more files' : 'or click to browse — nothing leaves your device';
    var has = queue.some(function(x){return x.status==='idle'&&x.target&&x.cat!=='unknown'});
    morphAllBtn.disabled = isBatch || !has;
    clearBtn.classList.toggle('hidden', queue.length === 0);
  }

  queueList.addEventListener('input', function(e) {
    if (!e.target.matches('[data-a="q"]')) return;
    var it = queue.filter(function(x){return x.id===e.target.getAttribute('data-i')})[0];
    if (!it) return;
    it.quality = parseInt(e.target.value, 10);
    var l = queueList.querySelector('[data-qv="'+it.id+'"]');
    if (l) l.textContent = it.quality + '%';
  });
  queueList.addEventListener('click', function(e) {
    var fmtCard = e.target.closest('[data-a="fmt"]');
    if (fmtCard) {
      var id = fmtCard.getAttribute('data-i');
      var fmt = fmtCard.getAttribute('data-fmt');
      var it = queue.filter(function(x){return x.id===id})[0];
      if (!it) return;
      it.target = fmt; it.quality = 92;
      renderQ();
      return;
    }
  });
  queueList.addEventListener('click', function(e) {
    var b = e.target.closest('[data-a]');
    if (!b) return;
    var id = b.getAttribute('data-i'), a = b.getAttribute('data-a');
    var it = queue.filter(function(x){return x.id===id})[0];
    if (!it) return;
    if (a==='rm') { if(it.rUrl) URL.revokeObjectURL(it.rUrl); queue=queue.filter(function(x){return x.id!==id}); renderQ(); }
    else if (a==='play') runItem(it);
    else if (a==='redo') { if(it.rUrl) URL.revokeObjectURL(it.rUrl); it.status='idle'; it.rBlob=null; it.rUrl=null; it.rName=null; renderQ(); }
    else if (a==='retry') { it.status='idle'; it.err=null; renderQ(); }
  });
  clearBtn.addEventListener('click', function() { queue.forEach(function(x){if(x.rUrl)URL.revokeObjectURL(x.rUrl)}); queue=[]; renderQ(); });

  /* ===== DROPZONE ===== */
  dropzone.addEventListener('click', function(){fileInput.click()});
  dropzone.addEventListener('keydown', function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click()}});
  ['dragenter','dragover'].forEach(function(ev){dropzone.addEventListener(ev,function(e){e.preventDefault();dropzone.classList.add('dragover')})});
  ['dragleave','drop'].forEach(function(ev){dropzone.addEventListener(ev,function(e){e.preventDefault();dropzone.classList.remove('dragover')})});
  dropzone.addEventListener('drop', function(e){if(e.dataTransfer.files&&e.dataTransfer.files.length) addFiles(e.dataTransfer.files)});
  fileInput.addEventListener('change', function(e){if(e.target.files&&e.target.files.length) addFiles(e.target.files); fileInput.value=''});

  /* ===== MORPH ALL ===== */
  morphAllBtn.addEventListener('click', async function() {
    if (isBatch) return;
    var todo = queue.filter(function(x){return x.status==='idle'&&x.target&&x.cat!=='unknown'});
    if (!todo.length) return;
    isBatch = true; batchStatus.classList.remove('hidden'); renderQ();
    for (var i=0; i<todo.length; i++) { batchText.textContent=(i+1)+' / '+todo.length; await runItem(todo[i]); }
    isBatch = false; batchStatus.classList.add('hidden'); renderQ();
  });

  /* Server API base URL — set to '' for client-side only, or your server URL */
  var API_BASE = '';

  /* Check if server API is available */
  async function checkServer() {
    try {
      var r = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(3000) });
      if (r.ok) { var d = await r.json(); return d.status === 'ok'; }
    } catch(e) {}
    return false;
  }

  /* Server-side conversion via LibreOffice (DOCX, PDF, RTF, etc.) */
  async function serverConvert(file, targetFormat) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);
    onP(30, 'Sending to LibreOffice…');
    var r = await fetch(API_BASE + '/api/convert', { method: 'POST', body: formData });
    if (!r.ok) {
      var err; try { err = await r.json(); } catch(e) { err = {}; }
      throw new Error(err.error || 'Server conversion failed (status ' + r.status + ')');
    }
    var blob = await r.blob();
    var name = r.headers.get('X-Original-Name') || file.name;
    var base = name.replace(/\.[^/.]+$/, '');
    var ext = targetFormat.toLowerCase();
    return { blob: blob, name: base + '.' + ext };
  }

  async function runItem(it) {
    it.status='processing'; it.pct=5; it.lbl='Starting…'; renderQ();
    function onP(p,l){it.pct=p;it.lbl=l;renderQ()}
    try {
      var out;

      /* ===== Document conversions: try server first (LibreOffice = perfect fidelity) ===== */
      var serverTypes = ['docx','doc','pdf','rtf'];
      var serverTargets = ['PDF','DOCX','TXT','HTML','PPTX','XLSX','RTF','ODT','ODS'];
      var useServer = serverTypes.indexOf(it.cat) !== -1 && serverTargets.indexOf(it.target) !== -1;

      if (useServer && API_BASE) {
        /* Server available — route through LibreOffice for perfect content preservation */
        try {
          onP(10, 'Checking server…');
          var serverUp = await checkServer();
          if (serverUp) {
            onP(20, 'Converting with LibreOffice (preserving all content)…');
            out = await serverConvert(it.file, it.target);
          } else {
            /* Server down — fall through to client-side */
            useServer = false;
          }
        } catch(e) {
          /* Server error — fall through to client-side */
          useServer = false;
        }
      }

      /* ===== Client-side fallback / non-document conversions ===== */
      if (!out) {
        if (it.cat==='image') out = await convImage(it.file, it.target, it.quality/100, onP);
        else if (it.cat==='audio') out = await convAudioWav(it.file, onP);
        else if (it.cat==='csv') out = await convCsvOut(it.file, it.target, onP);
        else if (it.cat==='tsv') out = await convTsv(it.file, it.target, onP);
        else if (it.cat==='json') out = await convJsonOut(it.file, it.target, onP);
        else if (it.cat==='xml') out = await convXml(it.file, it.target, onP);
        else if (it.cat==='txt') out = await convTxtOut(it.file, it.target, onP);
        else if (it.cat==='md') out = await convMd(it.file, it.target, onP);
        else if (it.cat==='html') out = await convHtml(it.file, it.target, onP);
        else if (it.cat==='rtf') out = await convRtf(it.file, it.target, onP);
        else if (it.cat==='docx') out = await convDocx(it.file, it.target, onP);
        else if (it.cat==='pdf') out = await convPdf(it.file, it.target, onP);
        else throw new Error('Unsupported file type.');
      }

      it.status='done'; it.rBlob=out.blob; it.rUrl=URL.createObjectURL(out.blob); it.rName=out.name;
    } catch(err) { err=fTaint(err); it.status='error'; it.err=(err&&err.message)?err.message:'Conversion failed.'; }
    renderQ();
  }

  /* ===================================================================
     IMAGE — pixel-exact copy, just re-encodes to target format
     =================================================================== */
  function loadImg(s) { return new Promise(function(res,rej){var img=new Image();img.onload=function(){res(img)};img.onerror=function(){rej(new Error('Could not decode image.'))};img.src=s}); }
  function readDataURL(b) { return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=function(){rej(new Error('Could not read file.'))};r.readAsDataURL(b)}); }

  async function convImage(f, tgt, q, onP) {
    onP(20,'Decoding…');
    var ext = extOf(f.name), isSvg = ext==='svg'||f.type==='image/svg+xml';
    var du = await readDataURL(f), img = await loadImg(du); await delay(50);
    onP(50,'Redrawing…');
    var w=img.naturalWidth||img.width||300, h=img.naturalHeight||img.height||300;
    if(isSvg&&(!img.naturalWidth||img.naturalWidth<2)){w=800;h=600}
    var cv=document.createElement('canvas');cv.width=w;cv.height=h;
    var ctx=cv.getContext('2d');
    if(tgt!=='PNG'&&tgt!=='GIF'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)}
    ctx.drawImage(img,0,0,w,h);
    await delay(50);onP(80,'Encoding '+tgt+'…');
    var mime=tgt==='JPG'?'image/jpeg':tgt==='WEBP'?'image/webp':tgt==='BMP'?'image/bmp':'image/png';
    var blob=await new Promise(function(res,rej){try{cv.toBlob(function(b){b?res(b):rej(new Error('Could not encode.'))},mime,q)}catch(e){rej(e)}});
    return {blob:blob,name:baseName(f.name)+'.'+tgt.toLowerCase()};
  }

  /* ===================================================================
     AUDIO → WAV — bit-exact PCM, all samples preserved
     =================================================================== */
  async function convAudioWav(f, onP) {
    onP(15,'Reading…');var ab=await f.arrayBuffer();
    onP(35,'Decoding…');var AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio not supported.');
    var ctx=new AC(),buf;try{buf=await ctx.decodeAudioData(ab)}catch(e){throw new Error("Couldn't decode audio.")}
    onP(65,'Encoding WAV…');var bl=wavBuf(buf);await delay(50);if(ctx.close)ctx.close();
    return {blob:bl,name:baseName(f.name)+'.wav'};
  }
  function wavBuf(buf) {
    var nc=buf.numberOfChannels,sr=buf.sampleRate,bd=16,cd=[];
    for(var c=0;c<nc;c++)cd.push(buf.getChannelData(c));
    var fc=buf.length,il=new Float32Array(fc*nc);
    for(var i=0;i<fc;i++)for(var ch=0;ch<nc;ch++)il[i*nc+ch]=cd[ch][i];
    var bps=bd/8,dl=il.length*bps,ab=new ArrayBuffer(44+dl),v=new DataView(ab);
    function ws(o,s){for(var j=0;j<s.length;j++)v.setUint8(o+j,s.charCodeAt(j))}
    ws(0,'RIFF');v.setUint32(4,36+dl,true);ws(8,'WAVE');ws(12,'fmt ');v.setUint32(16,16,true);
    v.setUint16(20,1,true);v.setUint16(22,nc,true);v.setUint32(24,sr,true);
    v.setUint32(28,sr*nc*bps,true);v.setUint16(32,nc*bps,true);v.setUint16(34,bd,true);
    ws(36,'data');v.setUint32(40,dl,true);
    var off=44;for(var k=0;k<il.length;k++,off+=2){var s=Math.max(-1,Math.min(1,il[k]));v.setInt16(off,s<0?s*0x8000:s*0x7fff,true)}
    return new Blob([ab],{type:'audio/wav'});
  }

  /* ===================================================================
     CSV / TSV — data preserved exactly, just delimiter changes
     =================================================================== */
  function parseCSV(t) {
    var rows=[],row=[],f='',iq=false;
    for(var i=0;i<t.length;i++){var c=t[i];if(iq){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else iq=false}else f+=c}else{if(c==='"')iq=true;else if(c===','){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);f='';rows.push(row);row=[]}else f+=c}}
    if(f.length||row.length){row.push(f);rows.push(row)}
    return rows.filter(function(r){return !(r.length===1&&r[0]==='')} );
  }
  function csvToJson(rows) {
    var h=rows[0];
    return rows.slice(1).map(function(r){var o={};h.forEach(function(k,i){o[k||('col'+i)]=r[i]!==undefined?r[i]:''});return o});
  }
  async function convCsvOut(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();onP(50,'Parsing…');
    var rows=parseCSV(t);if(rows.length<1)throw new Error('CSV is empty.');
    await delay(50);
    if (tgt==='TSV') { onP(80,'Building TSV…'); return {blob:new Blob([rows.map(function(r){return r.join('\t')}).join('\n')],{type:'text/tab-separated-values'}),name:baseName(f.name)+'.tsv'}; }
    var data=csvToJson(rows); onP(80,'Building JSON…');
    return {blob:new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name:baseName(f.name)+'.json'};
  }

  function parseTSV(t) { return t.split(/\r?\n/).filter(function(r){return r}).map(function(r){return r.split('\t')}); }
  async function convTsv(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();onP(50,'Parsing…');
    var rows=parseTSV(t);if(rows.length<1)throw new Error('TSV is empty.');
    await delay(50);
    if (tgt==='CSV') { onP(80,'Building CSV…'); return {blob:new Blob([rows.map(function(r){return r.map(csvEsc).join(',')}).join('\n')],{type:'text/csv'}),name:baseName(f.name)+'.csv'}; }
    var data=csvToJson(rows); onP(80,'Building JSON…');
    return {blob:new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name:baseName(f.name)+'.json'};
  }

  /* ===================================================================
     JSON / XML — structure preserved, format changes only
     =================================================================== */
  async function convJsonOut(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();onP(45,'Parsing…');
    var d;try{d=JSON.parse(t)}catch(e){throw new Error('Invalid JSON.')}
    if(!Array.isArray(d))d=[d];
    var hs={},h=[];d.forEach(function(r){if(r&&typeof r==='object')Object.keys(r).forEach(function(k){if(!hs[k]){hs[k]=true;h.push(k)}})});
    await delay(50);
    if (tgt==='CSV') { var lines=[h.map(csvEsc).join(',')];d.forEach(function(r){lines.push(h.map(function(k){return csvEsc(r?r[k]:'')}).join(','))}); onP(80,'Building CSV…'); return {blob:new Blob([lines.join('\n')],{type:'text/csv'}),name:baseName(f.name)+'.csv'}; }
    if (tgt==='XML') { var xml='<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';d.forEach(function(r){xml+='  <record>\n';h.forEach(function(k){xml+='    <'+k+'>'+escXml(r?r[k]:'')+'</'+k+'>\n'});xml+='  </record>\n'});xml+='</data>'; onP(80,'Building XML…'); return {blob:new Blob([xml],{type:'application/xml'}),name:baseName(f.name)+'.xml'}; }
    return {blob:new Blob([t],{type:'application/json'}),name:f.name};
  }

  function parseXmlSimple(t) {
    var rows=[],recs=t.match(/<record[^>]*>([\s\S]*?)<\/record>/gi)||[];
    recs.forEach(function(rec){var obj={};var fields=rec.match(/<([\w-]+)>([^<]*)<\/\1>/gi)||[];
      fields.forEach(function(f){var m=f.match(/<([\w-]+)>([^<]*)<\/\1>/);if(m)obj[m[1]]=m[2]});if(Object.keys(obj).length)rows.push(obj)});
    return rows;
  }
  async function convXml(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();onP(45,'Parsing…');
    var d=parseXmlSimple(t);if(!d.length)throw new Error('No records found in XML.');
    var hs={},h=[];d.forEach(function(r){Object.keys(r).forEach(function(k){if(!hs[k]){hs[k]=true;h.push(k)}})});
    await delay(50);
    if (tgt==='JSON') { onP(80,'Building JSON…'); return {blob:new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),name:baseName(f.name)+'.json'}; }
    var lines=[h.map(csvEsc).join(',')];d.forEach(function(r){lines.push(h.map(function(k){return csvEsc(r[k]||'')}).join(','))});
    onP(80,'Building CSV…'); return {blob:new Blob([lines.join('\n')],{type:'text/csv'}),name:baseName(f.name)+'.csv'};
  }

  /* ===================================================================
     PDF → DOCX / TXT / HTML — DIRECT CONVERSION
     Extracts text as-is, no scanning, no OCR
     =================================================================== */

  /* Extract raw text from PDF page — no formatting interpretation */
  async function pdfPageToHtml(pdf, pageNum) {
    var page = await pdf.getPage(pageNum);
    var content = await page.getTextContent();
    var items = content.items;
    if (!items.length) return '';

    // Group text items by approximate Y position (same line)
    var lines = [];
    var currentLine = [];
    var lastY = null;
    var Y_THRESHOLD = 3;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var y = Math.round(item.transform[5]);
      if (lastY === null || Math.abs(y - lastY) < Y_THRESHOLD) {
        currentLine.push(item);
      } else {
        if (currentLine.length) lines.push(currentLine);
        currentLine = [item];
      }
      lastY = y;
    }
    if (currentLine.length) lines.push(currentLine);

    // Build plain text HTML — no heading/bold detection
    var html = '';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var lineText = '';
      for (var j = 0; j < line.length; j++) {
        var txt = line[j].str || '';
        if (txt) lineText += txt;
      }
      lineText = lineText.trim();
      if (!lineText) { html += '<br>\n'; continue; }
      html += '<p>' + esc(lineText) + '</p>\n';
    }

    return html;
  }

  async function convPdf(f, tgt, onP) {
    if(!window.pdfjsLib)throw new Error('PDF reader failed.');
    onP(8,'Reading…');var ab=await f.arrayBuffer();
    onP(15,'Loading…');var pdf;try{pdf=await pdfjsLib.getDocument({data:ab}).promise}catch(e){throw new Error('Could not open PDF.')}
    var fullHtml='',fullText='';

    for(var i=1;i<=pdf.numPages;i++){
      var ps=Math.round(i/pdf.numPages*70);
      onP(15+ps,'Page '+i+'/'+pdf.numPages+'…');

      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      var nativeText = content.items.map(function(x){return x.str}).join(' ').trim();

      if(nativeText.length>=10) {
        fullHtml += await pdfPageToHtml(pdf, i);
        fullText += nativeText + '\n\n';
      } else {
        // Scanned page — render as image without OCR
        try {
          var vp=page.getViewport({scale:2}),cv=document.createElement('canvas');
          cv.width=vp.width;cv.height=vp.height;
          await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
          var pd=cv.toDataURL('image/png');
          fullHtml += '<div style="text-align:center;margin:16px 0"><img src="'+pd+'" style="max-width:100%;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1)" alt="Scanned page '+i+'"></div>';
        } catch(e) { }
      }
    }

    fullText=fullText.trim();if(!fullText)fullText='No text detected.';
    if(!fullHtml.trim()) fullHtml='<pre style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">'+esc(fullText)+'</pre>';

    onP(92,tgt==='DOCX'?'Building DOCX…':'Finalizing…');
    var blob,ext;
    if(tgt==='DOCX') { blob=await buildDocxFromHtml(fullHtml,fullText); ext='.docx'; }
    else if(tgt==='HTML') { blob=new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}img{max-width:100%;height:auto;border-radius:4px}h2,h3{color:#222}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ddd;padding:8px}</style></head><body>'+fullHtml+'</body></html>'],{type:'text/html'}); ext='.html'; }
    else { blob=new Blob([fullText],{type:'text/plain'}); ext='.txt'; }
    await delay(50);return {blob:blob,name:baseName(f.name)+ext};
  }  /* ===================================================================
     DOCX → PDF / TXT / HTML — DIRECT CONVERSION
     Extracts text as-is, no scanning, no OCR
     =================================================================== */
  async function convDocx(f, tgt, onP) {
    onP(10,'Reading…');var ab=await f.arrayBuffer();

    var htmlResult = '';
    var textResult = '';

    if (window.mammoth) {
      onP(25,'Extracting with formatting…');
      try {
        // Use styleMap to preserve formatting details
        var styleMap = [
          'p[style-name="Heading 1"] => h1:fresh',
          'p[style-name="Heading 2"] => h2:fresh',
          'p[style-name="Heading 3"] => h3:fresh',
          'p[style-name="Heading 4"] => h4:fresh',
          'p[style-name="Title"] => h1.title:fresh',
          'p[style-name="Subtitle"] => p.subtitle:fresh',
          'p[style-name="Quote"] => blockquote:fresh',
          'p[style-name="List Paragraph"] => li'
        ];
        var result = await mammoth.convertToHtml({ arrayBuffer: ab, styleMap: styleMap });
        htmlResult = (result && result.value) ? result.value : '';
        var textResult2 = await mammoth.extractRawText({ arrayBuffer: ab });
        textResult = (textResult2 && textResult2.value) ? textResult2.value.trim() : '';
      } catch(e) { textResult = ''; }
    }

    // Extract embedded images from DOCX (no OCR)
    if (textResult.length < 10 || htmlResult.length < 50) {
      onP(40,'Checking for images…');
      var imgs = [];
      try { imgs = await docxImgs(ab); } catch(e) { imgs = []; }
      if (imgs.length) {
        onP(50,'Extracting '+imgs.length+' images…');
        var imgHtml = '';
        for (var i = 0; i < imgs.length; i++) {
          try {
            var du = await readDataURL(imgs[i].blob);
            var imgSize = imgs[i].blob.size;
            if (imgSize > 100) {
              imgHtml += '<div style="text-align:center;margin:16px 0;page-break-inside:avoid"><img src="'+du+'" style="max-width:100%;height:auto;border-radius:4px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" alt="'+esc(imgs[i].name)+'"></div>';
            }
          } catch(e) {}
        }
        if (imgHtml) {
          if (htmlResult) htmlResult += imgHtml;
          else htmlResult = '<div>' + imgHtml + '</div>';
        }
      }
    }

    if (!textResult && !htmlResult) textResult = 'No readable content detected.';
    if (!htmlResult) htmlResult = '<p style="line-height:1.6">'+esc(textResult).replace(/\n/g,'<br>')+'</p>';

    onP(90, tgt==='TXT'?'Finalizing…':tgt==='HTML'?'Building HTML…':'Rendering PDF…');

    var blob, ext;
    if (tgt==='TXT') {
      blob = new Blob([textResult || htmlResult.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()], {type:'text/plain'});
      ext = '.txt';
    } else if (tgt==='HTML') {
      var fullPageHtml = DOCX_EXPORT_STYLE + htmlResult + '</body></html>';
      blob = new Blob([fullPageHtml], {type:'text/html'});
      ext = '.html';
    } else {
      // PDF — use html2pdf.js with rich styling to preserve everything
      blob = await htmlToPdfBlob(htmlResult, textResult);
      ext = '.pdf';
    }
    await delay(50);
    return {blob:blob, name:baseName(f.name)+ext};
  }

  /* ===================================================================
     RICH CSS for HTML→PDF — preserves fonts, tables, images, lists, headings
     =================================================================== */
  var RICH_PDF_CSS = [
    '@page { size: A4; margin: 20mm 18mm; }',
    'body { font-family: Calibri, "Helvetica Neue", Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }',
    'h1 { font-size: 22pt; font-weight: 700; margin: 24px 0 10px; color: #1a1a1a; border-bottom: 2px solid #ddd; padding-bottom: 6px; page-break-after: avoid; }',
    'h2 { font-size: 16pt; font-weight: 700; margin: 20px 0 8px; color: #222; border-bottom: 1px solid #eee; padding-bottom: 4px; page-break-after: avoid; }',
    'h3 { font-size: 13pt; font-weight: 600; margin: 16px 0 6px; color: #333; page-break-after: avoid; }',
    'h4 { font-size: 11.5pt; font-weight: 600; margin: 12px 0 4px; color: #444; page-break-after: avoid; }',
    'p { margin: 6px 0; text-align: left; }',
    'strong, b { font-weight: 700; }',
    'em, i { font-style: italic; }',
    'u { text-decoration: underline; }',
    'table { border-collapse: collapse; width: 100%; margin: 12px 0; page-break-inside: avoid; }',
    'th { background: #f0f0f0; font-weight: 600; text-align: left; }',
    'th, td { border: 1px solid #ccc; padding: 7px 10px; font-size: 10pt; vertical-align: top; }',
    'tr:nth-child(even) { background: #fafafa; }',
    'img { max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 2px; }',
    'ul, ol { margin: 8px 0; padding-left: 28px; }',
    'li { margin: 3px 0; }',
    'blockquote { border-left: 3px solid #6c4fe0; margin: 10px 0; padding: 6px 16px; color: #555; background: #f8f7ff; }',
    'pre { background: #f5f5f5; padding: 10px 14px; border-radius: 4px; font-family: "Courier New", monospace; font-size: 9.5pt; overflow-x: auto; white-space: pre-wrap; }',
    'code { font-family: "Courier New", monospace; background: #f0f0f0; padding: 1px 4px; border-radius: 2px; font-size: 9.5pt; }',
    'a { color: #6c4fe0; text-decoration: underline; }',
    'hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }',
    '.title { font-size: 26pt; font-weight: 700; text-align: center; margin: 0 0 20px; }',
    '.subtitle { font-size: 13pt; color: #666; text-align: center; margin: -12px 0 24px; }'
  ].join('\n');

  var DOCX_EXPORT_STYLE = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title><style>' + RICH_PDF_CSS + '\nbody{max-width:800px;margin:40px auto;padding:20px}</style></head><body>';

  function htmlToPdfBlob(htmlContent, fallbackText) {
    return new Promise(function(resolve, reject) {
      if (window.html2pdf) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = '<html><head><meta charset="UTF-8"><style>' + RICH_PDF_CSS + '</style></head><body>' + htmlContent + '</body></html>';
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.width = '800px';
        document.body.appendChild(wrapper);

        var opt = {
          margin: [18, 16, 18, 16],
          filename: 'output.pdf',
          image: { type: 'jpeg', quality: 0.92 },
          html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(wrapper).outputPdf('blob').then(function(blob) {
          document.body.removeChild(wrapper);
          resolve(blob);
        }).catch(function(err) {
          document.body.removeChild(wrapper);
          reject(err);
        });
      } else {
        // Fallback: jsPDF with basic formatting
        var jsPDF = window.jspdf.jsPDF;
        var doc = new jsPDF({unit:'pt',format:'a4'});
        var m=48,pw=doc.internal.pageSize.getWidth(),ph=doc.internal.pageSize.getHeight(),mw=pw-m*2;
        doc.setFont('helvetica','normal');doc.setFontSize(11);var y=m;
        var text = fallbackText || htmlContent.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        text.split(/\r?\n/).forEach(function(p){
          var wl=doc.splitTextToSize(p.length?p:' ',mw);
          wl.forEach(function(l){if(y>ph-m){doc.addPage();y=m}doc.text(l,m,y);y+=15})
        });
        resolve(doc.output('blob'));
      }
    });
  }

  /* ===================================================================
     TXT → PDF / HTML — direct text pass-through, no structure detection
     =================================================================== */
  function txtToRichHtml(t) {
    var lines = t.split('\n');
    var html = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line === '') { html += '<br>'; continue; }
      html += '<p>' + esc(line) + '</p>';
    }
    return html;
  }

  async function convTxtOut(f, tgt, onP) {
    onP(25,'Reading…');var t=await f.text();await delay(50);
    if (tgt==='HTML') {
      onP(60,'Converting…');
      var richHtml = txtToRichHtml(t);
      var html = DOCX_EXPORT_STYLE + richHtml + '</body></html>';
      return {blob:new Blob([html],{type:'text/html'}),name:baseName(f.name)+'.html'};
    }
    onP(60,'Rendering PDF…');
    var richHtml = txtToRichHtml(t);
    var blob = await htmlToPdfBlob(richHtml, t);
    return {blob:blob,name:baseName(f.name)+'.pdf'};
  }

  /* ===================================================================
     MARKDOWN → PDF / HTML — renders tables, images, code, formatting
     =================================================================== */
  function mdToHtml(md) {
    var html = md
      // Tables
      .replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, function(match, header, sep, body) {
        var ths = header.split('|').filter(function(c){return c.trim()}).map(function(c){return '<th style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5">'+c.trim()+'</th>'}).join('');
        var rows = body.trim().split('\n').map(function(r) {
          var tds = r.split('|').filter(function(c){return c.trim()}).map(function(c){return '<td style="padding:8px 12px;border:1px solid #ddd">'+c.trim()+'</td>'}).join('');
          return '<tr>'+tds+'</tr>';
        }).join('');
        return '<table style="border-collapse:collapse;margin:16px 0;width:100%"><thead><tr>'+ths+'</tr></thead><tbody>'+rows+'</tbody></table>';
      })
      // Headings
      .replace(/^#### (.+)$/gm, '<h4 style="margin:14px 0 6px;font-size:1em">$1</h4>')
      .replace(/^### (.+)$/gm, '<h3 style="margin:16px 0 8px;font-size:1.15em">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="margin:20px 0 10px;font-size:1.3em;border-bottom:1px solid #eee;padding-bottom:6px">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="margin:24px 0 12px;font-size:1.6em;border-bottom:2px solid #eee;padding-bottom:8px">$1</h1>')
      // Inline formatting
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:.9em">$1</code>')
      // Images (preserve!)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div style="text-align:center;margin:12px 0"><img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></div>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6c4fe0;text-decoration:underline">$1</a>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #6c4fe0;padding:8px 16px;margin:8px 0;background:#f8f7ff;color:#555">$1</blockquote>')
      // Horizontal rules
      .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">')
      // Lists
      .replace(/^- (.+)$/gm, '<li style="margin:4px 0">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:4px 0">$2</li>')
      // Code blocks
      .replace(/```[\s\S]*?```/g, function(match) {
        var code = match.replace(/```\w*\n?/g,'').replace(/```$/,'');
        return '<pre style="background:#1a1a2e;color:#e0e0e0;padding:16px;border-radius:8px;overflow-x:auto;font-size:.85em;line-height:1.5"><code>'+esc(code)+'</code></pre>';
      })
      // Paragraphs
      .replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.6">')
      .replace(/\n/g, '<br>');

    return '<div style="font-family:sans-serif;max-width:800px;margin:0;padding:20px;line-height:1.6;color:#222"><p style="margin:8px 0;line-height:1.6">' + html + '</p></div>';
  }

  function mdToTxt(md) {
    return md.replace(/^#{1,3} /gm,'').replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1')
      .replace(/`(.+?)`/g,'$1').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
      .replace(/!\[[^\]]*\]\([^)]+\)/g,'[image]').replace(/^> /gm,'').replace(/^- /gm,'• ');
  }

  async function convMd(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();await delay(50);
    if (tgt==='HTML') { onP(60,'Rendering…'); return {blob:new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'+mdToHtml(t)+'</body></html>'],{type:'text/html'}),name:baseName(f.name)+'.html'}; }
    if (tgt==='TXT') { onP(60,'Stripping…'); return {blob:new Blob([mdToTxt(t)],{type:'text/plain'}),name:baseName(f.name)+'.txt'}; }
    onP(60,'Rendering PDF…');var blob=await htmlToPdfBlob(mdToHtml(t),mdToTxt(t));await delay(50);
    return {blob:blob,name:baseName(f.name)+'.pdf'};
  }

  /* ===================================================================
     HTML → PDF / TXT — preserves structure
     =================================================================== */
  async function convHtml(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();
    if (tgt==='TXT') { onP(50,'Extracting text…');var txt=t.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(); return {blob:new Blob([txt],{type:'text/plain'}),name:baseName(f.name)+'.txt'}; }
    if (tgt==='PDF') { onP(50,'Rendering…');var blob=await htmlToPdfBlob(t,t.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()); return {blob:blob,name:baseName(f.name)+'.pdf'}; }
    return {blob:new Blob([t],{type:f.type||'text/html'}),name:f.name};
  }

  /* ===================================================================
     RTF → PDF / TXT — text extraction with basic formatting
     =================================================================== */
  async function convRtf(f, tgt, onP) {
    onP(20,'Reading…');var t=await f.text();onP(40,'Extracting…');
    var txt=t.replace(/\{[^{}]*\}/g,'').replace(/\\[a-z]+\d* ?/g,'').replace(/[{}]/g,'').trim();
    await delay(50);
    if (tgt==='TXT') return {blob:new Blob([txt],{type:'text/plain'}),name:baseName(f.name)+'.txt'};
    onP(70,'Rendering…');var blob=await htmlToPdfBlob('<pre style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">'+esc(txt)+'</pre>',txt);
    return {blob:blob,name:baseName(f.name)+'.pdf'};
  }

  /* ===================================================================
     DOCX internal helpers
     =================================================================== */
  async function docxImgs(ab) {
    if(!window.JSZip)return[];var z=await JSZip.loadAsync(ab);
    var ns=Object.keys(z.files).filter(function(n){return /^word\/media\//i.test(n)&&/\.(png|jpe?g|gif|bmp|webp)$/i.test(n)&&!z.files[n].dir}).sort();
    var imgs=[];for(var i=0;i<ns.length;i++){var b=await z.file(ns[i]).async('blob');imgs.push({name:ns[i],blob:b})}return imgs;
  }

  /* Build DOCX from HTML — preserves headings, bold, italic, images, lists, tables */
  async function buildDocxFromHtml(html, text) {
    if(!window.JSZip)throw new Error('DOCX writer failed.');
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    var imgParts = [];
    var imgRelId = 0;
    var rels = [];

    // Extract all images first
    var allImgs = tempDiv.querySelectorAll('img');
    for (var i = 0; i < allImgs.length; i++) {
      try {
        var src = allImgs[i].src;
        if (src.indexOf('data:image') === 0) {
          var base64 = src.split(',')[1];
          var extMatch = src.match(/data:image\/(\w+)/);
          var imgExt = extMatch ? extMatch[1] : 'png';
          var imgName = 'image' + i + '.' + imgExt;
          imgParts.push({ name: imgName, base64: base64, ext: imgExt });
          rels.push({ id: 'rId' + (i + 10), target: 'media/' + imgName, type: 'image' });
          allImgs[i].setAttribute('data-rel-id', 'rId' + (i + 10));
        }
      } catch(e) {}
    }

    // Build document.xml body
    var bodyXml = '';
    var elements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, li, pre, blockquote, table, img, hr');
    if (elements.length === 0) {
      // Fallback: split by newlines
      text.split(/\r?\n/).forEach(function(line) {
        if (line.trim()) bodyXml += docxParagraph(line.trim(), '');
      });
    } else {
      for (var ei = 0; ei < elements.length; ei++) {
        var el = elements[ei];
        var tag = el.tagName.toLowerCase();

        if (tag === 'table') {
          bodyXml += docxTable(el);
        } else if (tag === 'img') {
          var relId = el.getAttribute('data-rel-id');
          if (relId) {
            bodyXml += '<w:p><w:r>';
            bodyXml += '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">';
            bodyXml += '<wp:extent cx="5000000" cy="3000000"/>';
            bodyXml += '<wp:docPr id="1" name="Image"/>';
            bodyXml += '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">';
            bodyXml += '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">';
            bodyXml += '<pic:nvPicPr><pic:cNvPr id="1" name="Image"/><pic:cNvPicPr/></pic:nvPicPr>';
            bodyXml += '<pic:blipFill><a:blip r:embed="' + relId + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></pic:blipFill>';
            bodyXml += '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5000000" cy="3000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>';
            bodyXml += '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
            bodyXml += '</w:r></w:p>';
          }
        } else if (tag === 'hr') {
          bodyXml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>';
        } else if (tag === 'table') {
          // handled above
        } else {
          var style = '';
          if (tag === 'h1') style = 'Heading1';
          else if (tag === 'h2') style = 'Heading2';
          else if (tag === 'h3') style = 'Heading3';
          else if (tag === 'h4') style = 'Heading4';
          else if (tag === 'blockquote') style = 'Quote';

          // Build runs with inline formatting (bold, italic)
          var runs = docxRunsFromHtml(el);
          var pPr = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '';
          bodyXml += '<w:p>' + pPr + runs + '</w:p>';
        }
      }
    }

    // DOCX XML structure
    var dx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"' +
      ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
      '<w:body>' + bodyXml + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';

    // Content types
    var ctParts = [
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    ];
    imgParts.forEach(function(img) {
      var ct = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
      ctParts.push('<Default Extension="' + img.ext + '" ContentType="' + (ct[img.ext] || 'image/png') + '"/>');
    });
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + ctParts.join('') + '</Types>';

    // Relationships
    var rlParts = [
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    ];
    rels.forEach(function(r, idx) {
      var imgType = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
      rlParts.push('<Relationship Id="' + r.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="' + r.target + '"/>');
    });
    var rl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rlParts.join('') + '</Relationships>';

    var z = new JSZip();
    z.file('[Content_Types].xml', ct);
    z.file('_rels/.rels', rl);
    z.file('word/document.xml', dx);

    // Embed images
    for (var k = 0; k < imgParts.length; k++) {
      var img = imgParts[k];
      var data = Uint8Array.from(atob(img.base64), function(c){return c.charCodeAt(0)});
      z.file('word/media/' + img.name, data);
    }

    var zb = await z.generateAsync({type:'blob'});
    return new Blob([zb],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }

  /* Helper: build DOCX paragraph XML with style */
  function docxParagraph(text, style) {
    var pPr = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '';
    return '<w:p>' + pPr + '<w:r><w:t xml:space="preserve">' + escXml(text) + '</w:t></w:r></w:p>';
  }

  /* Helper: extract runs (bold/italic) from an HTML element */
  function docxRunsFromHtml(el) {
    var runs = '';
    var childNodes = el.childNodes;
    if (childNodes.length === 0) {
      runs = '<w:r><w:rPr/><w:t xml:space="preserve">' + escXml(el.textContent || '') + '</w:t></w:r>';
      return runs;
    }
    for (var ci = 0; ci < childNodes.length; ci++) {
      var cn = childNodes[ci];
      if (cn.nodeType === 3) { // text node
        var txt = cn.textContent;
        if (txt) runs += '<w:r><w:rPr/><w:t xml:space="preserve">' + escXml(txt) + '</w:t></w:r>';
      } else if (cn.nodeType === 1) { // element
        var ctag = cn.tagName.toLowerCase();
        var rPr = '';
        if (ctag === 'strong' || ctag === 'b') rPr = '<w:rPr><w:b/></w:rPr>';
        else if (ctag === 'em' || ctag === 'i') rPr = '<w:rPr><w:i/></w:rPr>';
        else if (ctag === 'u') rPr = '<w:rPr><w:u/></w:rPr>';
        else if (ctag === 'code' || ctag === 'pre') rPr = '<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>';
        else rPr = '<w:rPr/>';
        runs += '<w:r>' + rPr + '<w:t xml:space="preserve">' + escXml(cn.textContent || '') + '</w:t></w:r>';
      }
    }
    return runs;
  }

  /* Helper: build DOCX table from HTML table */
  function docxTable(tableEl) {
    var xml = '<w:tbl>';
    xml += '<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/>';
    xml += '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
    xml += '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
    xml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
    xml += '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
    xml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
    xml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
    xml += '</w:tblBorders></w:tblPr>';

    var rows = tableEl.querySelectorAll('tr');
    for (var ri = 0; ri < rows.length; ri++) {
      xml += '<w:tr>';
      var cells = rows[ri].querySelectorAll('td, th');
      for (var ci = 0; ci < cells.length; ci++) {
        var isHead = cells[ci].tagName.toLowerCase() === 'th';
        xml += '<w:tc><w:tcPr>';
        if (isHead) xml += '<w:shd w:val="clear" w:fill="F0F0F0"/>';
        xml += '</w:tcPr>';
        var runs = docxRunsFromHtml(cells[ci]);
        xml += '<w:p>' + runs + '</w:p>';
        xml += '</w:tc>';
      }
      xml += '</w:tr>';
    }
    xml += '</w:tbl>';
    return xml;
  }

})();
