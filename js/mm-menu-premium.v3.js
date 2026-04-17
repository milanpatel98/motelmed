/**
 * mm-menu-premium.js (home index)
 *
 * - Moves nav inside the fixed topbar.
 * - Garage shutter: panel translateY matches #main + topbar min-height (CSS vars).
 * - Logo moves into the panel before the shutter opens so it rides down with the plane;
 *   on close, logo returns after the panel transform ends (no teleport mid-motion).
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
  var menuState = 'closed';
  var openDoneTimer = null;
  var logoFlightToken = 0;
  var lastFocusedBeforeOpen = null;
  /** @type {number | null} */
  var menuScrollLockY = null;

  /* Bumps when opening — invalidates pending “close shutter finished” callbacks */
  var shutterEpoch = 0;

  var closePanelHandler = null;
  var closeFallbackTimer = null;

  function scrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  /** Restore scroll without smooth scrolling (site.css may set `html { scroll-behavior: smooth }`). */
  function scrollToRestore(y) {
    var root = document.documentElement;
    var prevRoot = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    if (Math.abs(window.scrollY - y) > 1) {
      root.scrollTop = y;
      document.body.scrollTop = y;
    }
    requestAnimationFrame(function () {
      root.style.scrollBehavior = prevRoot;
    });
  }

  function lockBodyScroll() {
    if (menuScrollLockY !== null) return;
    menuScrollLockY = window.scrollY || window.pageYOffset || 0;
    var y = menuScrollLockY;
    var sbw = scrollbarWidth();
    if (sbw > 0) {
      document.body.style.paddingRight = sbw + 'px';
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + y + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockBodyScroll() {
    if (menuScrollLockY === null) return;
    var y = menuScrollLockY;
    menuScrollLockY = null;
    document.body.style.paddingRight = '';
    document.documentElement.style.overflow = '';
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    document.body.style.removeProperty('right');
    document.body.style.removeProperty('width');
    scrollToRestore(y);
  }

  function clearCloseShutterWatch() {
    var panel = nav.querySelector('.mm-nav__panel');
    if (panel && closePanelHandler) {
      panel.removeEventListener('transitionend', closePanelHandler);
      closePanelHandler = null;
    }
    if (closeFallbackTimer != null) {
      window.clearTimeout(closeFallbackTimer);
      closeFallbackTimer = null;
    }
    if (openDoneTimer != null) {
      window.clearTimeout(openDoneTimer);
      openDoneTimer = null;
    }
  }

  function parseDurationMs(prop, fallbackSeconds) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    if (!raw) return Math.round(fallbackSeconds * 1000);
    var v = parseFloat(raw);
    if (/ms$/i.test(raw)) return Math.round(v);
    return Math.round(v * 1000);
  }

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
    document.body.classList.add('mm-logo-in-nav');
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
    document.body.classList.remove('mm-logo-in-nav');
  }

  function runLogoFlight(beforeMove, durationVar, fallbackSeconds) {
    if (!logo) {
      beforeMove();
      return;
    }

    logo.classList.remove('mm-topbar__logo--flying');
    logo.style.removeProperty('--mm-logo-flight-duration');
    logo.style.removeProperty('--mm-logo-flight-dx');
    logo.style.removeProperty('--mm-logo-flight-dy');
    logoFlightToken += 1;
    var token = logoFlightToken;

    var from = logo.getBoundingClientRect();
    beforeMove();
    var to = logo.getBoundingClientRect();

    var dx = from.left - to.left;
    var dy = from.top - to.top;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    logo.style.setProperty('--mm-logo-flight-duration', parseDurationMs(durationVar, fallbackSeconds) + 'ms');
    logo.style.setProperty('--mm-logo-flight-dx', dx + 'px');
    logo.style.setProperty('--mm-logo-flight-dy', dy + 'px');
    logo.classList.add('mm-topbar__logo--flying');

    function onFlightEnd(e) {
      if (e.target !== logo || e.propertyName !== 'transform') return;
      if (token !== logoFlightToken) return;
      logo.removeEventListener('transitionend', onFlightEnd);
      logo.classList.remove('mm-topbar__logo--flying');
      logo.style.removeProperty('--mm-logo-flight-duration');
      logo.style.removeProperty('--mm-logo-flight-dx');
      logo.style.removeProperty('--mm-logo-flight-dy');
    }

    logo.addEventListener('transitionend', onFlightEnd);
  }

  (function initDom() {
    if (topbar && nav.parentElement !== topbar) {
      topbar.appendChild(nav);
    }
    unwrapLegacyTopbarWordmark();
    document.body.classList.remove('mm-logo-in-nav');
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
    var available = Math.max(260, vh - topbarH - 28);
    var preferred = Math.max(minH, vh * ratio);
    return Math.round(Math.max(260, Math.min(preferred, maxH, available)));
  }

  function applyPanelH() {
    var h = calcPanelH();
    document.documentElement.style.setProperty('--mm-menu-h', h + 'px');
    nav.style.height = '';
  }

  applyPanelH();

  function openMenu() {
    if (menuState === 'open' || menuState === 'opening' || menuState === 'closing') return;
    menuState = 'opening';
    clearCloseShutterWatch();
    shutterEpoch++;
    document.body.classList.remove('mm-nav-closing');
    lastFocusedBeforeOpen = document.activeElement;

    var wasScrolled = document.body.classList.contains('is-scrolled');
    document.body.classList.toggle('mm-nav-solid-topbar', wasScrolled);

    applyPanelH();

    /* Same logo node leaves topbar and flies into menu lockup. */
    runLogoFlight(moveLogoIntoMenu, '--mm-logo-flight-open', 2.65);
    nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mm-nav-open');
    lockBodyScroll();
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');

    openDoneTimer = window.setTimeout(function () {
      if (menuState === 'opening') menuState = 'open';
      openDoneTimer = null;
    }, parseDurationMs('--mm-push-duration-open', 2.1) + 120);

    var firstLink = nav.querySelector('.mm-nav__col--primary a');
    if (firstLink) {
      var ms = parseDurationMs('--mm-push-duration-open', 2.1) + 80;
      window.setTimeout(function () {
        if (!nav.classList.contains('is-open')) return;
        firstLink.focus({ preventScroll: true });
      }, ms);
    }
  }

  function closeMenu(evt) {
    if (!nav.classList.contains('is-open') || menuState === 'closing' || menuState === 'closed') return;
    menuState = 'closing';

    clearCloseShutterWatch();

    var epoch = shutterEpoch;

    /* Closing phase keeps chrome state stable while panel reverses. */
    document.body.classList.add('mm-nav-closing');

    /* Start logo return immediately (independent entity, not post-shutter). */
    runLogoFlight(moveLogoBackToTopbar, '--mm-logo-flight-close', 2.25);

    document.body.classList.remove('mm-nav-open');
    document.body.classList.remove('mm-nav-solid-topbar');
    nav.classList.remove('is-open');
    unlockBodyScroll();

    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');

    var fromEscape = evt && evt.type === 'keydown' && evt.key === 'Escape';
    if (fromEscape) {
      menuBtn.focus({ preventScroll: true });
    } else if (document.activeElement === menuBtn) {
      menuBtn.blur();
    } else if (lastFocusedBeforeOpen && typeof lastFocusedBeforeOpen.focus === 'function') {
      lastFocusedBeforeOpen.focus({ preventScroll: true });
    }

    var panel = nav.querySelector('.mm-nav__panel');

    function finishShutter() {
      if (epoch !== shutterEpoch) return;
      document.body.classList.remove('mm-nav-closing');
      nav.setAttribute('aria-hidden', 'true');
      menuState = 'closed';
    }

    if (!panel) {
      finishShutter();
      return;
    }

    closePanelHandler = function (e) {
      if (e.target !== panel || e.propertyName !== 'transform') return;
      panel.removeEventListener('transitionend', closePanelHandler);
      closePanelHandler = null;
      if (closeFallbackTimer != null) {
        window.clearTimeout(closeFallbackTimer);
        closeFallbackTimer = null;
      }
      finishShutter();
    };

    panel.addEventListener('transitionend', closePanelHandler);

    var fallbackMs = parseDurationMs('--mm-push-duration-close', 1.75) + 150;
    closeFallbackTimer = window.setTimeout(function () {
      closeFallbackTimer = null;
      if (closePanelHandler) {
        panel.removeEventListener('transitionend', closePanelHandler);
        closePanelHandler = null;
      }
      finishShutter();
    }, fallbackMs);
  }

  menuBtn.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open')) closeMenu(e);
    else openMenu();
  });

  nav.addEventListener('click', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (e.target === nav) closeMenu(e);
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open')) closeMenu(e);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && nav.classList.contains('is-open')) {
      var focusables = nav.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus({ preventScroll: true });
        return;
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
        return;
      }
    }
    if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(e);
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
