/* =============================================================
   Motel Mediteran — Page Loader  (mm-page-loader.js)

   Loader only when needed:
   • After ~400 ms, show the overlay if the page is not fully loaded yet
     (covers slow HTML parse *and* fast DOM + slow fonts/images/scripts).
   • If everything finishes before that, no loader (no flash on quick sites).
   • When hiding, wait for first paint + web fonts so content doesn’t
     flicker the moment the overlay drops.
   ============================================================= */
(function () {
  "use strict";

  var slowShowMs = 400;

  function afterPaintThen(fn) {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
  }

  function whenReadyToReveal(done) {
    function run() {
      afterPaintThen(function () {
        setTimeout(done, 50);
      });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run).catch(run);
    } else {
      run();
    }
  }

  // ── 1. Inject CSS ─────────────────────────────────────────────
  var css = [
    "html{background:#f8f8f6;}",
    ".mm-pl{",
      "position:fixed;inset:0;z-index:99999;",
      "background:#f8f8f6;",
      "display:flex;flex-direction:column;",
      "align-items:center;justify-content:center;gap:32px;",
      "opacity:1;pointer-events:auto;",
      "transition:opacity 0.45s ease;",
    "}",
    ".mm-pl.mm-pl--hidden{",
      "opacity:0;pointer-events:none;",
    "}",
    ".mm-pl::before{",
      "content:'';position:absolute;inset:0;",
      "background:url('assets/site-texture.png?v=2') repeat;",
      "background-size:560px auto;",
      "opacity:0.38;pointer-events:none;",
    "}",
    ".mm-pl__spinner{position:relative;z-index:1;width:100px;height:100px;}",
    ".mm-pl__rect{animation:mm-pl-gap 1.6s linear infinite;}",
    ".mm-pl__mark{",
      "position:absolute;inset:0;",
      "display:flex;align-items:center;justify-content:center;",
      "font-family:'Cormorant Garamond',Cormorant,Georgia,serif;",
      "font-size:19px;font-weight:300;letter-spacing:0.22em;",
      "padding-left:0.22em;color:#0a0a0a;user-select:none;",
      "z-index:1;",
    "}",
    ".mm-pl__label{",
      "position:relative;z-index:1;",
      "font-family:'Inter',system-ui,sans-serif;",
      "font-size:10px;letter-spacing:0.2em;text-transform:uppercase;",
      "color:#0a0a0a;opacity:0.4;",
    "}",
    "@keyframes mm-pl-gap{",
      "from{stroke-dashoffset:0}",
      "to{stroke-dashoffset:-376}",
    "}"
  ].join("");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ── 2. Loader node (mounted only if slow) ─────────────────────
  var el = document.createElement("div");
  el.className = "mm-pl";
  el.setAttribute("role", "status");
  el.setAttribute("aria-label", "Loading, please wait");
  el.innerHTML = [
    '<div class="mm-pl__spinner" aria-hidden="true">',
      '<svg class="mm-pl__svg" viewBox="0 0 100 100" fill="none"',
        ' xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
        '<rect class="mm-pl__rect"',
          ' x="3" y="3" width="94" height="94"',
          ' stroke="#0a0a0a" stroke-width="1.5"',
          ' stroke-dasharray="304 72" stroke-linecap="square"',
        '/>',
      '</svg>',
      '<div class="mm-pl__mark">M M</div>',
    '</div>',
    '<p class="mm-pl__label">Loading</p>'
  ].join("");

  function mount() {
    if (el.parentNode) return;
    if (document.body) {
      document.body.insertBefore(el, document.body.firstChild);
    } else {
      document.documentElement.appendChild(el);
    }
  }

  var loaderVisible = false;
  var hideScheduled = false;
  var slowTimer    = null;
  var manualMode   = false; // true when shown via MMLoader.show(), not page-load logic

  function hide() {
    if (hideScheduled) return;
    if (slowTimer) {
      clearTimeout(slowTimer);
      slowTimer = null;
    }
    if (!el.parentNode) return;
    hideScheduled = true;
    manualMode    = false;
    el.classList.add("mm-pl--hidden");
    loaderVisible = false;
    el.addEventListener("transitionend", function cleanup() {
      el.removeEventListener("transitionend", cleanup);
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function tryShowSlow() {
    slowTimer = null;
    // Show while subresources (fonts, images, deferred scripts) may still be loading,
    // not only during HTML parsing — otherwise first paint often has no loader.
    if (document.readyState === "complete") return;
    loaderVisible = true;
    mount();
  }

  if (document.readyState === "complete") {
    return;
  }

  slowTimer = setTimeout(tryShowSlow, slowShowMs);

  window.addEventListener("load", function () {
    if (slowTimer) {
      clearTimeout(slowTimer);
      slowTimer = null;
    }
    // Hide after full load + fonts/paint so images and deferred scripts are in too
    if (loaderVisible && !manualMode) whenReadyToReveal(hide);
  });

  // ── Public API ─────────────────────────────────────────────────
  // MMLoader.show("Checking availability…") / MMLoader.hide()
  var labelEl = el.querySelector(".mm-pl__label");

  function show(labelText) {
    if (labelEl) labelEl.textContent = labelText || "Loading";
    hideScheduled = false;
    loaderVisible = true;
    manualMode    = true;  // prevents window.load from auto-hiding this
    el.classList.remove("mm-pl--hidden");
    mount();
  }

  window.MMLoader = { show: show, hide: hide };

  // Auto-show loader on any page when navigating to book.html
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href") || "";
    if (href.indexOf("book.html") !== -1) show("Loading availability…");
  }, true);
})();
