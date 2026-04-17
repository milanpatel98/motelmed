/**
 * mm-menu-premium.js (home index)
 *
 * - Moves nav inside the fixed topbar.
 * - On menu open: the real .mm-topbar__logo node moves into #mm-nav-brand-row
 *   so it sits to the left of "Motel Mediteran" / "Escondido, California".
 * - On close: logo is returned to .mm-topbar__brand (before .mm-topbar__loc).
 * - Removes legacy injected topbar wordmark wrapper if present.
 */

(function () {
  'use strict';

  var nav = document.getElementById('mm-site-nav');
  var menuBtn = document.getElementById('mm-menu-btn');

  if (!nav || !menuBtn) return;

  var topbar = document.querySelector('header.mm-topbar');
  var brand = topbar && topbar.querySelector('.mm-topbar__brand');
  var brandRow = document.getElementById('mm-nav-brand-row');
  var logo = brand && brand.querySelector('.mm-topbar__logo');

  function unwrapLegacyTopbarWordmark() {
    if (!brand) return;
    var wrap = brand.querySelector('.mm-topbar__brand-labels');
    if (!wrap) return;
    var loc = wrap.querySelector('.mm-topbar__loc');
    if (loc) {
      brand.insertBefore(loc, wrap);
    }
    wrap.remove();
  }

  function moveLogoIntoMenu() {
    if (!logo || !brandRow) return;
    if (logo.parentElement === brandRow) return;
    brandRow.insertBefore(logo, brandRow.firstChild);
    logo.classList.add('mm-topbar__logo--in-nav');
  }

  function moveLogoBackToTopbar() {
    if (!logo || !brand) return;
    if (logo.parentElement === brand) return;
    logo.classList.remove('mm-topbar__logo--in-nav');
    var loc = brand.querySelector('.mm-topbar__loc');
    if (loc) {
      brand.insertBefore(logo, loc);
    } else {
      brand.appendChild(logo);
    }
  }

  (function initDom() {
    if (topbar && nav.parentElement !== topbar) {
      topbar.appendChild(nav);
    }
    unwrapLegacyTopbarWordmark();
  })();

  function calcPanelH() {
    var vh = window.innerHeight;
    var isMobile = window.innerWidth < 720;
    var topbarH =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--mm-topbar-h')
      ) || 88;

    var ratio = isMobile ? 0.78 : 0.62;
    var minH = isMobile ? 380 : 360;
    var maxH = isMobile ? 520 : 600;

    return Math.round(
      Math.min(Math.max(minH, vh * ratio), maxH, vh - topbarH - 80)
    );
  }

  function applyPanelH() {
    var h = calcPanelH();
    document.documentElement.style.setProperty('--mm-menu-h', h + 'px');
    nav.style.height = h + 'px';
  }

  applyPanelH();

  function openMenu() {
    var wasScrolled = document.body.classList.contains('is-scrolled');
    document.body.classList.toggle('mm-nav-solid-topbar', wasScrolled);

    applyPanelH();

    nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');
    /* Move logo BEFORE body.mm-nav-open — avoids legacy rules that hid/faded the brand link while the logo still lived there. */
    moveLogoIntoMenu();
    document.body.classList.add('mm-nav-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');

    var firstLink = nav.querySelector('.mm-nav__col--primary a');
    if (firstLink) {
      setTimeout(function () {
        firstLink.focus({ preventScroll: true });
      }, 740);
    }
  }

  function closeMenu() {
    document.body.classList.remove('mm-nav-open');
    moveLogoBackToTopbar();
    nav.classList.remove('is-open');
    nav.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mm-nav-solid-topbar');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    menuBtn.focus({ preventScroll: true });
  }

  menuBtn.addEventListener('click', function () {
    if (nav.classList.contains('is-open')) closeMenu();
    else openMenu();
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeMenu();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu();
  });

  var resizeTimer;
  window.addEventListener(
    'resize',
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyPanelH, 120);
    },
    { passive: true }
  );
})();
