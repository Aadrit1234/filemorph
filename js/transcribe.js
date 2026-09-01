/* ═══════════════════════════════════════════════════════════
   FILEMORPH — Audio Transcription Logic
   Mode switcher (Live Mic / Audio File), Hindi support
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ───
  let recognition = null;
  let isRecording = false;
  let selectedLang = 'en-US';
  let transcriptParts = [];
  let isTranscribingFile = false;
  let activeMode = 'mic'; // 'mic' or 'file'

  // ─── DOM Elements ───
  const modeMicBtn = document.getElementById('modeMicBtn');
  const modeFileBtn = document.getElementById('modeFileBtn');
  const modeSlider = document.getElementById('modeSlider');
  const panelMic = document.getElementById('panelMic');
  const panelFile = document.getElementById('panelFile');
  const micButton = document.getElementById('micButton');
  const micStatus = document.getElementById('micStatus');
  const transcriptText = document.getElementById('transcriptText');
  const copyBtn = document.getElementById('copyTranscript');
  const downloadBtn = document.getElementById('downloadTranscript');
  const clearBtn = document.getElementById('clearTranscript');
  const languageSelector = document.getElementById('languageSelector');
  const audioDropZone = document.getElementById('audioDropZone');
  const audioFileInput = document.getElementById('audioFileInput');
  const audioPlayer = document.getElementById('audioPlayer');
  const audioElement = document.getElementById('audioElement');
  const audioFileName = document.getElementById('audioFileName');
  const audioFileSize = document.getElementById('audioFileSize');
  const transcribeAudioBtn = document.getElementById('transcribeAudioBtn');

  // ─── Check for Speech Recognition Support ───
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  if (!isSpeechSupported) {
    if (micStatus) {
      micStatus.innerHTML = '⚠️ Speech recognition is not supported in this browser. Please use Chrome or Edge.';
      micStatus.style.color = '#f87171';
    }
    if (micButton) {
      micButton.style.opacity = '0.5';
      micButton.style.cursor = 'not-allowed';
    }
  }

  // ═══════════════════════════════════════════════════════
  // MODE SWITCHER
  // ═══════════════════════════════════════════════════════

  function switchMode(mode) {
    if (mode === activeMode) return;

    // Stop any active recording first
    if (isRecording) {
      stopRecording();
    }

    activeMode = mode;

    // Update toggle buttons
    modeMicBtn.classList.toggle('active', mode === 'mic');
    modeFileBtn.classList.toggle('active', mode === 'file');

    // Slide the indicator
    modeSlider.classList.toggle('file-active', mode === 'file');

    // Show/hide panels
    panelMic.classList.toggle('active', mode === 'mic');
    panelFile.classList.toggle('active', mode === 'file');

    // Reset status text
    if (micStatus) {
      micStatus.textContent = mode === 'mic'
        ? 'Click the microphone to start'
        : 'Upload an audio file to begin';
    }
  }

  if (modeMicBtn) {
    modeMicBtn.addEventListener('click', () => switchMode('mic'));
  }

  if (modeFileBtn) {
    modeFileBtn.addEventListener('click', () => switchMode('file'));
  }

  // ═══════════════════════════════════════════════════════
  // SPEECH RECOGNITION
  // ═══════════════════════════════════════════════════════

  function initRecognition() {
    if (!SpeechRecognition) return null;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = selectedLang;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      isRecording = true;
      micButton.classList.add('recording');
      micStatus.textContent = isTranscribingFile ? '🎧 Transcribing audio file...' : '🔴 Recording... Click to stop';
    };

    recog.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        transcriptParts.push(finalTranscript.trim());
      }

      renderTranscript(
        finalTranscript ? transcriptParts.join(' ') : transcriptParts.join(' '),
        interimTranscript
      );
    };

    recog.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        micStatus.textContent = '🤫 No speech detected. Try speaking louder.';
      } else if (event.error === 'audio-capture') {
        micStatus.textContent = '🎤 Microphone not found.';
      } else if (event.error === 'not-allowed') {
        micStatus.textContent = '🚫 Microphone access denied.';
      } else if (event.error !== 'aborted') {
        micStatus.textContent = '⚠️ Error: ' + event.error + '. Click to try again.';
      }
    };

    recog.onend = () => {
      isRecording = false;
      micButton.classList.remove('recording');

      // If transcribing a file and audio is still playing, restart
      if (isTranscribingFile && audioElement && !audioElement.paused) {
        try { recog.start(); } catch (e) { /* already started */ }
      } else {
        isTranscribingFile = false;
        micStatus.textContent = '✅ Transcription complete';
      }
    };

    return recog;
  }

  function startRecording() {
    transcriptParts = [];
    recognition = initRecognition();
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        micStatus.textContent = '⚠️ Failed to start. Please try again.';
      }
    }
  }

  function stopRecording() {
    if (recognition) {
      isTranscribingFile = false;
      if (audioElement) audioElement.pause();
      recognition.stop();
    }
  }

  // ─── Render Transcript ───
  function renderTranscript(finalText, interimText) {
    if (!transcriptText) return;

    let html = '';

    if (finalText) {
      html += '<span style="color: var(--text-primary);">' + escapeHtml(finalText) + '</span>';
    }

    if (interimText) {
      html += '<span style="color: var(--clay-purple); opacity: 0.7;">' + escapeHtml(interimText) + '</span><span class="typing-cursor"></span>';
    }

    if (!html) {
      html = '<span style="color: var(--text-light); font-style: italic;">Listening...</span>';
    }

    transcriptText.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════
  // LIVE MIC MODE
  // ═══════════════════════════════════════════════════════

  if (micButton && isSpeechSupported) {
    micButton.addEventListener('click', () => {
      if (activeMode !== 'mic') return;
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // AUDIO FILE MODE
  // ═══════════════════════════════════════════════════════

  if (audioDropZone && audioFileInput) {
    ['dragenter', 'dragover'].forEach(function(evt) {
      audioDropZone.addEventListener(evt, function(e) {
        e.preventDefault();
        e.stopPropagation();
        audioDropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(function(evt) {
      audioDropZone.addEventListener(evt, function(e) {
        e.preventDefault();
        e.stopPropagation();
        audioDropZone.classList.remove('drag-over');
      });
    });

    audioDropZone.addEventListener('drop', function(e) {
      var files = e.dataTransfer.files;
      if (files.length > 0) handleAudioFile(files[0]);
    });

    audioDropZone.addEventListener('click', function() {
      audioFileInput.click();
    });

    audioFileInput.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        handleAudioFile(e.target.files[0]);
      }
    });
  }

  function handleAudioFile(file) {
    var url = URL.createObjectURL(file);
    audioElement.src = url;
    audioFileName.textContent = file.name;
    audioFileSize.textContent = formatFileSize(file.size);
    audioPlayer.classList.add('active');
    audioDropZone.style.display = 'none';

    if (window.showToast) {
      window.showToast('Audio file loaded!', 'success');
    }
  }

  if (transcribeAudioBtn) {
    transcribeAudioBtn.addEventListener('click', function() {
      if (!audioElement.src) return;

      if (!isSpeechSupported) {
        if (window.showToast) {
          window.showToast('Speech recognition not supported in this browser', 'error');
        }
        return;
      }

      if (isRecording) {
        // Stop transcription
        isTranscribingFile = false;
        audioElement.pause();
        if (recognition) recognition.stop();
        transcribeAudioBtn.textContent = '🎤 Transcribe This Audio';
        return;
      }

      // Start transcription
      isTranscribingFile = true;
      transcriptParts = [];
      transcribeAudioBtn.textContent = '⏹️ Stop Transcription';

      audioElement.currentTime = 0;
      audioElement.play();

      recognition = initRecognition();
      if (recognition) {
        try { recognition.start(); } catch (e) {
          console.error('Failed to start recognition for file:', e);
          micStatus.textContent = '⚠️ Failed to start transcription.';
        }
      }

      audioElement.onended = function() {
        isTranscribingFile = false;
        if (recognition) {
          setTimeout(function() {
            try { recognition.stop(); } catch(e) {}
          }, 1000);
        }
        transcribeAudioBtn.textContent = '🎤 Transcribe This Audio';
        micStatus.textContent = '✅ File transcription complete';
      };
    });
  }

  // ═══════════════════════════════════════════════════════
  // LANGUAGE SELECTION
  // ═══════════════════════════════════════════════════════

  if (languageSelector) {
    languageSelector.addEventListener('click', function(e) {
      var btn = e.target.closest('.lang-btn');
      if (!btn) return;

      languageSelector.querySelectorAll('.lang-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedLang = btn.dataset.lang;

      // If recording, restart with new language
      if (isRecording && recognition) {
        recognition.stop();
        setTimeout(function() {
          recognition = initRecognition();
          if (recognition) {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }
        }, 200);
      }

      if (window.showToast) {
        window.showToast('Language set to ' + (btn.dataset.label || selectedLang), 'info');
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // TRANSCRIPT CONTROLS
  // ═══════════════════════════════════════════════════════

  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var text = transcriptParts.join(' ');
      if (!text.trim()) {
        if (window.showToast) window.showToast('No transcript to copy', 'info');
        return;
      }

      navigator.clipboard.writeText(text).then(function() {
        if (window.showToast) window.showToast('Copied to clipboard!', 'success');
      }).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (window.showToast) window.showToast('Copied to clipboard!', 'success');
      });
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      var text = transcriptParts.join(' ');
      if (!text.trim()) {
        if (window.showToast) window.showToast('No transcript to download', 'info');
        return;
      }

      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'transcript_' + new Date().toISOString().slice(0,10) + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.showToast) window.showToast('Transcript downloaded!', 'success');
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      transcriptParts = [];
      if (transcriptText) transcriptText.innerHTML = '';
      micStatus.textContent = activeMode === 'mic'
        ? 'Click the microphone to start'
        : 'Upload an audio file to begin';
      if (window.showToast) window.showToast('Transcript cleared', 'info');
    });
  }

  // ═══════════════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════════════

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

})();
