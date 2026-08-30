/* ===== FileMorph Transcription Engine v2 ===== */
(function() {
  "use strict";

  /* ===== DOM ===== */
  var trDrop = document.getElementById('trDrop');
  var trFI = document.getElementById('trFileInput');
  var trPl = document.getElementById('trPlayer');
  var trPB = document.getElementById('trPlayBtn');
  var trWC = document.getElementById('trWaveCanvas');
  var trTm = document.getElementById('trTime');
  var trActs = document.getElementById('trActions');
  var trSB = document.getElementById('trStartBtn');
  var trCB = document.getElementById('trCopyBtn');
  var trLn = document.getElementById('trLang');
  var trMeta = document.getElementById('trMeta');
  var trDot = document.getElementById('trDot');
  var trSt = document.getElementById('trStatus');
  var trWc = document.getElementById('trWords');
  var trOut = document.getElementById('trOutput');
  var trOrb = document.getElementById('trOrb');
  var trModeInfo = document.getElementById('trModeInfo');

  var audio = null, audioCtx = null, analyser = null, srcNode = null, waveAnim = null;
  var recog = null, isRec = false, finalT = '', interimT = '', startTime = 0;
  var mode = 'file'; // 'file' or 'mic'

  /* ===== DROP ===== */
  trDrop.addEventListener('click', function(){ trFI.click(); });
  trDrop.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();trFI.click();} });
  ['dragenter','dragover'].forEach(function(ev){
    trDrop.addEventListener(ev, function(e){e.preventDefault(); trDrop.classList.add('active');});
  });
  ['dragleave','drop'].forEach(function(ev){
    trDrop.addEventListener(ev, function(e){e.preventDefault(); trDrop.classList.remove('active');});
  });
  trDrop.addEventListener('drop', function(e){
    if(e.dataTransfer.files && e.dataTransfer.files.length) loadAudio(e.dataTransfer.files[0]);
  });
  trFI.addEventListener('change', function(e){
    if(e.target.files && e.target.files.length) loadAudio(e.target.files[0]);
    trFI.value = '';
  });

  /* ===== MIC / FILE MODE TOGGLE ===== */
  var micBtn = document.getElementById('trMicMode');
  var fileBtn = document.getElementById('trFileMode');
  if (micBtn) micBtn.addEventListener('click', function(){
    mode = 'mic';
    micBtn.classList.add('active');
    fileBtn.classList.remove('active');
    trDrop.style.display = 'none';
    trPl.classList.add('hidden');
    trActs.style.display = 'flex';
    trMeta.style.display = 'flex';
    trSt.textContent = 'Microphone mode — click Start Transcribing';
    trOut.innerHTML = '<span class="ph">Click Start to transcribe your voice live…</span>';
    updateModeInfo();
  });
  if (fileBtn) fileBtn.addEventListener('click', function(){
    mode = 'file';
    fileBtn.classList.add('active');
    micBtn.classList.remove('active');
    trDrop.style.display = '';
    if (!audio) {
      trActs.style.display = 'none';
      trMeta.style.display = 'none';
      trPl.classList.add('hidden');
    }
    updateModeInfo();
  });

  function updateModeInfo() {
    if (!trModeInfo) return;
    if (mode === 'mic') {
      trModeInfo.innerHTML = '<span class="tr-mode-icon">🎤</span><div><strong>Live Microphone Mode</strong> — Speak directly into your mic. The browser transcribes your speech in real-time using the Web Speech API. Best in Chrome/Edge with a good microphone.</div>';
      trModeInfo.style.display = 'flex';
    } else {
      trModeInfo.innerHTML = '<span class="tr-mode-icon">🔊</span><div><strong>File Mode</strong> — Upload an audio file. It plays through your speakers while the microphone captures and transcribes the audio. Ensure your volume is up and ambient noise is low.</div>';
      trModeInfo.style.display = 'flex';
    }
  }

  /* ===== LOAD AUDIO (FILE MODE) ===== */
  function loadAudio(f) {
    if (audio) { audio.pause(); if(audioCtx) try{audioCtx.close();}catch(e){} }
    stopRec();
    finalT = ''; interimT = '';
    trOut.innerHTML = '<span class="ph">Transcription will appear here…</span>';
    trCB.style.display = 'none';
    trMeta.style.display = 'none';
    trWc.textContent = '';

    audio = new Audio();
    audio.src = URL.createObjectURL(f);
    audio.preload = 'auto';

    audio.addEventListener('loadedmetadata', function() {
      trPl.classList.remove('hidden');
      trActs.style.display = 'flex';
      trMeta.style.display = 'flex';
      trSt.textContent = 'Ready — click Start Transcribing';
      trTm.textContent = fmtT(0) + ' / ' + fmtT(audio.duration);
      setupVis();
    });
    audio.addEventListener('timeupdate', function() {
      if (audio) trTm.textContent = fmtT(audio.currentTime) + ' / ' + fmtT(audio.duration);
    });
    audio.addEventListener('ended', function() {
      trPB.textContent = '▶';
      if (isRec) stopRec();
    });
  }

  /* ===== WAVEFORM VISUALIZER ===== */
  function setupVis() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (audioCtx) try { audioCtx.close(); } catch(e) {}
    audioCtx = new AC();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    srcNode = audioCtx.createMediaElementSource(audio);
    srcNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawWave();
  }

  function drawWave() {
    if (!analyser || !trWC) return;
    var cv = trWC, rect = cv.parentElement.getBoundingClientRect();
    cv.width = rect.width * 2; cv.height = rect.height * 2;
    var ctx = cv.getContext('2d');
    var data = new Uint8Array(analyser.frequencyBinCount);
    var cs = getComputedStyle(document.documentElement);
    var acc = cs.getPropertyValue('--accent').trim() || '#6c4fe0';
    var tcc = cs.getPropertyValue('--teal').trim() || '#00bfa5';

    function draw() {
      waveAnim = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var bw = cv.width / data.length * 2.5, x = 0;
      for (var i = 0; i < data.length; i++) {
        var h = (data[i] / 255) * cv.height * 0.8;
        var g = ctx.createLinearGradient(x, cv.height, x, cv.height - h);
        g.addColorStop(0, tcc); g.addColorStop(1, acc);
        ctx.fillStyle = g;
        ctx.fillRect(x, cv.height - h, bw - 2, h);
        x += bw;
        if (x > cv.width) break;
      }
    }
    draw();
  }

  /* ===== MIC WAVEFORM ===== */
  var micStream = null, micAnalyser = null, micAnim = null;
  function startMicVis() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !micStream) return;
    audioCtx = new AC();
    micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 128;
    var src = audioCtx.createMediaStreamSource(micStream);
    src.connect(micAnalyser);

    var cv = trWC;
    var rect = cv.parentElement.getBoundingClientRect();
    cv.width = rect.width * 2; cv.height = rect.height * 2;
    var ctx = cv.getContext('2d');
    var data = new Uint8Array(micAnalyser.frequencyBinCount);
    var cs = getComputedStyle(document.documentElement);
    var acc = cs.getPropertyValue('--accent').trim() || '#6c4fe0';
    var tcc = cs.getPropertyValue('--teal').trim() || '#00bfa5';

    function draw() {
      micAnim = requestAnimationFrame(draw);
      micAnalyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var bw = cv.width / data.length * 2.5, x = 0;
      for (var i = 0; i < data.length; i++) {
        var h = (data[i] / 255) * cv.height * 0.8;
        var g = ctx.createLinearGradient(x, cv.height, x, cv.height - h);
        g.addColorStop(0, tcc); g.addColorStop(1, acc);
        ctx.fillStyle = g;
        ctx.fillRect(x, cv.height - h, bw - 2, h);
        x += bw;
        if (x > cv.width) break;
      }
    }
    draw();
  }

  function stopMicVis() {
    if (micAnim) { cancelAnimationFrame(micAnim); micAnim = null; }
    if (micStream) { micStream.getTracks().forEach(function(t){t.stop();}); micStream = null; }
    if (audioCtx && mode === 'mic') { try { audioCtx.close(); } catch(e) {} audioCtx = null; }
    // Clear canvas
    if (trWC) {
      var ctx = trWC.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, trWC.width, trWC.height);
    }
  }

  /* ===== PLAY/PAUSE ===== */
  trPB.addEventListener('click', function() {
    if (!audio) return;
    if (audio.paused) {
      audio.play(); trPB.textContent = '⏸';
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } else {
      audio.pause(); trPB.textContent = '▶';
    }
  });

  /* ===== SPEECH RECOGNITION ===== */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (trSB) {
      trSB.disabled = true;
      trSB.textContent = 'Not Supported in This Browser';
    }
    if (trOut) trOut.innerHTML = '<span class="ph">⚠️ Speech Recognition is not supported. Please use Chrome or Edge browser.</span>';
  } else {
    trSB.addEventListener('click', function() { isRec ? stopRec() : startRec(); });
    trCB.addEventListener('click', function() {
      var t = finalT.trim();
      if (!t) return;
      navigator.clipboard.writeText(t).then(function() {
        var orig = trCB.innerHTML;
        trCB.innerHTML = '✓ Copied!';
        setTimeout(function(){ trCB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy Text'; }, 1500);
      });
    });

    /* Hindi/Indic font toggle */
    function updateFont() {
      var lang = trLn.value;
      var isIndic = /hi|bn|ta|te|mr|gu|kn|ml|pa|ur|ne|si|my/.test(lang);
      trOut.classList.toggle('tr-output-hi', isIndic);
      var isArabic = /ar|fa|ur/.test(lang);
      trOut.classList.toggle('tr-output-ar', isArabic);
      var isCJK = /zh|ja|ko/.test(lang);
      trOut.classList.toggle('tr-output-cjk', isCJK);
    }
    trLn.addEventListener('change', updateFont);
    updateFont();

    function startRec() {
      finalT = ''; interimT = '';

      if (mode === 'mic') {
        // MIC MODE: use microphone directly
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
          micStream = stream;
          startMicVis();
          launchRecognition(stream);
        }).catch(function(err) {
          console.error('Mic access denied:', err);
          trSt.textContent = '⚠️ Microphone access denied — please allow mic access and try again.';
          trOut.innerHTML = '<span class="ph">⚠️ Could not access microphone. Please allow microphone permission in your browser and try again.</span>';
        });
      } else {
        // FILE MODE: play audio, mic picks up speaker output
        if (!audio) { alert('Please load an audio file first.'); return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
          micStream = stream;
          startMicVis();
          if (audio.paused) audio.play();
          trPB.textContent = '⏸';
          launchRecognition(stream);
        }).catch(function(err) {
          console.error('Mic access needed for file transcription:', err);
          trSt.textContent = '⚠️ Microphone required — it captures audio from your speakers.';
          trOut.innerHTML = '<span class="ph">⚠️ Microphone access is required for file transcription. The browser plays the audio through speakers and the mic captures it for transcription.<br><br>Please allow microphone permission and try again.</span>';
        });
      }
    }

    function launchRecognition(stream) {
      recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = trLn.value;
      recog.maxAlternatives = 1;

      recog.onstart = function() {
        isRec = true;
        trSB.innerHTML = '⏹ Stop Transcribing';
        trSB.classList.remove('go');
        trSB.classList.add('sec');
        trDot.classList.add('live');
        trSt.textContent = 'Transcribing…';
        trOrb.classList.add('rec');
        trOut.innerHTML = '';
        startTime = Date.now();
        if (mode === 'mic') {
          trPl.classList.remove('hidden');
          startTimer();
        }
      };

      recog.onresult = function(ev) {
        interimT = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalT += ev.results[i][0].transcript + ' ';
          else interimT += ev.results[i][0].transcript;
        }
        renderOut();
      };

      recog.onerror = function(ev) {
        console.error('Speech recognition error:', ev.error);
        if (ev.error === 'no-speech') {
          trSt.textContent = 'No speech detected — keep talking or check your audio.';
        } else if (ev.error === 'audio-capture') {
          trSt.textContent = '⚠️ No microphone detected — please connect a microphone.';
        } else if (ev.error === 'not-allowed') {
          trSt.textContent = '⚠️ Microphone permission denied — allow access in browser settings.';
        } else if (ev.error === 'network') {
          trSt.textContent = '⚠️ Network error — Web Speech API requires internet connection.';
        } else {
          trSt.textContent = 'Error: ' + ev.error;
        }
      };

      recog.onend = function() {
        if (isRec) {
          // Auto-restart if still recording
          try {
            recog.start();
          } catch(e) {
            stopRec();
          }
        }
      };

      try {
        recog.start();
      } catch(e) {
        trSt.textContent = 'Could not start recognition — ' + e.message;
      }
    }

    var timerInterval = null;
    function startTimer() {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(function() {
        if (audio && trTm) trTm.textContent = fmtT(audio.currentTime) + ' / ' + fmtT(audio.duration);
      }, 250);
    }

    function stopRec() {
      isRec = false;
      if (recog) try { recog.stop(); } catch(e) {}
      recog = null;
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      stopMicVis();
      if (audio && mode === 'file') { audio.pause(); trPB.textContent = '▶'; }
      trSB.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>Start Transcribing';
      trSB.classList.remove('sec');
      trSB.classList.add('go');
      trDot.classList.remove('live');
      trOrb.classList.remove('rec');
      var elapsed = fmtT((Date.now() - startTime) / 1000);
      trSt.textContent = 'Done — transcribed in ' + elapsed;
      renderOut();
    }

    function renderOut() {
      var full = finalT.trim();
      var wc = full ? full.split(/\s+/).length : 0;
      trWc.textContent = wc ? wc + ' word' + (wc !== 1 ? 's' : '') : '';
      if (!full && !interimT) {
        trOut.innerHTML = '<span class="ph">Listening…</span>';
      } else {
        var h = '';
        if (full) h += '<span class="tr-final">' + esc(full) + '</span>';
        if (interimT) h += '<span class="tr-interim">' + esc(interimT) + '</span>';
        if (isRec) h += '<span class="blink"></span>';
        trOut.innerHTML = h;
        trOut.scrollTop = trOut.scrollHeight;
      }
      if (full) trCB.style.display = 'inline-flex';
    }
  }

  /* ===== HELPERS ===== */
  function fmtT(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ===== INIT ===== */
  updateModeInfo();

})();
