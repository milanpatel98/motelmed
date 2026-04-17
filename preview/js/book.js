/* =============================================================
   Motel Mediteran — Booking Flow
   Multi-step: Calendar → Room & Rate → Guest Info → Confirmation
   ============================================================= */
(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────────────
  var state = {
    checkin: null,      // Date object
    checkout: null,     // Date object
    rooms: 1,
    adults: 2,
    children: 0,
    currentStep: 1,
    bookingRef: null,   // set from MM_API.submitBooking() response
    viewYear: null,
    viewMonth: null,    // 0-indexed
    selectedRoom: null, // { id, name, price, thumb }
    selecting: "checkin" // "checkin" | "checkout"
  };

  // ── Calendar labels (must be declared before init() runs) ─────
  var DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

  // ── Rates: delegated to MM_API (see js/mm-api.js) ─────────────
  function getRateForDate(d) {
    var roomId = state.selectedRoom ? state.selectedRoom.id : null;
    return MM_API.getRateForDate(roomId, d);
  }

  // ── Utility ────────────────────────────────────────────────────
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function fmtKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fmtLong(d) {
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
    return days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function fmtShort(d) {
    var months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function fmtMonth(d) {
    var months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
    return months[d.getMonth()];
  }

  function addDays(d, n) {
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  function today() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function genRef() {
    return "MM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  function dollarsToCents(n) {
    return Math.round(Number(n) * 100);
  }

  function centsToMoney(c) {
    return c / 100;
  }

  /** City tax shown on ASI review: 10% of room/night subtotal (computed in cents). */
  function cityTax10Cents(subtotalCents) {
    return Math.round((subtotalCents * 10) / 100);
  }

  function fmtCents(c) {
    return "$" + (c / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmt$(n) {
    return fmtCents(dollarsToCents(n));
  }

  // ── DOM refs ───────────────────────────────────────────────────
  var stepEls = document.querySelectorAll(".mm-bk-step");
  var stepItems = document.querySelectorAll(".mm-bk-steps__list li");
  var btnBack = document.getElementById("bk-back");
  var btnNext = document.getElementById("bk-next");
  var calMonths = document.getElementById("bk-cal-months");
  var btnCalPrev = document.getElementById("bk-cal-prev");
  var btnCalNext = document.getElementById("bk-cal-next");
  var checkAvailBtn = document.getElementById("bk-check-avail");

  // ── Custom select dropdowns ────────────────────────────────────
  function initCustomSelects() {
    var wrappers = document.querySelectorAll(".mm-bk-select");
    wrappers.forEach(function (wrap) {
      var native = wrap.querySelector("select");
      if (!native) return;

      // Build trigger button
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mm-bk-select__btn";

      var valSpan = document.createElement("span");
      valSpan.className = "mm-bk-select__val";
      var selOpt = native.options[native.selectedIndex];
      valSpan.textContent = selOpt ? selOpt.text : "";

      var chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chevron.setAttribute("viewBox", "0 0 12 12");
      chevron.setAttribute("fill", "none");
      chevron.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M2 4l4 4 4-4");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.3");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      chevron.appendChild(path);

      btn.appendChild(valSpan);
      btn.appendChild(chevron);

      // Build options list
      var drop = document.createElement("ul");
      drop.className = "mm-bk-select__drop";

      Array.prototype.forEach.call(native.options, function (opt) {
        var li = document.createElement("li");
        li.className = "mm-bk-select__opt" + (opt.selected ? " is-sel" : "");
        li.textContent = opt.text;
        li.setAttribute("data-val", opt.value);
        li.addEventListener("click", function () {
          native.value = opt.value;
          native.dispatchEvent(new Event("change"));
          valSpan.textContent = opt.text;
          drop.querySelectorAll(".mm-bk-select__opt").forEach(function (el) {
            el.classList.toggle("is-sel", el === li);
          });
          wrap.classList.remove("is-open");
        });
        drop.appendChild(li);
      });

      // Toggle open/close
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var wasOpen = wrap.classList.contains("is-open");
        // close all others
        document.querySelectorAll(".mm-bk-select.is-open").forEach(function (el) {
          el.classList.remove("is-open");
        });
        if (!wasOpen) wrap.classList.add("is-open");
      });

      wrap.appendChild(btn);
      wrap.appendChild(drop);
    });

    // Close on outside click
    document.addEventListener("click", function () {
      document.querySelectorAll(".mm-bk-select.is-open").forEach(function (el) {
        el.classList.remove("is-open");
      });
    });
  }

  // ── External param reading ─────────────────────────────────────
  //
  // Three entry points write data before navigating to book.html:
  //
  // 1. Homepage availability bar + mm-booking-dock.js (localStorage)
  //    Already writes dates to localStorage["mm-booking-persist"]
  //    { checkin: "YYYY-MM-DD", checkout: "YYYY-MM-DD" }
  //
  // 2. Rooms page (rooms.js / room-detail.js)
  //    Should write to sessionStorage["mm_bk_room"]:
  //    JSON.stringify({ id, name, price, thumb })
  //    Then navigate to book.html
  //
  // 3. Top-bar "Check Availability" link
  //    Can pass URL params: book.html?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD
  //    No room param → falls back to cheapest available
  //
  function readExternalParams() {
    // ── Dates: URL params take priority, then localStorage persist ──
    var params = new URLSearchParams(window.location.search);
    var cinParam  = params.get("checkin");
    var coutParam = params.get("checkout");

    function parseYmd(s) {
      if (!s) return null;
      var parts = s.split("-");
      if (parts.length !== 3) return null;
      var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    }

    var cin  = parseYmd(cinParam);
    var cout = parseYmd(coutParam);

    // Fallback: existing booking strip localStorage (dates + guests)
    try {
      var raw = localStorage.getItem("mm-booking-persist");
      if (raw) {
        var stored = JSON.parse(raw);
        cin  = cin  || parseYmd(stored.checkin);
        cout = cout || parseYmd(stored.checkout);
        // Sync rooms & guests from homepage booking bar
        if (stored.guestsState) {
          try {
            var roomsArr = JSON.parse(stored.guestsState);
            if (Array.isArray(roomsArr) && roomsArr.length) {
              state.rooms    = roomsArr.length;
              state.adults   = roomsArr.reduce(function (s, r) { return s + (parseInt(r.adults, 10) || 0); }, 0);
              state.children = roomsArr.reduce(function (s, r) { return s + (parseInt(r.children, 10) || 0); }, 0);
            }
          } catch (_) {}
        } else {
          if (stored.groupAdults)   state.adults   = Math.max(1, parseInt(stored.groupAdults, 10)   || 2);
          if (stored.groupChildren) state.children = Math.max(0, parseInt(stored.groupChildren, 10) || 0);
        }
      }
    } catch (e) {}

    if (cin && cout && cout > cin) {
      state.checkin  = cin;
      state.checkout = cout;
      // Scroll calendar view to the check-in month
      state.viewYear  = cin.getFullYear();
      state.viewMonth = cin.getMonth();
    }

    // ── Room: sessionStorage set by rooms page ──────────────────────
    try {
      var roomRaw = sessionStorage.getItem("mm_bk_room");
      if (roomRaw) {
        state.selectedRoom = JSON.parse(roomRaw);
        sessionStorage.removeItem("mm_bk_room"); // consume once
      }
    } catch (e) {}

    // ── Sync guest dropdowns to state ───────────────────────────────
    var roomSel  = document.getElementById("bk-rooms");
    var adultSel = document.getElementById("bk-adults");
    var childSel = document.getElementById("bk-children");
    if (roomSel)  roomSel.value  = String(state.rooms);
    if (adultSel) adultSel.value = String(state.adults);
    if (childSel) childSel.value = String(state.children);
  }

  // ── Init ───────────────────────────────────────────────────────
  // ── Card logo detection & highlight ───────────────────────────
  function initCardLogos() {
    var wrap = document.getElementById("bk-card-logos");
    var input = document.getElementById("f-card");
    if (!wrap || !input) return;

    var logos = wrap.querySelectorAll(".mm-bk-card-logo");

    function detectCard(num) {
      var n = num.replace(/\D/g, "");
      if (!n) return null;
      if (/^4/.test(n))                           return "visa";
      if (/^(5[1-5]|2[2-7])/.test(n))             return "mc";
      if (/^3[47]/.test(n))                        return "amex";
      if (/^(6011|64[4-9]|65)/.test(n))            return "disc";
      if (/^35(2[89]|[3-8]\d)/.test(n))            return "jcb";
      if (/^(60|508[5-9]|6521|6522)/.test(n))      return "upi";
      return null;
    }

    input.addEventListener("input", function () {
      var type = detectCard(this.value);
      var isAmex = type === "amex";

      // Auto-format: AMEX → XXXX XXXXXX XXXXX, others → XXXX XXXX XXXX XXXX
      var raw = this.value.replace(/\D/g, "").slice(0, isAmex ? 15 : 16);
      var fmt;
      if (isAmex) {
        fmt = raw.replace(/^(\d{0,4})(\d{0,6})(\d{0,5})$/, function (_, a, b, c) {
          return [a, b, c].filter(Boolean).join(" ");
        });
      } else {
        var chunks = raw.match(/.{1,4}/g);
        fmt = chunks ? chunks.join(" ") : raw;
      }
      this.value = fmt;
      this.maxLength = isAmex ? 17 : 19;

      logos.forEach(function (el) { el.classList.remove("is-active"); });
      if (type) {
        wrap.classList.add("has-active");
        var match = wrap.querySelector("[data-card='" + type + "']");
        if (match) match.classList.add("is-active");
      } else {
        wrap.classList.remove("has-active");
      }
    });

    // Stay motive toggle
    var motiveWrap = document.querySelector(".mm-bk-motive__btns");
    var motiveInput = document.getElementById("f-motive");
    if (motiveWrap && motiveInput) {
      motiveWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".mm-bk-motive__btn");
        if (!btn) return;
        motiveWrap.querySelectorAll(".mm-bk-motive__btn").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        motiveInput.value = btn.getAttribute("data-motive");
      });
    }

    // Name fields → capitalise first letter of each word on blur
    ["f-first", "f-last", "f-card-name"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("blur", function () {
        this.value = this.value.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      });
    });

    // State field → always uppercase, max 2 chars
    var stateEl = document.getElementById("f-addr-state");
    if (stateEl) {
      stateEl.addEventListener("input", function () {
        var pos = this.selectionStart;
        this.value = this.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
        this.setSelectionRange(pos, pos);
      });
    }

    // Expiry auto-format: MM / YY
    var expEl = document.getElementById("f-expiry");
    if (expEl) {
      expEl.addEventListener("input", function (e) {
        var raw = this.value.replace(/\D/g, "").slice(0, 4);
        if (raw.length >= 3) {
          this.value = raw.slice(0, 2) + " / " + raw.slice(2);
        } else {
          this.value = raw;
        }
      });
    }
  }

  (function init() {
    readExternalParams();           // read dates + room from any entry point
    var t = today();
    if (!state.checkin) {           // only default view if no dates passed in
      state.viewYear  = t.getFullYear();
      state.viewMonth = t.getMonth();
    }
    initCustomSelects();

    // Fetch rate data before rendering calendar so prices show correctly.
    // In mock mode this is instant (no-op callback). In live mode it awaits
    // the ASI /rates response — calendar renders only after cache is ready.
    MM_API.fetchRatesForCalendar(function () {
      renderCalendar();
      updateDateDisplay();
      updateCheckAvailBtn();
    });

    bindCalNav();
    bindSidebar();
    bindCheckAvail();
    bindRoomCards();
    bindSummaryContinue();
    bindBookNow();
    initFormValidation();
    initExpandButtons();
    updateStepNav();

    // Dates may be pre-filled from homepage — guest always reviews on calendar first
    initCardLogos();

    // ── Exit animation — reverse of entrance ─────────────────────
    document.addEventListener("click", function (e) {
      var link = e.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href");
      // Only intercept links leaving book.html (not anchors or book.html itself)
      if (!href || href === "#" || href.indexOf("book.html") !== -1) return;
      e.preventDefault();
      var dest = link.href;
      document.body.classList.add("mm-bk-exiting");
      setTimeout(function () { window.location.href = dest; }, 520);
    });
  })();

  // ── Step navigation ────────────────────────────────────────────
  function goToStep(n, bookingSuccess) {
    state.currentStep = n;
    stepEls.forEach(function (el) {
      var s = parseInt(el.getAttribute("data-step"), 10);
      el.classList.toggle("is-active", s === n);
    });
    updateStepNav(bookingSuccess);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (n === 2) {
      // If the pre-selected room (from rooms page) is unavailable for these dates, drop it
      // so autoSelectCheapestRoom can fall back to the cheapest available option
      if (state.selectedRoom) {
        var preCard = document.querySelector(
          ".mm-bk-room-card[data-room-id='" + state.selectedRoom.id + "']"
        );
        if (preCard && preCard.getAttribute("data-available") === "false") {
          state.selectedRoom = null;
        }
      }
      autoSelectCheapestRoom();
      applyRoomCardStates(true);
      populateSummary();
    }
    if (n === 3) populateSummary3();
  }

  function updateStepNav(bookingSuccess) {
    var n = state.currentStep;
    stepItems.forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.toggle("is-active", s === n);
      // Step 4 only gets the tick when booking succeeded
      var done = s < n || (s === 4 && n === 4 && bookingSuccess === true);
      li.classList.toggle("is-done", done);
    });
    btnBack.classList.toggle("is-visible", n > 1 && n < 4);
    btnNext.classList.toggle("is-visible", false);
  }

  btnBack && btnBack.addEventListener("click", function () {
    if (state.currentStep > 1) goToStep(state.currentStep - 1);
  });

  // ── Calendar rendering ─────────────────────────────────────────

  function updateCalendarRoomBanner() {
    var panel = document.querySelector(".mm-bk-cal-panel");
    if (!panel) return;
    var banner = panel.querySelector(".mm-bk-cal-room-banner");
    if (state.selectedRoom) {
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "mm-bk-cal-room-banner";
        banner.style.cssText = "font-size:13px;color:#555;margin-bottom:10px;padding:7px 12px;background:rgba(0,0,0,0.04);border-radius:4px;display:flex;align-items:center;gap:6px;";
        var icon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3.5" width="13" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M5 3.5V2.5M11 3.5V2.5M1.5 7h13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
        banner.innerHTML = icon + '<span></span>';
        var nav = panel.querySelector(".mm-bk-cal__nav");
        if (nav) panel.insertBefore(banner, nav);
        else panel.prepend(banner);
      }
      banner.querySelector("span").textContent = "Showing rates for: " + state.selectedRoom.name;
      banner.style.display = "flex";
    } else if (banner) {
      banner.style.display = "none";
    }
  }

  function renderCalendar() {
    updateCalendarRoomBanner();
    calMonths.innerHTML = "";
    for (var m = 0; m < 2; m++) {
      var mo = state.viewMonth + m;
      var yr = state.viewYear;
      while (mo >= 12) { mo -= 12; yr += 1; }
      calMonths.appendChild(buildMonth(yr, mo));
    }
    btnCalPrev.disabled = isAtMinMonth();
  }

  function isAtMinMonth() {
    var t = today();
    return state.viewYear < t.getFullYear() ||
      (state.viewYear === t.getFullYear() && state.viewMonth <= t.getMonth());
  }

  function buildMonth(yr, mo) {
    var wrap = document.createElement("div");
    wrap.className = "mm-bk-cal__month";

    // Month heading — on mobile include inline prev/next arrows
    var heading = document.createElement("div");
    heading.className = "mm-bk-cal__month-name";

    if (window.innerWidth <= 768) {
      var arrowSvgPrev = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var arrowSvgNext = '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      var inlinePrev = document.createElement("button");
      inlinePrev.type = "button";
      inlinePrev.className = "mm-bk-cal__arrow mm-bk-cal__arrow--inline";
      inlinePrev.setAttribute("aria-label", "Previous month");
      inlinePrev.innerHTML = arrowSvgPrev;
      inlinePrev.addEventListener("click", function () {
        if (isAtMinMonth()) return;
        state.viewMonth--;
        if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
        renderCalendar();
      });

      var nameSpan = document.createElement("span");
      nameSpan.textContent = MONTHS[mo] + " " + yr;

      var inlineNext = document.createElement("button");
      inlineNext.type = "button";
      inlineNext.className = "mm-bk-cal__arrow mm-bk-cal__arrow--inline";
      inlineNext.setAttribute("aria-label", "Next month");
      inlineNext.innerHTML = arrowSvgNext;
      inlineNext.addEventListener("click", function () {
        state.viewMonth++;
        if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
        renderCalendar();
      });

      heading.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:10px 8px 12px;";
      heading.appendChild(inlinePrev);
      heading.appendChild(nameSpan);
      heading.appendChild(inlineNext);

      // Reflect disabled state for prev arrow
      if (isAtMinMonth()) inlinePrev.disabled = true;
    } else {
      heading.textContent = MONTHS[mo] + " " + yr;
    }

    wrap.appendChild(heading);

    // Grid
    var grid = document.createElement("div");
    grid.className = "mm-bk-cal__grid";

    // Day-of-week headers
    DOW.forEach(function (d) {
      var h = document.createElement("div");
      h.className = "mm-bk-cal__dow";
      h.textContent = d;
      h.style.cssText = "height:28px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;box-sizing:border-box;";
      grid.appendChild(h);
    });

    // First day of month
    var first = new Date(yr, mo, 1);
    var startDow = first.getDay(); // 0=Sun

    // Empty cells before first day
    for (var i = 0; i < startDow; i++) {
      var empty = document.createElement("div");
      empty.className = "mm-bk-cal__cell is-past";
      empty.style.cssText = "height:54px;box-sizing:border-box;";
      grid.appendChild(empty);
    }

    // Days
    var daysInMonth = new Date(yr, mo + 1, 0).getDate();
    var todayMs = today().getTime();

    for (var day = 1; day <= daysInMonth; day++) {
      var d = new Date(yr, mo, day);
      var key = fmtKey(d);
      var rate = getRateForDate(d);
      var isPast = d.getTime() < todayMs;
      var isUnavail = !isPast && rate === null;

      var cell = document.createElement("div");
      cell.className = "mm-bk-cal__cell";
      cell.style.cssText = "height:54px;box-sizing:border-box;";
      if (isPast) cell.classList.add("is-past");
      else if (isUnavail) cell.classList.add("is-unavail");

      // Check selection state
      var checkinKey = state.checkin ? fmtKey(state.checkin) : null;
      var checkoutKey = state.checkout ? fmtKey(state.checkout) : null;

      if (checkinKey === key) cell.classList.add("is-checkin");
      if (checkoutKey === key) cell.classList.add("is-checkout");
      if (state.checkin && state.checkout &&
          d.getTime() > state.checkin.getTime() &&
          d.getTime() < state.checkout.getTime()) {
        cell.classList.add("is-in-range");
      }

      var dayEl = document.createElement("div");
      dayEl.className = "mm-bk-cal__day";
      dayEl.textContent = day;
      cell.appendChild(dayEl);

      if (rate !== null && !isPast) {
        var rateEl = document.createElement("div");
        rateEl.className = "mm-bk-cal__rate";
        rateEl.textContent = "$" + rate;
        if (checkoutKey === key) rateEl.style.visibility = "hidden";
        cell.appendChild(rateEl);
      }

      if (!isPast && !isUnavail) {
        (function (date) {
          cell.addEventListener("click", function () { onDateClick(date); });
        })(d);
      }

      grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function onDateClick(d) {
    if (state.selecting === "checkin" || !state.checkin) {
      state.checkin = d;
      state.checkout = null;
      state.selecting = "checkout";
    } else {
      // clicking before checkin resets
      if (d.getTime() <= state.checkin.getTime()) {
        state.checkin = d;
        state.checkout = null;
        state.selecting = "checkout";
      } else {
        state.checkout = d;
        state.selecting = "checkin";
      }
    }
    renderCalendar();
    updateDateDisplay();
    updateCheckAvailBtn();
  }

  function updateDateDisplay() {
    var arrDay = document.getElementById("bk-arrival-day");
    var arrMo = document.getElementById("bk-arrival-month");
    var depDay = document.getElementById("bk-departure-day");
    var depMo = document.getElementById("bk-departure-month");
    var arrCol = arrDay ? arrDay.closest(".mm-bk-dates__col") : null;
    var depCol = depDay ? depDay.closest(".mm-bk-dates__col") : null;

    if (state.checkin) {
      arrDay.textContent = state.checkin.getDate();
      arrMo.textContent = fmtMonth(state.checkin);
      if (arrCol) arrCol.classList.add("is-selected");
    } else {
      arrDay.innerHTML = "&nbsp;";
      arrMo.innerHTML = "&nbsp;";
      if (arrCol) arrCol.classList.remove("is-selected");
    }

    if (state.checkout) {
      depDay.textContent = state.checkout.getDate();
      depMo.textContent = fmtMonth(state.checkout);
      if (depCol) depCol.classList.add("is-selected");
    } else {
      depDay.innerHTML = "&nbsp;";
      depMo.innerHTML = "&nbsp;";
      if (depCol) depCol.classList.remove("is-selected");
    }
  }

  function updateCheckAvailBtn() {
    var visible = !!(state.checkin && state.checkout);
    checkAvailBtn.classList.toggle("is-visible", visible);
  }

  // ── Calendar navigation ────────────────────────────────────────
  function bindCalNav() {
    btnCalPrev.addEventListener("click", function () {
      if (isAtMinMonth()) return;
      state.viewMonth--;
      if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
      renderCalendar();
    });

    btnCalNext.addEventListener("click", function () {
      state.viewMonth++;
      if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
      renderCalendar();
    });
  }

  // ── Sidebar selects ────────────────────────────────────────────
  function bindSidebar() {
    var roomSel = document.getElementById("bk-rooms");
    var adultSel = document.getElementById("bk-adults");
    var childSel = document.getElementById("bk-children");

    function onOccupancyChange() {
      // Availability results are now stale — reset room data-available attrs
      // so the next Check Availability call starts clean
      document.querySelectorAll(".mm-bk-room-card[data-available]").forEach(function (card) {
        card.removeAttribute("data-available");
      });
      // Show Check Availability button again so the user knows to re-check
      updateCheckAvailBtn();
    }

    if (roomSel)  roomSel.addEventListener("change",  function () { state.rooms    = parseInt(this.value, 10); onOccupancyChange(); });
    if (adultSel) adultSel.addEventListener("change", function () { state.adults   = parseInt(this.value, 10); onOccupancyChange(); });
    if (childSel) childSel.addEventListener("change", function () { state.children = parseInt(this.value, 10); onOccupancyChange(); });
  }

  // ── Check Availability ─────────────────────────────────────────
  function bindCheckAvail() {
    if (!checkAvailBtn) return;
    checkAvailBtn.addEventListener("click", function () {
      if (!state.checkin || !state.checkout) return;

      // Loading state
      var origText = checkAvailBtn.textContent;
      checkAvailBtn.textContent = "Checking…";
      checkAvailBtn.disabled = true;
      if (window.MMLoader) MMLoader.show("Checking availability…");

      MM_API.checkAvailability(
        state.checkin,
        state.checkout,
        { rooms: state.rooms, adults: state.adults, children: state.children },
        function (err, results) {
          checkAvailBtn.textContent = origText;
          checkAvailBtn.disabled = false;
          if (window.MMLoader) MMLoader.hide();

          if (err) {
            console.error("Availability check failed:", err);
            // Fall through to step 2 — room cards keep their HTML defaults
          } else {
            var nights = daysBetween(state.checkin, state.checkout);
            // Update each room card's availability and live price from API response
            results.forEach(function (item) {
              var card = document.querySelector(
                ".mm-bk-room-card[data-room-id='" + item.roomId + "']"
              );
              if (!card) return;
              card.setAttribute("data-available", item.available ? "true" : "false");

              // Update displayed price with live nightly rate (item.rate is already per-night)
              if (item.available && item.rate > 0) {
                var nightly = Math.round(item.rate);
                var priceEl = card.querySelector(".mm-bk-room-card__price");
                if (priceEl) {
                  priceEl.innerHTML = "$" + nightly + '<span class="mm-bk-room-card__price-night"> / night</span>';
                }
                // Keep data-price in sync so total calculation is correct
                var btn = card.querySelector(".mm-bk-room-card__select");
                if (btn) btn.setAttribute("data-price", String(nightly));
              }
            });
          }

          updateBookingBar();
          goToStep(2);
        }
      );
    });
  }

  function updateBookingBar() {
    var ci = document.getElementById("bk-bar-checkin");
    var co = document.getElementById("bk-bar-checkout");
    if (ci && state.checkin) ci.textContent = fmtLong(state.checkin);
    if (co && state.checkout) co.textContent = fmtLong(state.checkout);
  }

  // ── Stay summary (Step 2) ──────────────────────────────────────
  function populateSummary() {
    if (!state.checkin || !state.checkout) return;
    var nights = daysBetween(state.checkin, state.checkout);

    setText("bk-sum-arriving", "Arriving: " + fmtShort(state.checkin));
    setText("bk-sum-departing", "Departing: " + fmtShort(state.checkout));
    setText("bk-sum-nights", nights + (nights === 1 ? " Night" : " Nights"));

    if (state.selectedRoom) {
      updateSummaryRoom(
        "bk-sum-room-name", "bk-sum-room-meta", "bk-sum-room-thumb",
        "bk-sum-rates", "bk-sub-room-total", "bk-sub-taxes",
        "bk-sum-total", "bk-sum-subs", "bk-sum-total-block", "bk-sum-continue"
      );
    }
  }

  function updateSummaryRoom(nameId, metaId, thumbId, ratesId, subRoomId, subTaxId, totalId, subsId, totalBlockId, continueId) {
    if (!state.selectedRoom || !state.checkin || !state.checkout) return;
    var nights = daysBetween(state.checkin, state.checkout);
    var room = state.selectedRoom;

    setText(nameId, room.name);
    setText(metaId, state.adults + " Adult" + (state.adults > 1 ? "s" : "") + (state.children > 0 ? ", " + state.children + " Child" + (state.children > 1 ? "ren" : "") : "") + "\nNightly Rate");

    var thumb = document.getElementById(thumbId);
    if (thumb) { thumb.src = room.thumb; thumb.alt = room.name; thumb.style.display = ""; }

    // Build rate rows
    var ratesEl = document.getElementById(ratesId);
    if (ratesEl) {
      ratesEl.innerHTML = "";
      var subtotalCents = 0;
      var cur = new Date(state.checkin);
      for (var i = 0; i < nights; i++) {
        var rawRate = getRateForDate(cur);
        var rate = rawRate !== null ? rawRate : room.price;
        var rateCents = dollarsToCents(rate);
        subtotalCents += rateCents;
        var row = document.createElement("div");
        row.className = "mm-bk-summary__rate-row";
        row.innerHTML = "<span>" + fmtLong(cur) + "</span><span>" + fmtCents(rateCents) + "</span>";
        ratesEl.appendChild(row);
        cur = addDays(cur, 1);
      }

      var taxCents = cityTax10Cents(subtotalCents);
      var totalCents = subtotalCents + taxCents;

      setText(subRoomId, fmtCents(subtotalCents));
      setText(subTaxId, fmtCents(taxCents));
      setText(totalId, fmtCents(totalCents));

      show(subsId);
      show(totalBlockId);
      if (continueId) show(continueId);
    }
  }

  function populateSummary3() {
    if (!state.checkin || !state.checkout) return;
    var nights = daysBetween(state.checkin, state.checkout);
    setText("bk-sum3-arriving", "Arriving: " + fmtShort(state.checkin));
    setText("bk-sum3-departing", "Departing: " + fmtShort(state.checkout));
    setText("bk-sum3-nights", nights + (nights === 1 ? " Night" : " Nights"));
    if (state.selectedRoom) {
      updateSummaryRoom(
        "bk-sum3-room-name", "bk-sum3-room-meta", "bk-sum3-room-thumb",
        "bk-sum3-rates", "bk-sub3-room-total", "bk-sub3-taxes",
        "bk-sum3-total", "bk-sum3-subs", "bk-sum3-total-block", null
      );
    }
    updateCancelNotice();
  }

  function updateCancelNotice() {
    var el = document.getElementById("bk-cancel-notice");
    if (!el || !state.checkin) return;

    // Cancellation deadline = 48 hours before check-in at 3:00 PM
    var checkinTime = new Date(state.checkin.getTime());
    checkinTime.setHours(15, 0, 0, 0); // 3:00 PM check-in
    var deadline = new Date(checkinTime.getTime() - 48 * 60 * 60 * 1000); // minus 48 hours

    var now = new Date();
    var DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    if (now < deadline) {
      // Cancellation still possible
      var dlStr = DAYS[deadline.getDay()] + ", " + MONTHS_FULL[deadline.getMonth()] + " " + deadline.getDate() + " at 3:00 PM";
      el.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 14A6 6 0 108 2a6 6 0 000 12z" stroke="currentColor" stroke-width="1.2"/><path d="M8 5v3.5L10 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
        "Free cancellation before <strong>" + dlStr + "</strong>";
      el.className = "mm-bk-cancel-notice mm-bk-cancel-notice--free";
    } else {
      // Within 48 hours of check-in — no cancellation
      el.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 14A6 6 0 108 2a6 6 0 000 12z" stroke="currentColor" stroke-width="1.2"/><path d="M8 5v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="11" r="0.6" fill="currentColor"/></svg>' +
        "Non-refundable — cancellation is no longer available for these dates.";
      el.className = "mm-bk-cancel-notice mm-bk-cancel-notice--none";
    }
  }

  // ── Room cards ─────────────────────────────────────────────────
  function autoSelectCheapestRoom() {
    if (state.selectedRoom) return; // keep room from rooms page or manual choice
    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".mm-bk-room-card[data-available='true']")
    );
    if (!cards.length) return;
    var nights = (state.checkin && state.checkout) ? daysBetween(state.checkin, state.checkout) : 0;
    var cheapest = null;
    var cheapestTotal = Infinity;
    cards.forEach(function (card) {
      var btn = card.querySelector(".mm-bk-room-card__select");
      if (!btn) return;
      var roomId = btn.getAttribute("data-room");
      var basePrice = parseInt(btn.getAttribute("data-price"), 10);
      // Use actual API rates for the stay period — falls back to base price per night
      var total = 0;
      if (nights > 0 && state.checkin) {
        var cur = new Date(state.checkin);
        for (var i = 0; i < nights; i++) {
          var r = MM_API.getRateForDate(roomId, cur);
          total += (r !== null ? r : basePrice);
          cur = addDays(cur, 1);
        }
      } else {
        total = basePrice;
      }
      if (total < cheapestTotal) {
        cheapestTotal = total;
        cheapest = btn;
      }
    });
    if (cheapest) {
      state.selectedRoom = {
        id: cheapest.getAttribute("data-room"),
        name: cheapest.getAttribute("data-name"),
        price: parseInt(cheapest.getAttribute("data-price"), 10),
        thumb: cheapest.getAttribute("data-thumb")
      };
    }
  }

  function applyRoomCardStates(sort) {
    var container = document.getElementById("bk-room-cards");
    if (!container) return;
    var cards = Array.prototype.slice.call(container.querySelectorAll(".mm-bk-room-card"));

    // Apply unavailable state & update button text
    cards.forEach(function (card) {
      var isUnavail = card.getAttribute("data-available") === "false";
      var btn = card.querySelector(".mm-bk-room-card__select");
      card.classList.toggle("is-unavail", isUnavail);
      if (btn) {
        btn.disabled = isUnavail;
        if (isUnavail) {
          btn.textContent = "Not Available for These Dates";
        } else if (state.selectedRoom && state.selectedRoom.id === card.getAttribute("data-room-id")) {
          btn.textContent = "Selected";
        } else {
          btn.textContent = "Select";
        }
      }
      var isSelected = state.selectedRoom && state.selectedRoom.id === card.getAttribute("data-room-id");
      card.classList.toggle("is-selected", isSelected);
    });

    // Sort only on initial load: selected → available → unavailable
    if (sort) {
      cards.sort(function (a, b) {
        function rank(card) {
          if (state.selectedRoom && state.selectedRoom.id === card.getAttribute("data-room-id")) return 0;
          if (card.getAttribute("data-available") === "false") return 2;
          return 1;
        }
        return rank(a) - rank(b);
      });
      cards.forEach(function (card) { container.appendChild(card); });
    }

    moveSummaryMobile();
  }

  // On mobile: [selected card] → [summary + Continue] → [other cards]
  function moveSummaryMobile() {
    if (window.innerWidth > 768) return;
    var summary = document.getElementById("bk-summary-s2");
    var container = document.getElementById("bk-room-cards");
    if (!summary || !container) return;

    var selected = container.querySelector(".mm-bk-room-card.is-selected");
    if (selected) {
      // Only move the summary — the card itself never changes position
      container.insertBefore(summary, selected.nextSibling);
    } else {
      // No selection yet — summary lives after all cards
      container.appendChild(summary);
    }
  }

  function bindRoomCards() {
    // Select buttons
    var selectBtns = document.querySelectorAll(".mm-bk-room-card__select");
    selectBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".mm-bk-room-card");
        state.selectedRoom = {
          id: btn.getAttribute("data-room"),
          name: btn.getAttribute("data-name"),
          price: parseInt(btn.getAttribute("data-price"), 10),
          thumb: btn.getAttribute("data-thumb")
        };
        applyRoomCardStates(false);
        renderCalendar(); // refresh calendar prices/availability for this room
        // Update summary immediately
        updateSummaryRoom(
          "bk-sum-room-name", "bk-sum-room-meta", "bk-sum-room-thumb",
          "bk-sum-rates", "bk-sub-room-total", "bk-sub-taxes",
          "bk-sum-total", "bk-sum-subs", "bk-sum-total-block", "bk-sum-continue"
        );
      });
    });

    // Carousel prev/next
    var carousels = document.querySelectorAll(".mm-bk-room-card__img-wrap");
    carousels.forEach(function (wrap) {
      var photos = JSON.parse(wrap.getAttribute("data-photos") || "[]");
      var idx = 0;
      var img = wrap.querySelector("img");
      var prevBtn = wrap.querySelector(".mm-bk-room-card__carousel-prev");
      var nextBtn = wrap.querySelector(".mm-bk-room-card__carousel-next");

      function updateCarousel() {
        img.style.opacity = "0";
        setTimeout(function () {
          img.src = photos[idx];
          img.style.opacity = "1";
        }, 180);
        if (prevBtn) prevBtn.style.opacity = idx === 0 ? "0" : "";
        if (nextBtn) nextBtn.style.opacity = idx === photos.length - 1 ? "0" : "";
      }

      if (prevBtn) {
        prevBtn.style.opacity = "0"; // hidden on first image
        prevBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (idx > 0) { idx--; updateCarousel(); }
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (idx < photos.length - 1) { idx++; updateCarousel(); }
        });
      }

      // Touch swipe support
      var touchStartX = 0;
      wrap.addEventListener("touchstart", function (e) {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      wrap.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < 40) return; // ignore tiny taps
        if (dx < 0 && idx < photos.length - 1) { idx++; updateCarousel(); }
        if (dx > 0 && idx > 0)                 { idx--; updateCarousel(); }
      }, { passive: true });
    });
  }

  // ── Summary continue ───────────────────────────────────────────
  function bindSummaryContinue() {
    var btn = document.getElementById("bk-sum-continue");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!state.selectedRoom) return;
      goToStep(3);
    });
  }

  // ── Book Now ───────────────────────────────────────────────────
  // ── Real-time form validation → enable Book Now ────────────────
  function initFormValidation() {
    var btn = document.getElementById("bk-book-now");
    if (!btn) return;

    var REQUIRED = [
      "f-first", "f-last", "f-email", "f-phone",
      "f-card", "f-card-name", "f-expiry", "f-cvv",
      "f-addr-street", "f-addr-city", "f-addr-state", "f-addr-zip"
    ];

    function isEmailValid(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
    function isCardValid(v)  { return v.replace(/\D/g, "").length >= 13; }
    function isExpiryValid(v) {
      var m = v.replace(/\s/g, "").match(/^(\d{2})\/(\d{2})$/);
      if (!m) return false;
      var mo = parseInt(m[1], 10), yr = parseInt("20" + m[2], 10);
      if (mo < 1 || mo > 12) return false;
      var now = new Date();
      return yr > now.getFullYear() || (yr === now.getFullYear() && mo >= now.getMonth() + 1);
    }
    function isCvvValid(v) { return /^\d{3,4}$/.test(v.trim()); }

    var hint = document.getElementById("bk-book-hint");

    function check() {
      var ok = REQUIRED.every(function (id) {
        var el = document.getElementById(id);
        if (!el) return false;
        var v = el.value;
        if (id === "f-email")  return isEmailValid(v);
        if (id === "f-card")   return isCardValid(v);
        if (id === "f-expiry") return isExpiryValid(v);
        if (id === "f-cvv")    return isCvvValid(v);
        if (id === "f-addr-state") return v.trim().length === 2;
        return v.trim().length > 0;
      });
      btn.disabled = !ok;
      if (hint) hint.classList.toggle("is-hidden", ok);
    }

    REQUIRED.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", check);
    });

    check(); // run once on load (stays disabled)
  }

  function bindBookNow() {
    var btn = document.getElementById("bk-book-now");
    if (!btn) return;
    btn.addEventListener("click", function () {
      // Collect booking data for the API
      var nights = (state.checkin && state.checkout)
        ? daysBetween(state.checkin, state.checkout) : 0;
      var subtotalCents = 0;
      if (state.selectedRoom && state.checkin && state.checkout) {
        var cur = new Date(state.checkin);
        for (var i = 0; i < nights; i++) {
          var r = getRateForDate(cur);
          var rate = r !== null ? r : state.selectedRoom.price;
          subtotalCents += dollarsToCents(rate);
          cur = addDays(cur, 1);
        }
      }
      var taxCents = cityTax10Cents(subtotalCents);
      var totalCents = subtotalCents + taxCents;
      var total = centsToMoney(totalCents);

      var cardEl = document.getElementById("f-card");
      var cardVal = cardEl ? cardEl.value.replace(/\s/g, "") : "";

      var bookingData = {
        roomId   : state.selectedRoom ? state.selectedRoom.id    : "",
        roomName : state.selectedRoom ? state.selectedRoom.name  : "",
        checkin  : state.checkin,
        checkout : state.checkout,
        rooms    : state.rooms,
        adults   : state.adults,
        children : state.children,
        total    : total,
        guest: {
          firstName      : (document.getElementById("f-first")       || {}).value || "",
          lastName       : (document.getElementById("f-last")        || {}).value || "",
          email          : (document.getElementById("f-email")       || {}).value || "",
          phone          : (document.getElementById("f-phone")       || {}).value || "",
          address        : (document.getElementById("f-addr-street") || {}).value || "",
          city           : (document.getElementById("f-addr-city")   || {}).value || "",
          state          : (document.getElementById("f-addr-state")  || {}).value || "",
          zip            : (document.getElementById("f-addr-zip")    || {}).value || "",
          motive         : (document.getElementById("f-motive")      || {}).value || "",
          specialRequests: (document.getElementById("f-request")     || {}).value || ""
        },
        payment: {
          nameOnCard: (document.getElementById("f-card-name") || {}).value || "",
          cardLast4 : cardVal.slice(-4),   // only the last 4 digits — never log or store full PAN
          expiry    : (document.getElementById("f-expiry") || {}).value || ""
        }
      };

      // Loading state
      var origText = btn.textContent;
      btn.textContent = "Processing…";
      btn.disabled = true;

      var successEl = document.getElementById("bk-confirm-success");
      var errorEl   = document.getElementById("bk-confirm-error");

      // Step 1: tokenize the card via payment gateway (PCI compliance)
      // Raw card data never leaves the browser — only the token is sent to ASI
      var cardEl     = document.getElementById("f-card");
      var expiryEl   = document.getElementById("f-expiry");
      var cvvEl      = document.getElementById("f-cvv");
      var cardNameEl = document.getElementById("f-card-name");

      MM_API.capturePaymentToken({
        nameOnCard : cardNameEl ? cardNameEl.value : "",
        number     : cardEl    ? cardEl.value.replace(/\s/g, "")  : "",
        expiry     : expiryEl  ? expiryEl.value  : "",
        cvv        : cvvEl     ? cvvEl.value     : ""
      }, function (tokenErr, paymentToken) {
        if (tokenErr) {
          btn.textContent = origText;
          btn.disabled = false;
          console.error("Payment tokenization failed:", tokenErr);
          if (successEl) successEl.hidden = true;
          if (errorEl)   errorEl.hidden   = false;
          goToStep(4, false);
          return;
        }

        // Attach token to bookingData; raw card fields are no longer referenced
        bookingData.payment.paymentToken = paymentToken;

        // Step 2: submit the booking with the token
        MM_API.submitBooking(bookingData, function (err, result) {
          btn.textContent = origText;
          btn.disabled = false;

          var success = !err && result && result.success;

          if (success) {
            state.bookingRef = result.refNumber;
            populateConfirmation();
            if (successEl) successEl.hidden = false;
            if (errorEl)   errorEl.hidden   = true;
            goToStep(4, true);
          } else {
            if (successEl) successEl.hidden = true;
            if (errorEl)   errorEl.hidden   = false;
            goToStep(4, false);
          }
        });
      }); // end capturePaymentToken
    });

    // "Choose Another Room" on error panel → back to step 2
    var errBack = document.getElementById("bk-err-back");
    if (errBack) {
      errBack.addEventListener("click", function () {
        goToStep(2);
      });
    }
  }

  function populateConfirmation() {
    var email = document.getElementById("f-email");
    var first = document.getElementById("f-first");
    var last = document.getElementById("f-last");

    var refEl    = document.getElementById("bk-conf-ref");
    var nameEl   = document.getElementById("bk-conf-name");
    var emailEl  = document.getElementById("bk-conf-email");
    var ciEl     = document.getElementById("bk-conf-checkin");
    var coEl     = document.getElementById("bk-conf-checkout");
    var roomEl   = document.getElementById("bk-conf-room");
    var guestsEl = document.getElementById("bk-conf-guests");
    var totalEl  = document.getElementById("bk-conf-total");

    if (refEl) refEl.textContent = state.bookingRef || genRef();
    if (nameEl && first && last) nameEl.textContent = (first.value + " " + last.value).trim();
    if (emailEl && email) emailEl.textContent = email.value;

    if (ciEl && state.checkin) ciEl.textContent = fmtLong(state.checkin) + " · Check-in after 3:00 PM";
    if (coEl && state.checkout) coEl.textContent = fmtLong(state.checkout) + " · Check-out by 11:00 AM";
    if (roomEl && state.selectedRoom) roomEl.textContent = state.selectedRoom.name;

    var guestStr = state.adults + " Adult" + (state.adults > 1 ? "s" : "");
    if (state.children > 0) guestStr += ", " + state.children + " Child" + (state.children > 1 ? "ren" : "");
    if (guestsEl) guestsEl.textContent = guestStr;

    // Calculate total
    if (totalEl && state.checkin && state.checkout && state.selectedRoom) {
      var nights = daysBetween(state.checkin, state.checkout);
      var subtotalCents = 0;
      var cur = new Date(state.checkin);
      for (var i = 0; i < nights; i++) {
        var r = getRateForDate(cur);
        var rate = r !== null ? r : state.selectedRoom.price;
        subtotalCents += dollarsToCents(rate);
        cur = addDays(cur, 1);
      }
      var totalCents = subtotalCents + cityTax10Cents(subtotalCents);
      totalEl.textContent = fmtCents(totalCents) + " (including taxes & fees)";
    }
  }

  // ── Helpers ────────────────────────────────────────────────────
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function show(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "";
  }

  // ── Room card photo lightbox ────────────────────────────────────
  function initExpandButtons() {
    var overlay = document.createElement("div");
    overlay.id = "bk-lightbox";
    overlay.innerHTML =
      '<button class="bk-lb__close" aria-label="Close">' +
        '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="18" y2="18"/><line x1="18" y1="4" x2="4" y2="18"/></svg>' +
      '</button>' +
      '<button class="bk-lb__nav bk-lb__prev" aria-label="Previous">' +
        '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="14 4 6 11 14 18"/></svg>' +
      '</button>' +
      '<img class="bk-lb__img" src="" alt="" />' +
      '<button class="bk-lb__nav bk-lb__next" aria-label="Next">' +
        '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 4 16 11 8 18"/></svg>' +
      '</button>' +
      '<div class="bk-lb__counter"></div>';
    document.body.appendChild(overlay);

    var lbImg     = overlay.querySelector(".bk-lb__img");
    var lbCounter = overlay.querySelector(".bk-lb__counter");
    var currentImgs = [];
    var currentIdx  = 0;

    function openLightbox(imgs, idx) {
      currentImgs = imgs;
      currentIdx  = idx;
      showSlide();
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    function showSlide() {
      lbImg.src = currentImgs[currentIdx];
      lbCounter.textContent = (currentIdx + 1) + " / " + currentImgs.length;
    }

    overlay.querySelector(".bk-lb__close").addEventListener("click", closeLightbox);
    overlay.querySelector(".bk-lb__prev").addEventListener("click", function () {
      currentIdx = (currentIdx - 1 + currentImgs.length) % currentImgs.length;
      showSlide();
    });
    overlay.querySelector(".bk-lb__next").addEventListener("click", function () {
      currentIdx = (currentIdx + 1) % currentImgs.length;
      showSlide();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape")    closeLightbox();
      if (e.key === "ArrowLeft") { currentIdx = (currentIdx - 1 + currentImgs.length) % currentImgs.length; showSlide(); }
      if (e.key === "ArrowRight"){ currentIdx = (currentIdx + 1) % currentImgs.length; showSlide(); }
    });

    // Wire expand buttons
    document.querySelectorAll(".mm-bk-room-card").forEach(function (card) {
      var expandBtn = card.querySelector(".mm-bk-room-card__expand");
      var imgWrap   = card.querySelector(".mm-bk-room-card__img-wrap");
      if (!expandBtn || !imgWrap) return;
      expandBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var photos = [];
        try { photos = JSON.parse(imgWrap.getAttribute("data-photos") || "[]"); } catch (_) {}
        var idx = parseInt(imgWrap.getAttribute("data-idx") || "0", 10);
        if (!photos.length) {
          var img = imgWrap.querySelector("img");
          if (img) photos = [img.getAttribute("src")];
        }
        openLightbox(photos, Math.max(0, idx));
      });
    });
  }

})();
