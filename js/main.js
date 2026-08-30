/* ===== THEME ===== */
(function() {
  var btn = document.getElementById('themeToggle');
  var icon = document.getElementById('themeIcon');
  if (!btn || !icon) return;
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    icon.innerHTML = t === 'dark'
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
  apply(localStorage.getItem('fm-theme') || 'light');
  btn.addEventListener('click', function() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(t); localStorage.setItem('fm-theme', t);
  });
})();

/* ===== SCROLL REVEAL ===== */
(function() {
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(function(el) { obs.observe(el); });
})();

/* ===== COUNTER ANIMATION ===== */
(function() {
  setTimeout(function() {
    document.querySelectorAll('.counter').forEach(function(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      if (!target) return;
      var dur = 1200, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.floor(p * target);
        if (p < 1) requestAnimationFrame(step); else el.textContent = target;
      }
      requestAnimationFrame(step);
    });
  }, 300);
})();

/* ===== CAROUSEL ===== */
(function() {
  var track = document.querySelector('.carousel-track');
  var toggle = document.getElementById('ccToggle');
  if (!track) return;
  var paused = false;
  if (toggle) {
    toggle.addEventListener('click', function() {
      paused = !paused;
      if (paused) { track.classList.remove('move'); toggle.textContent = '▶ Play'; toggle.classList.remove('on'); }
      else { track.classList.add('move'); toggle.textContent = '⏸ Pause'; toggle.classList.add('on'); }
    });
  }
})();

/* ===== MOBILE NAV TOGGLE ===== */
(function() {
  var toggle = document.querySelector('.nav-mobile-toggle');
  var links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', function() {
    links.classList.toggle('nav-open');
  });
})();
