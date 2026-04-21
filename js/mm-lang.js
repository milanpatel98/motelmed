/**
 * EN/ES: Google Website Translator — translates visible page HTML (no duplicate copy).
 * Preference: localStorage "mm-lang" + googtrans cookie. Requires network (translate.googleapis.com).
 */
(function (w) {
  /** Keep brand / room product labels in English when Google ES is on */
  w.mmPreserveEn = function (plain) {
    var s = document.createElement("span");
    s.className = "notranslate";
    s.setAttribute("translate", "no");
    s.textContent = plain == null ? "" : String(plain);
    return s.outerHTML;
  };
  w.mmPreserveEnHtml = function (html) {
    return '<span class="notranslate" translate="no">' + String(html == null ? "" : html) + "</span>";
  };
})(typeof window !== "undefined" ? window : globalThis);

(function () {
  var STORAGE_KEY = "mm-lang";

  function setCookie(name, value, maxAgeSec) {
    var tail = ";path=/;SameSite=Lax";
    if (maxAgeSec != null) tail += ";max-age=" + maxAgeSec;
    document.cookie = name + "=" + (value || "") + tail;
  }

  /** Google often stores e.g. %2Fen%2Fes — plain /googtrans=\/en\/es/ misses it. */
  function cookieIndicatesSpanish() {
    var raw = document.cookie || "";
    var m = raw.match(/(?:^|;\s*)googtrans=([^;]+)/i);
    if (!m) return false;
    var v = (m[1] || "").trim();
    try {
      v = decodeURIComponent(v);
    } catch (_) {}
    return v.indexOf("/en/es") !== -1;
  }

  function clearGoogTransAggressive() {
    var exp = "Thu, 01 Jan 1970 00:00:01 GMT";
    var h = location.hostname || "";
    [
      "googtrans=;path=/;expires=" + exp + ";SameSite=Lax",
      "googtrans=;path=/;max-age=0;SameSite=Lax",
      h ? "googtrans=;path=/;domain=" + h + ";expires=" + exp + ";SameSite=Lax" : "",
      h ? "googtrans=;path=/;domain=." + h + ";expires=" + exp + ";SameSite=Lax" : "",
    ].forEach(function (c) {
      if (c) document.cookie = c;
    });
  }

  /** Ensure cookie matches saved language before translate script runs. */
  function syncCookieFromStorage() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "es") {
        setCookie("googtrans", "/en/es", 31536e3);
      } else {
        clearGoogTransAggressive();
      }
    } catch (_) {}
  }

  syncCookieFromStorage();

  window.googleTranslateElementInit = function () {
    if (window.__mmTranslateMounted) return;
    window.__mmTranslateMounted = true;
    var host = document.getElementById("mm-google-translate");
    if (!host) {
      host = document.createElement("div");
      host.id = "mm-google-translate";
      host.setAttribute("aria-hidden", "true");
      document.body.insertBefore(host, document.body.firstChild);
    }
    try {
      new google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,es",
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "mm-google-translate"
      );
    } catch (_) {}
    document.documentElement.classList.add("mm-translate-ready");
    syncButtonState();
    patchBookingLinksSoon();
  };

  function currentLang() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "es") return "es";
    } catch (_) {}
    if (cookieIndicatesSpanish()) return "es";
    return "en";
  }

  function syncHtmlLangClass() {
    try {
      document.documentElement.classList.toggle("mm-lang-es", currentLang() === "es");
    } catch (_) {}
  }

  function setLang(code) {
    var wantEs = code === "es";
    if (wantEs) {
      if (currentLang() === "es") return;
      try {
        localStorage.setItem(STORAGE_KEY, "es");
      } catch (_) {}
      setCookie("googtrans", "/en/es", 31536e3);
      location.reload();
      return;
    }
    /** English: detect Spanish *before* mutating storage (fixes encoded googtrans cookie). */
    var leaveSpanish = currentLang() === "es" || cookieIndicatesSpanish();
    try {
      localStorage.setItem(STORAGE_KEY, "en");
    } catch (_) {}
    clearGoogTransAggressive();
    if (leaveSpanish) location.reload();
  }

  function bindLangButtons(wrap) {
    if (!wrap) return;
    wrap.classList.add("notranslate");
    var cur = currentLang();
    wrap.querySelectorAll(".mm-lang").forEach(function (btn) {
      var dl = btn.getAttribute("data-mm-lang");
      var isEs =
        dl === "es" ||
        (!dl &&
          (btn.getAttribute("aria-label") === "Spanish" ||
            btn.textContent.trim().toUpperCase() === "ES"));
      btn.classList.toggle("is-active", isEs ? cur === "es" : cur === "en");
      if (btn.getAttribute("data-mm-lang-bound")) return;
      btn.setAttribute("data-mm-lang-bound", "1");
      btn.addEventListener("click", function () {
        setLang(isEs ? "es" : "en");
      });
    });
  }

  /** Honest expectations: Google Translate; brand names often stay in English. */
  function setLangGroupAria(wrap) {
    if (!wrap) return;
    wrap.setAttribute(
      "aria-label",
      "Language: English or Spanish (Google Translate; brand names and some labels may stay in English)"
    );
  }

  function syncButtonState() {
    bindLangButtons(document.querySelector(".mm-topbar__lang"));
    bindLangButtons(document.querySelector(".mm-nav__lang"));
    setLangGroupAria(document.querySelector(".mm-topbar__lang"));
    setLangGroupAria(document.querySelector(".mm-nav__lang"));
  }

  /**
   * Booking affiliate URLs often use ";key=value" pairs. URL.searchParams only splits on "&",
   * so the whole "330843;lang=en;pb=1" becomes one aid value — then set("lang") produces
   * aid=330843%3Blang%3Den%3Bpb%3D1 (broken). Normalize ";" / "%3B" to "&" before editing.
   */
  function normalizeBookingQueryForURLAPI(href) {
    var s = String(href || "");
    if (!/booking\.com/i.test(s)) return s;
    var q = s.indexOf("?");
    if (q < 0) return s;
    var hashIdx = s.indexOf("#", q);
    var end = hashIdx >= 0 ? hashIdx : s.length;
    var query = s.slice(q + 1, end);
    if (query.indexOf(";") < 0 && query.toLowerCase().indexOf("%3b") < 0) return s;
    var qFixed = query.replace(/%3B/gi, "&").replace(/;/g, "&");
    return s.slice(0, q + 1) + qFixed + (hashIdx >= 0 ? s.slice(hashIdx) : "");
  }

  /**
   * Partner contract: outbound links use ";" between query pairs (not "&" from URL APIs).
   */
  function formatBookingAffiliateHref(absoluteUrl) {
    var s = String(absoluteUrl || "");
    if (!/booking\.com\/hotel\/us\/motel-mediteran\.html/i.test(s)) return s;
    var q = s.indexOf("?");
    if (q < 0) return s;
    var hashIdx = s.indexOf("#", q);
    var end = hashIdx >= 0 ? hashIdx : s.length;
    var query = s.slice(q + 1, end);
    if (query.indexOf("&") < 0) return s;
    var qSemi = query.replace(/&/g, ";");
    return s.slice(0, q + 1) + qSemi + (hashIdx >= 0 ? s.slice(hashIdx) : "");
  }

  window.mmFormatBookingAffiliateHref = formatBookingAffiliateHref;

  function patchBookingLinks() {
    var es = currentLang() === "es";
    document.querySelectorAll('a[href*="booking.com"]').forEach(function (a) {
      try {
        var raw = a.getAttribute("href") || a.href;
        var fixed = normalizeBookingQueryForURLAPI(raw);
        var u = new URL(fixed, location.href);
        u.searchParams.set("lang", es ? "es" : "en");
        if (/booking\.com\/hotel\/us\/motel-mediteran\.html/i.test(u.pathname)) {
          u.searchParams.set("pb", "1");
        }
        a.href = formatBookingAffiliateHref(u.toString());
      } catch (_) {}
    });
  }

  /** Room detail / carousels set href after first paint — re-apply lang= a few times. */
  function patchBookingLinksSoon() {
    patchBookingLinks();
    [80, 400, 1200, 2800].forEach(function (ms) {
      setTimeout(patchBookingLinks, ms);
    });
  }

  function injectLoader() {
    if (document.querySelector("script[data-mm-google-translate]")) return;
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.setAttribute("data-mm-google-translate", "1");
    document.head.appendChild(s);
  }

  function boot() {
    syncHtmlLangClass();
    syncButtonState();
    injectLoader();
    patchBookingLinksSoon();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.addEventListener("load", function () {
    syncHtmlLangClass();
    syncButtonState();
    patchBookingLinksSoon();
  });

  /** Chat / other scripts: "en" | "es" (Google translate cookie + localStorage) */
  window.mmCurrentLang = currentLang;

  syncHtmlLangClass();
})();
