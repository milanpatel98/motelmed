/**
 * Single embed for Marcos chat — add once per page (before </body>):
 *   <script src="js/mm-chat-widget.js?v=1"></script>
 *
 * Edit VERSIONS below when you update chat CSS/JS; then bump ?v= on this file
 * in your HTML so browsers fetch the new loader (or rely on deploy no-cache).
 */
(function () {
  if (window.MM_CHAT_WIDGET_MOUNTED) return;
  window.MM_CHAT_WIDGET_MOUNTED = true;

  /** Bump these when individual assets change */
  var VERSIONS = {
    css: "17",
    mmData: "14",
    dataset: "13",
    datasetAuto: "13",
    knowledge: "18",
    nlu: "6",
    chatbot: "50",
  };

  function widgetScriptBase() {
    var el =
      document.currentScript ||
      document.querySelector('script[src*="mm-chat-widget.js"]');
    if (el && el.src) return el.src.replace(/[^/]+$/, "");
    return "js/";
  }

  var base = widgetScriptBase();

  function toUrl(relPath) {
    try {
      return new URL(relPath, base).href;
    } catch (_) {
      return base + relPath.replace(/^\//, "");
    }
  }

  function injectCss() {
    if (document.querySelector('link[href*="chatbot.css"]')) return;
    var href = toUrl("../css/chatbot.css?v=" + VERSIONS.css);
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  function injectMarkup() {
    if (document.querySelector(".mm-chat-btn")) return;
    var html =
      '<button class="mm-chat-btn dot-hidden" type="button" aria-label="Open chat">' +
      '<div class="mm-chat-btn__dot"></div>' +
      '<svg class="mm-chat-icon-open" width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M1 1h20v13H12.5L7 20v-6H1V1z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<line x1="5" y1="6" x2="17" y2="6" stroke="white" stroke-width="1.2" stroke-linecap="round"/>' +
      '<line x1="5" y1="9.5" x2="14" y2="9.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/>' +
      "</svg>" +
      '<svg class="mm-chat-icon-close" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="1" y1="1" x2="13" y2="13" stroke="white" stroke-width="1.6" stroke-linecap="round"/>' +
      '<line x1="13" y1="1" x2="1" y2="13" stroke="white" stroke-width="1.6" stroke-linecap="round"/>' +
      "</svg>" +
      "</button>" +
      '<div class="mm-chat-panel is-hidden">' +
      '<div class="mm-chat-header">' +
      '<div class="mm-chat-header__avatar">MM</div>' +
      '<div class="mm-chat-header__info">' +
      '<div class="mm-chat-header__name">Marcos</div>' +
      '<div class="mm-chat-header__status">' +
      '<span class="mm-chat-header__brand notranslate" translate="no">Motel Mediteran</span>' +
      '<span class="mm-chat-header__sep" aria-hidden="true">·</span>' +
      '<span class="mm-chat-header__tagline">Here to help</span>' +
      "</div>" +
      "</div>" +
      '<button class="mm-chat-header__restart" type="button" aria-label="Restart conversation" title="Start over">' +
      '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M1.5 6.5A5 5 0 1 0 3 3" stroke="white" stroke-width="1.4" stroke-linecap="round"/>' +
      '<polyline points="0.5,1 3,3 0.5,5.5" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>" +
      "</button>" +
      "</div>" +
      '<div class="mm-chat-messages"></div>' +
      '<div class="mm-chat-footer">' +
      '<input class="mm-chat-input" type="text" placeholder="What can we help you with?" autocomplete="off" />' +
      '<button class="mm-chat-send" type="button" aria-label="Send">' +
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M1 7h12M7 1l6 6-6 6" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>" +
      "</button>" +
      "</div>" +
      "</div>";
    document.body.insertAdjacentHTML("beforeend", html);
  }

  function scriptTagContains(filename) {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf(filename) !== -1) return true;
    }
    return false;
  }

  function loadScript(fullUrl) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = fullUrl;
      s.async = false;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error("Failed to load " + fullUrl));
      };
      document.body.appendChild(s);
    });
  }

  function boot() {
    injectCss();
    injectMarkup();
    var chain = [];
    if (!window.MM_DATA && !scriptTagContains("mm-data.js")) {
      chain.push(toUrl("mm-data.js?v=" + VERSIONS.mmData));
    }
    if (!scriptTagContains("mm-chat-dataset.js")) {
      chain.push(toUrl("mm-chat-dataset.js?v=" + VERSIONS.dataset));
    }
    if (!scriptTagContains("mm-chat-dataset.auto.js")) {
      chain.push(toUrl("mm-chat-dataset.auto.js?v=" + VERSIONS.datasetAuto));
    }
    if (!scriptTagContains("chatbot-knowledge.js")) {
      chain.push(toUrl("chatbot-knowledge.js?v=" + VERSIONS.knowledge));
    }
    if (!scriptTagContains("mm-chat-nlu.js")) {
      chain.push(toUrl("mm-chat-nlu.js?v=" + VERSIONS.nlu));
    }
    if (!scriptTagContains("chatbot.js")) {
      chain.push(toUrl("chatbot.js?v=" + VERSIONS.chatbot));
    }

    var i = 0;
    function next(err) {
      if (err) {
        try {
          console.warn("MM chat widget:", err);
        } catch (_) {}
      }
      if (i >= chain.length) return;
      var url = chain[i++];
      loadScript(url).then(next).catch(next);
    }
    next();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
