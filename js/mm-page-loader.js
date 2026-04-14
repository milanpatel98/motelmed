/* =============================================================
   Motel Mediteran — Page Loader  (mm-page-loader.js)

   Shows a full-screen branded loader:
   • On every page load (hides once window fires 'load')
   • When the guest navigates to another page (link click)
   ============================================================= */
(function () {
  "use strict";

  // ── 1. Inject CSS ─────────────────────────────────────────────
  var css = [
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

  // ── 2. Inject HTML ────────────────────────────────────────────
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

  // Insert as first child of body so it covers everything
  document.body.insertBefore(el, document.body.firstChild);

  // ── 3. Hide once page is fully loaded ─────────────────────────
  function hide() {
    el.classList.add("mm-pl--hidden");
    // Remove from DOM after transition so it can't block interaction
    el.addEventListener("transitionend", function cleanup() {
      el.removeEventListener("transitionend", cleanup);
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  if (document.readyState === "complete") {
    // Already loaded (script injected late) — hide after one frame
    requestAnimationFrame(function () { requestAnimationFrame(hide); });
  } else {
    window.addEventListener("load", function () {
      // Brief pause so the fade feels intentional, not a flash
      setTimeout(hide, 200);
    });
  }

  // ── 4. Show again when guest navigates away ───────────────────
  //    Only on same-origin <a> links that load a new page.
  //    Ignores: hash-only links, mailto/tel, target="_blank",
  //             download links, javascript: hrefs.
  document.addEventListener("click", function (e) {
    var anchor = e.target.closest("a[href]");
    if (!anchor) return;

    var href = anchor.getAttribute("href") || "";

    // Skip non-navigation links
    if (
      anchor.target === "_blank" ||
      anchor.hasAttribute("download") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) return;

    // Skip external links
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Skip same page with different hash only
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) return;
    } catch (_) { return; }

    // Show loader before browser navigates
    el.classList.remove("mm-pl--hidden");
    // Re-attach to DOM if it was already removed
    if (!el.parentNode) {
      document.body.insertBefore(el, document.body.firstChild);
    }
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
  });

})();
