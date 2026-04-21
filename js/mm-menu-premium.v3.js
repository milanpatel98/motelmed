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

  function lockBodyScroll() {
    if (menuScrollLockY !== null) return;
    menuScrollLockY = window.scrollY || window.pageYOffset || 0;
    var sbw = scrollbarWidth();
    if (sbw > 0) {
      document.body.style.paddingRight = sbw + 'px';
    }
    /* Panel overlays page — no push, so no position:fixed needed.
       overflow:hidden on both html + body covers desktop and iOS Safari. */
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    if (menuScrollLockY === null) return;
    menuScrollLockY = null;
    document.body.style.paddingRight = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  /**
   * Full page navigations should not run closeMenu(): animating shut + scroll unlock
   * while the browser is loading the next document causes a visible flash/jank.
   * Same-tab loads to another document: let the browser navigate immediately.
   */
  function shouldSkipMenuCloseOnNavigate(e, anchor) {
    if (e.defaultPrevented) return false;
    if (e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    var target = anchor.getAttribute('target');
    if (target && target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    var href = anchor.getAttribute('href');
    if (href == null || href === '' || href === '#' || /^\s*javascript:/i.test(href)) return false;
    if (/^(mailto:|tel:|sms:)/i.test(href.trim())) return false;
    try {
      var next = new URL(anchor.href, window.location.href);
      var cur = new URL(window.location.href);
      if (next.origin !== cur.origin) return true;
      if (next.pathname !== cur.pathname || next.search !== cur.search) return true;
      return false;
    } catch (err) {
      return false;
    }
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

  function openMenu() {
    if (menuState === 'open' || menuState === 'opening') return;
    if (menuState === 'closing') {
      /* Interrupt a close-in-progress cleanly */
      clearCloseShutterWatch();
      document.body.classList.remove('mm-nav-closing');
    }
    menuState = 'opening';
    shutterEpoch++;
    lastFocusedBeforeOpen = document.activeElement;

    var wasScrolled = document.body.classList.contains('is-scrolled');
    document.body.classList.toggle('mm-nav-solid-topbar', wasScrolled);
    /* Entity A: burger switches to X immediately — no waiting */
    document.body.classList.add('mm-nav-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');
    /* Force topbar transparent + white cross via inline !important — beats any stylesheet cascade */
    if (topbar) {
      topbar.style.setProperty('background-color', 'transparent', 'important');
      topbar.style.setProperty('border-bottom-color', 'transparent', 'important');
      topbar.style.setProperty('box-shadow', 'none', 'important');
      topbar.style.setProperty('backdrop-filter', 'none', 'important');
    }
    menuBtn.querySelectorAll('.mm-burger__line').forEach(function (l) {
      l.style.setProperty('stroke', '#ffffff', 'important');
    });
    /* Scroll locked in the same frame so no layout jump */
    lockBodyScroll();

    /* Entity 2: shutter descends */
    nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');

    /* Entities B + C: logo / brand fly independently */
    runLogoFlight(moveLogoIntoMenu, '--mm-logo-flight-open', 0.60);

    openDoneTimer = window.setTimeout(function () {
      if (menuState === 'opening') menuState = 'open';
      openDoneTimer = null;
    }, parseDurationMs('--mm-push-duration-open', 0.72) + 80);

    var firstLink = nav.querySelector('.mm-nav__col--primary a');
    if (firstLink) {
      window.setTimeout(function () {
        if (!nav.classList.contains('is-open')) return;
        firstLink.focus({ preventScroll: true });
      }, parseDurationMs('--mm-push-duration-open', 0.72) + 60);
    }
  }

  function closeMenu(evt) {
    if (!nav.classList.contains('is-open') || menuState === 'closing' || menuState === 'closed') return;
    menuState = 'closing';

    clearCloseShutterWatch();

    var epoch = shutterEpoch;

    /* Entity A: burger switches to hamburger immediately — no waiting */
    document.body.classList.remove('mm-nav-open');
    document.body.classList.remove('mm-nav-solid-topbar');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    /* Reset burger stroke immediately so hamburger reverts to page's natural colour */
    menuBtn.querySelectorAll('.mm-burger__line').forEach(function (l) {
      l.style.removeProperty('stroke');
    });
    /* Restore topbar to its natural CSS state at close-start, not at close-end */
    if (topbar) {
      topbar.style.removeProperty('background-color');
      topbar.style.removeProperty('border-bottom-color');
      topbar.style.removeProperty('box-shadow');
      topbar.style.removeProperty('backdrop-filter');
    }

    var fromEscape = evt && evt.type === 'keydown' && evt.key === 'Escape';
    if (fromEscape) {
      menuBtn.focus({ preventScroll: true });
    } else if (document.activeElement === menuBtn) {
      menuBtn.blur();
    } else if (lastFocusedBeforeOpen && typeof lastFocusedBeforeOpen.focus === 'function') {
      lastFocusedBeforeOpen.focus({ preventScroll: true });
    }

    /* Entity 2: shutter ascends; B + C fly back — scroll stays locked until done */
    document.body.classList.add('mm-nav-closing');
    /* Force a synchronous reflow so the browser commits the panel's current translateY(0)
       position before removing is-open. Without this the open→close class swap is batched
       into one style recalculation and the panel snaps instead of animating. */
    void nav.offsetHeight;
    nav.classList.remove('is-open');
    runLogoFlight(moveLogoBackToTopbar, '--mm-logo-flight-close', 0.52);

    var panel = nav.querySelector('.mm-nav__panel');

    function finishShutter() {
      if (epoch !== shutterEpoch) return;
      document.body.classList.remove('mm-nav-closing');
      nav.setAttribute('aria-hidden', 'true');
      menuState = 'closed';
      /* Unlock scroll only after shutter is fully closed — prevents layout flash */
      unlockBodyScroll();
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

    var fallbackMs = parseDurationMs('--mm-push-duration-close', 0.62) + 100;
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
      if (!nav.classList.contains('is-open')) return;
      if (shouldSkipMenuCloseOnNavigate(e, a)) return;
      closeMenu(e);
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

})();
