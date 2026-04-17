/**
 * Booking persistence (localStorage), hero / v2 bar label sync, book links, exit fade.
 * Bottom sticky dock markup/CSS lives in repo but is not mounted on preview pages.
 */
(function () {
  var PERSIST_KEY = "mm-booking-persist";
  var PERSIST_V = 1;

  var inEl = document.getElementById("mm-book-checkin");
  var outEl = document.getElementById("mm-book-checkout");
  if (!inEl || !outEl) return;

  var inlineHero = document.querySelector("#mm-booking-inline.mm-booking-inline--hero");
  var inlineV2 = document.querySelector("#mm-booking-inline.v2-avail");

  var compactRange = document.getElementById("mm-book-compact-range");
  var compactGuests = document.getElementById("mm-book-compact-guests");
  var heroLabelIn = document.getElementById("mm-book-hero-label-in");
  var heroLabelOut = document.getElementById("mm-book-hero-label-out");
  var heroGuestsLine = document.getElementById("mm-book-hero-guests-line");
  var noRoomsEl = document.getElementById("mm-book-no-rooms");
  var groupAdultsEl = document.getElementById("mm-book-group-adults");
  var groupChildrenEl = document.getElementById("mm-book-group-children");
  var triggerGuests = document.getElementById("mm-book-hero-trigger-guests");
  var syncLinks = document.querySelectorAll("a.mm-booking-sync");
  var bbCheckinVal = document.getElementById("bbCheckinVal");
  var bbCheckoutVal = document.getElementById("bbCheckoutVal");
  var bbGuestsVal = document.getElementById("bbGuestsVal");

  function pad(n) {
    return String(n).length < 2 ? "0" + n : String(n);
  }

  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function bookingLang() {
    try {
      if (typeof window.mmCurrentLang === "function" && window.mmCurrentLang() === "es") return "es";
    } catch (_) {}
    return "en";
  }

    function buildBookingUrl() {
    // Dates are already persisted to localStorage["mm-booking-persist"] by persistBooking().
    // book.html reads them on load — no URL params needed.
    return "book.html";
  }

  function syncHrefs() {
    var href = buildBookingUrl();
    for (var i = 0; i < syncLinks.length; i++) {
      syncLinks[i].href = href;
    }
  }

  function parseYmd(s) {
    var p = String(s || "").split("-");
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function persistBooking() {
    var gs = document.getElementById("mm-book-guests-state");
    try {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          v: PERSIST_V,
          checkin: inEl.value || "",
          checkout: outEl.value || "",
          noRooms: noRoomsEl && noRoomsEl.value ? noRoomsEl.value : "1",
          groupAdults: groupAdultsEl && groupAdultsEl.value ? groupAdultsEl.value : "2",
          groupChildren: groupChildrenEl && groupChildrenEl.value ? groupChildrenEl.value : "0",
          guestsState: gs && gs.value ? gs.value : '[{"adults":2,"children":0}]',
        })
      );
    } catch (_) {}
  }

  function loadPersistedBooking() {
    try {
      var raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return false;
      var o = JSON.parse(raw);
      if (!o || o.v !== PERSIST_V || typeof o.checkin !== "string" || typeof o.checkout !== "string") return false;
      var ci = parseYmd(o.checkin);
      var co = parseYmd(o.checkout);
      if (!ci || !co) return false;
      var today0 = startOfDay(new Date());
      if (ci.getTime() < today0.getTime()) return false;
      if (co.getTime() <= ci.getTime()) return false;
      inEl.value = o.checkin;
      outEl.value = o.checkout;
      if (noRoomsEl && o.noRooms != null && String(o.noRooms).trim() !== "") {
        var nr = parseInt(o.noRooms, 10);
        if (!isNaN(nr)) noRoomsEl.value = String(Math.max(1, Math.min(4, nr)));
      }
      if (groupAdultsEl && o.groupAdults != null && String(o.groupAdults).trim() !== "") {
        var ga = parseInt(o.groupAdults, 10);
        if (!isNaN(ga)) groupAdultsEl.value = String(Math.max(1, Math.min(8, ga)));
      }
      if (groupChildrenEl && o.groupChildren != null && String(o.groupChildren).trim() !== "") {
        var gc = parseInt(o.groupChildren, 10);
        if (!isNaN(gc)) groupChildrenEl.value = String(Math.max(0, Math.min(6, gc)));
      }
      var gs = document.getElementById("mm-book-guests-state");
      if (gs && typeof o.guestsState === "string" && o.guestsState.trim()) {
        try {
          var rooms = JSON.parse(o.guestsState);
          if (Array.isArray(rooms) && rooms.length) gs.value = o.guestsState;
        } catch (_) {}
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function padDayNum(d) {
    var n = d.getDate();
    return n < 10 ? "0" + n : String(n);
  }

  function stickyLocale() {
    try {
      if (typeof window.mmCurrentLang === "function" && window.mmCurrentLang() === "es") return "es-ES";
    } catch (_) {}
    return "en-US";
  }

  function monShort(d) {
    try {
      return d.toLocaleDateString(stickyLocale(), { month: "short" });
    } catch (_) {
      return "";
    }
  }

  /** Hero row: "Check in · Add date" or "Check in Apr 06". */
  function formatHeroDateLine(prefix, iso) {
    var d = parseYmd(iso);
    if (!d) return prefix + " · Add date";
    return prefix + " " + monShort(d) + " " + padDayNum(d);
  }

  function formatGuestSummary() {
    var n = noRoomsEl ? parseInt(noRoomsEl.value, 10) : 1;
    var a = groupAdultsEl ? parseInt(groupAdultsEl.value, 10) : 2;
    var c = groupChildrenEl ? parseInt(groupChildrenEl.value, 10) : 0;
    if (isNaN(n) || n < 1) n = 1;
    if (isNaN(a) || a < 1) a = 2;
    if (isNaN(c) || c < 0) c = 0;
    var roomStr = n === 1 ? "1 Room" : n + " Rooms";
    var heads = a + c;
    var guestStr = heads === 1 ? "1 Guest" : heads + " Guests";
    return roomStr + " · " + guestStr;
  }

  /** Same calendar month → "Apr 07 – Apr 19"; else → "Apr 07, 2026 – May 12, 2026". */
  /** Short cell label for home v2 bar (e.g. Apr 06). */
  function formatV2BarDate(iso) {
    var d = parseYmd(iso);
    if (!d) return "Select date";
    return monShort(d) + " " + padDayNum(d);
  }

  function formatStickyRange(isoIn, isoOut) {
    var a = parseYmd(isoIn);
    var b = parseYmd(isoOut);
    if (!a || !b) return "—";
    var sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    var left = monShort(a) + " " + padDayNum(a);
    var right = monShort(b) + " " + padDayNum(b);
    if (sameMonth) {
      return left + " – " + right;
    }
    return left + ", " + a.getFullYear() + " – " + right + ", " + b.getFullYear();
  }

  function ensureOrder() {
    var a = parseYmd(inEl.value);
    var b = parseYmd(outEl.value);
    if (a && b && b.getTime() <= a.getTime()) {
      var next = new Date(a);
      next.setDate(next.getDate() + 1);
      outEl.value = ymd(next);
      b = parseYmd(outEl.value);
    }
    var ci = parseYmd(inEl.value);
    if (ci) {
      var minCo = new Date(ci);
      minCo.setDate(minCo.getDate() + 1);
      outEl.min = ymd(minCo);
    } else {
      var t0 = new Date();
      var t1 = new Date(t0);
      t1.setDate(t1.getDate() + 1);
      outEl.min = ymd(t1);
    }
  }

  function refreshLabels() {
    ensureOrder();
    if (heroLabelIn) {
      heroLabelIn.textContent = formatHeroDateLine("Check in", inEl.value);
      heroLabelIn.classList.toggle("is-placeholder", !inEl.value);
    }
    if (heroLabelOut) {
      heroLabelOut.textContent = formatHeroDateLine("Check out", outEl.value);
      heroLabelOut.classList.toggle("is-placeholder", !outEl.value);
    }
    if (compactRange) {
      compactRange.textContent = formatStickyRange(inEl.value, outEl.value);
      var t =
        (inEl.value || "") +
        (inEl.value && outEl.value ? " → " : "") +
        (outEl.value || "");
      if (t) compactRange.setAttribute("title", t);
      else compactRange.removeAttribute("title");
    }
    var gLine = formatGuestSummary();
    if (heroGuestsLine) {
      heroGuestsLine.textContent = gLine;
    }
    if (bbCheckinVal) {
      bbCheckinVal.textContent = formatV2BarDate(inEl.value);
      bbCheckinVal.classList.toggle("is-placeholder", !inEl.value);
    }
    if (bbCheckoutVal) {
      bbCheckoutVal.textContent = formatV2BarDate(outEl.value);
      bbCheckoutVal.classList.toggle("is-placeholder", !outEl.value);
    }
    if (bbGuestsVal) {
      bbGuestsVal.textContent = gLine;
    }
    if (compactGuests) {
      compactGuests.textContent = gLine;
    }
    if (triggerGuests) {
      triggerGuests.setAttribute("aria-label", gLine);
    }
    syncHrefs();
    persistBooking();
  }

  function defaults() {
    var t = new Date();
    var t2 = new Date(t);
    t2.setDate(t2.getDate() + 1);
    inEl.min = ymd(t);
    inEl.value = ymd(t);
    outEl.min = ymd(t2);
    outEl.value = ymd(t2);
  }

  window.mmBookingRefresh = refreshLabels;

  var today = new Date();
  inEl.min = ymd(today);
  if (!loadPersistedBooking()) {
    defaults();
  } else {
    var minCo = parseYmd(inEl.value);
    if (minCo) {
      var n = new Date(minCo);
      n.setDate(n.getDate() + 1);
      outEl.min = ymd(n);
    }
  }
  refreshLabels();

  inEl.addEventListener("change", refreshLabels);
  inEl.addEventListener("input", refreshLabels);
  outEl.addEventListener("change", refreshLabels);
  outEl.addEventListener("input", refreshLabels);
  var gs = document.getElementById("mm-book-guests-state");
  if (noRoomsEl) {
    noRoomsEl.addEventListener("change", refreshLabels);
    noRoomsEl.addEventListener("input", refreshLabels);
  }
  if (groupAdultsEl) {
    groupAdultsEl.addEventListener("change", refreshLabels);
    groupAdultsEl.addEventListener("input", refreshLabels);
  }
  if (groupChildrenEl) {
    groupChildrenEl.addEventListener("change", refreshLabels);
    groupChildrenEl.addEventListener("input", refreshLabels);
  }
  if (gs) {
    gs.addEventListener("change", refreshLabels);
    gs.addEventListener("input", refreshLabels);
  }

  window.addEventListener("load", function () {
    syncHrefs();
  });

  var heroTriggerIn = document.getElementById("mm-book-hero-trigger-in");
  var changeCompact = document.getElementById("mm-booking-strip-change");
  if (changeCompact) {
    changeCompact.addEventListener("click", function (e) {
      e.preventDefault();
      var scrollTarget = inlineHero || inlineV2;
      if (scrollTarget) {
        scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(function () {
          try {
            if (heroTriggerIn) heroTriggerIn.focus();
            else inEl.focus();
          } catch (_) {}
        }, 380);
      } else {
        window.location.href = "index.html#mm-booking-inline";
      }
    });
  }

  try {
    document.body.classList.remove("mm-booking-sticky-on");
  } catch (_) {}

  // ── Page exit animation when navigating to book.html ───────────
  // Uses event delegation so it catches both static links and any
  // links updated dynamically by syncHrefs().
  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href="book.html"]');
    if (!link) return;
    // Don't animate if already on book page
    if (document.body.classList.contains("mm-book-page")) return;
    e.preventDefault();
    var dest = link.href;
    document.body.style.transition = "opacity 0.28s ease";
    document.body.style.opacity = "0";
    setTimeout(function () { window.location.href = dest; }, 290);
  });
})();
