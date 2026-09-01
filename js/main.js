/* ═══════════════════════════════════════════════════════════
   FILEMORPH — Main JavaScript
   Navigation, scroll animations, 3D tilt effects, toasts
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Mobile Nav Toggle ───
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      navToggle.innerHTML = navLinks.classList.contains('open') ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
      if (window.lucide) lucide.createIcons();
    });

    // Close nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.innerHTML = '<i data-lucide="menu"></i>';
        if (window.lucide) lucide.createIcons();
      });
    });

    // Close nav when tapping outside
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        navLinks.classList.remove('open');
        navToggle.innerHTML = '<i data-lucide="menu"></i>';
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // ─── Theme Toggle ───
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;

  function setTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      if (themeToggle) themeToggle.innerHTML = '<i data-lucide="sun"></i>';
    } else {
      root.removeAttribute('data-theme');
      if (themeToggle) themeToggle.innerHTML = '<i data-lucide="moon"></i>';
    }
    localStorage.setItem('theme', theme);
    if (window.lucide) lucide.createIcons();
  }

  // Apply saved theme on load
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      setTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  // ─── Scroll Progress Bar ───
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollProgress.style.width = progress + '%';
    }, { passive: true });
  }

  // ─── Scroll Reveal Animations ───
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -30px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Force reveal elements already in viewport on load
    setTimeout(() => {
      revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 50) {
          el.classList.add('visible');
        }
      });
    }, 100);
  }

  // ─── 3D Tilt Effect on Cards ───
  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  // ─── Navbar background on scroll ───
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 100) {
        navbar.style.background = 'rgba(240, 235, 230, 0.95)';
      } else {
        navbar.style.background = 'rgba(240, 235, 230, 0.85)';
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ─── Page Transitions ───
  const pageTransition = document.getElementById('pageTransition');
  if (pageTransition) {
    // Entry animation
    setTimeout(() => {
      pageTransition.style.transformOrigin = 'top';
      pageTransition.style.transform = 'scaleY(0)';
    }, 100);

    // Exit animation on link click
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html') && !href.startsWith('http')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          pageTransition.style.transformOrigin = 'bottom';
          pageTransition.classList.add('active');
          setTimeout(() => {
            window.location.href = href;
          }, 400);
        });
      }
    });
  }

  // ─── Toast Notification System ───
  window.showToast = function(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

    // Force reflow then show
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  };

  // ─── Smooth parallax on blobs (skip on mobile for performance) ───
  const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  if (!isMobile) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const orbs = document.querySelectorAll('.orb');
          orbs.forEach((orb, i) => {
            const speed = 0.03 + (i * 0.015);
            orb.style.transform = `translateY(${scrollY * speed}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ─── Dynamic year in footer ───
  const yearSpans = document.querySelectorAll('.current-year');
  yearSpans.forEach(span => {
    span.textContent = new Date().getFullYear();
  });

})();
