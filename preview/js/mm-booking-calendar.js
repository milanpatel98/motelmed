/**
 * Hero booking: dark dual-month calendar — range flow (check-in → check-out).
 * Either row opens the same picker; second date closes and applies.
 */
(function () {
  var inEl = document.getElementById("mm-book-checkin");
  var outEl = document.getElementById("mm-book-checkout");
  var triggerIn = document.getElementById("mm-book-hero-trigger-in");
  var triggerOut = document.getElementById("mm-book-hero-trigger-out");
  if (!inEl || !outEl || !triggerIn || !triggerOut) return;

  var OPEN = "mm-book-cal--open";
  var PAGE_LOCK = "mm-book-cal--lock";
  var today = startOfDay(new Date());

  /** 0 = next click is check-in; 1 = next click is check-out */
  var rangeStep = 0;
  var viewStart = null;
  var anchorEl = null;
  var snapIn = "";
  var snapOut = "";
  /** Provisional range while open; committed only on Done or trigger-toggle close. */
  var draftIn = "";
  var draftOut = "";
  var root;
  var panel;
  var btnPrev;
  var btnNext;
  var title0;
  var title1;
  var grid0;
  var grid1;

  var DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function pad(n) {
    return String(n).length < 2 ? "0" + n : String(n);
  }

  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
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

  function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  function calLocale() {
    try {
      if (typeof window.mmCurrentLang === "function" && window.mmCurrentLang() === "es") return "es-ES";
    } catch (_) {}
    return "en-US";
  }

  function monthTitle(d) {
    try {
      return d.toLocaleDateString(calLocale(), { month: "long", year: "numeric" });
    } catch (_) {
      return "";
    }
  }

  function minViewMonth() {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  function clampViewStart() {
    var lo = minViewMonth();
    if (viewStart.getTime() < lo.getTime()) viewStart = new Date(lo);
  }

  function canPrevMonth() {
    var prev = addMonths(viewStart, -1);
    return prev.getTime() >= minViewMonth().getTime();
  }

  function setTriggersActive() {
    var open = root.classList.contains(OPEN);
    triggerIn.classList.toggle("is-active", open);
    triggerOut.classList.toggle("is-active", open);
    triggerIn.setAttribute("aria-expanded", open ? "true" : "false");
    triggerOut.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function positionPanel() {
    if (!panel || !anchorEl) return;
    var rect = anchorEl.getBoundingClientRect();
    var margin = 10;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pw = panel.offsetWidth || 560;

    var cx = rect.left + rect.width / 2 - pw / 2;
    cx = Math.max(margin, Math.min(cx, vw - pw - margin));
    panel.style.left = cx + "px";

    panel.style.maxHeight = "";
    panel.style.top = "";
    panel.style.bottom = "";

    var spaceBelow = vh - rect.bottom - margin;
    var spaceAbove = rect.top - margin;
    var openUp = spaceAbove > spaceBelow;

    if (openUp) {
      panel.style.bottom = vh - rect.top + margin + "px";
      panel.style.top = "auto";
    } else {
      panel.style.top = rect.bottom + margin + "px";
      panel.style.bottom = "auto";
    }

    var pr = panel.getBoundingClientRect();
    if (pr.bottom > vh - margin) {
      var shift = pr.bottom - (vh - margin);
      if (openUp) {
        panel.style.bottom = vh - rect.top + margin + shift + "px";
      } else {
        panel.style.top = rect.bottom + margin - shift + "px";
      }
    }
    pr = panel.getBoundingClientRect();
    if (pr.top < margin) {
      panel.style.top = margin + "px";
      panel.style.bottom = "auto";
    }
    pr = panel.getBoundingClientRect();
    if (pr.bottom > vh - margin) {
      panel.style.top = Math.max(margin, vh - margin - pr.height) + "px";
      panel.style.bottom = "auto";
    }
  }

  function lockPageScroll() {
    document.documentElement.classList.add(PAGE_LOCK);
    document.body.classList.add(PAGE_LOCK);
  }

  function unlockPageScroll() {
    document.documentElement.classList.remove(PAGE_LOCK);
    document.body.classList.remove(PAGE_LOCK);
  }

  function dayTime(d) {
    return startOfDay(d).getTime();
  }

  function renderMonthGrid(container, monthStart) {
    container.innerHTML = "";
    var dowRow = document.createElement("div");
    dowRow.className = "mm-book-cal__dow";
    for (var i = 0; i < 7; i++) {
      var s = document.createElement("span");
      s.textContent = DOW[i];
      dowRow.appendChild(s);
    }
    container.appendChild(dowRow);

    var days = document.createElement("div");
    days.className = "mm-book-cal__days";

    var first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
    var lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    var padCount = first.getDay();

    for (var p = 0; p < padCount; p++) {
      var empty = document.createElement("div");
      empty.className = "mm-book-cal__day mm-book-cal__day--empty";
      days.appendChild(empty);
    }

    var ci = parseYmd(draftIn);
    var co = parseYmd(draftOut);
    var rangeLo = ci ? dayTime(ci) : null;
    var rangeHi = co ? dayTime(co) : null;

    for (var day = 1; day <= lastDay; day++) {
      (function (dayNum) {
        var d = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNum);
        var ts = dayTime(d);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mm-book-cal__day";
        btn.textContent = String(dayNum);

        var disabled = false;
        if (ts < today.getTime()) disabled = true;
        if (rangeStep === 1 && ci) {
          if (ts <= dayTime(ci)) disabled = true;
        }

        if (disabled) {
          btn.classList.add("mm-book-cal__day--disabled");
          btn.disabled = true;
        } else {
          btn.addEventListener("click", function () {
            pickDate(d);
          });
        }

        if (ci && co && ts >= rangeLo && ts <= rangeHi) {
          btn.classList.add("mm-book-cal__day--in-range");
          if (ts === rangeLo) btn.classList.add("mm-book-cal__day--range-start");
          if (ts === rangeHi) btn.classList.add("mm-book-cal__day--range-end");
        } else if (ci && !co && ts === rangeLo) {
          btn.classList.add("mm-book-cal__day--range-start");
          btn.classList.add("mm-book-cal__day--selected");
        }

        days.appendChild(btn);
      })(day);
    }

    container.appendChild(days);
  }

  function render() {
    clampViewStart();
    var m0 = viewStart;
    var m1 = addMonths(viewStart, 1);
    title0.textContent = monthTitle(m0);
    title1.textContent = monthTitle(m1);
    btnPrev.disabled = !canPrevMonth();
    btnNext.disabled = false;
    renderMonthGrid(grid0, m0);
    renderMonthGrid(grid1, m1);
  }

  function pickDate(d) {
    var ts = dayTime(d);
    if (ts < today.getTime()) return;

    if (rangeStep === 0) {
      draftIn = ymd(d);
      draftOut = "";
      rangeStep = 1;
      requestAnimationFrame(render);
      return;
    }

    var cin = parseYmd(draftIn);
    if (!cin) {
      rangeStep = 0;
      pickDate(d);
      return;
    }
    if (ts <= dayTime(cin)) {
      draftIn = ymd(d);
      draftOut = "";
      rangeStep = 1;
      requestAnimationFrame(render);
      return;
    }

    draftOut = ymd(d);
    requestAnimationFrame(render);
  }

  function detachListeners() {
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onDocClickCapture, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll, true);
  }

  function commitAndClose() {
    inEl.value = draftIn;
    outEl.value = draftOut;
    inEl.dispatchEvent(new Event("change", { bubbles: true }));
    outEl.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof window.mmBookingRefresh === "function") window.mmBookingRefresh();
    closeCommitted();
  }

  function closeCommitted() {
    root.classList.remove(OPEN);
    root.setAttribute("hidden", "");
    unlockPageScroll();
    anchorEl = null;
    detachListeners();
    triggerIn.classList.remove("is-active");
    triggerOut.classList.remove("is-active");
    triggerIn.setAttribute("aria-expanded", "false");
    triggerOut.setAttribute("aria-expanded", "false");
  }

  function cancelAndClose() {
    inEl.value = snapIn;
    outEl.value = snapOut;
    inEl.dispatchEvent(new Event("change", { bubbles: true }));
    outEl.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof window.mmBookingRefresh === "function") window.mmBookingRefresh();
    closeCommitted();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelAndClose();
    }
  }

  /** Capture phase: run before day buttons re-render (which detaches target and breaks bubble checks). */
  function onDocClickCapture(e) {
    if (!root.classList.contains(OPEN)) return;
    if (panel.contains(e.target)) return;
    if (triggerIn.contains(e.target) || triggerOut.contains(e.target)) return;
    var tg = document.getElementById("mm-book-hero-trigger-guests");
    if (tg && tg.contains(e.target)) return;
    cancelAndClose();
  }

  function onResize() {
    if (root.classList.contains(OPEN)) positionPanel();
  }

  function onScroll() {
    if (root.classList.contains(OPEN)) positionPanel();
  }

  function openCal(anchor) {
    if (root.classList.contains(OPEN)) {
      commitAndClose();
      return;
    }

    if (typeof window.mmBookingGuestsCancel === "function") window.mmBookingGuestsCancel();

    snapIn = inEl.value;
    snapOut = outEl.value;
    draftIn = snapIn;
    draftOut = snapOut;
    anchorEl = anchor;

    var ci = parseYmd(draftIn);
    var co = parseYmd(draftOut);
    if (ci && co) {
      rangeStep = 0;
    } else if (ci && !co) {
      rangeStep = 1;
    } else {
      rangeStep = 0;
    }

    if (ci) {
      viewStart = new Date(ci.getFullYear(), ci.getMonth(), 1);
    } else if (co) {
      viewStart = new Date(co.getFullYear(), co.getMonth(), 1);
    } else {
      viewStart = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    clampViewStart();

    root.removeAttribute("hidden");
    root.classList.add(OPEN);
    lockPageScroll();
    setTriggersActive();
    panel.setAttribute("aria-label", "Select check-in and check-out dates");
    render();
    requestAnimationFrame(function () {
      positionPanel();
      requestAnimationFrame(positionPanel);
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClickCapture, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
  }

  function buildDom() {
    root = document.createElement("div");
    root.id = "mm-book-calendar";
    root.className = "mm-book-cal";
    root.setAttribute("hidden", "");

    var backdrop = document.createElement("div");
    backdrop.className = "mm-book-cal__backdrop";
    backdrop.addEventListener("click", cancelAndClose);

    panel = document.createElement("div");
    panel.className = "mm-book-cal__panel";
    panel.id = "mm-book-calendar-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    var navRow = document.createElement("div");
    navRow.className = "mm-book-cal__nav-row";
    btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = "mm-book-cal__nav mm-book-cal__prev";
    btnPrev.setAttribute("aria-label", "Previous month");
    btnPrev.innerHTML = "&#8249;";
    btnPrev.addEventListener("click", function () {
      if (!canPrevMonth()) return;
      viewStart = addMonths(viewStart, -1);
      render();
      positionPanel();
    });

    btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = "mm-book-cal__nav mm-book-cal__next";
    btnNext.setAttribute("aria-label", "Next month");
    btnNext.innerHTML = "&#8250;";
    btnNext.addEventListener("click", function () {
      viewStart = addMonths(viewStart, 1);
      render();
      positionPanel();
    });

    navRow.appendChild(btnPrev);
    navRow.appendChild(btnNext);

    var grids = document.createElement("div");
    grids.className = "mm-book-cal__grids";
    var wrap0 = document.createElement("div");
    wrap0.className = "mm-book-cal__grid-wrap";
    title0 = document.createElement("h3");
    grid0 = document.createElement("div");
    wrap0.appendChild(title0);
    wrap0.appendChild(grid0);
    var wrap1 = document.createElement("div");
    wrap1.className = "mm-book-cal__grid-wrap";
    title1 = document.createElement("h3");
    grid1 = document.createElement("div");
    wrap1.appendChild(title1);
    wrap1.appendChild(grid1);
    grids.appendChild(wrap0);
    grids.appendChild(wrap1);

    var foot = document.createElement("div");
    foot.className = "mm-book-cal__footer";
    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "mm-book-cal__btn mm-book-cal__btn--ghost";
    btnCancel.textContent = "Cancel";
    btnCancel.addEventListener("click", cancelAndClose);
    var btnDone = document.createElement("button");
    btnDone.type = "button";
    btnDone.className = "mm-book-cal__btn mm-book-cal__btn--primary";
    btnDone.textContent = "Done";
    btnDone.addEventListener("click", commitAndClose);
    foot.appendChild(btnCancel);
    foot.appendChild(btnDone);

    panel.appendChild(navRow);
    panel.appendChild(grids);
    panel.appendChild(foot);

    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);
  }

  function init() {
    buildDom();
    triggerIn.addEventListener("click", function (e) {
      e.stopPropagation();
      openCal(triggerIn);
    });
    triggerOut.addEventListener("click", function (e) {
      e.stopPropagation();
      openCal(triggerOut);
    });
  }

  window.mmBookingCalendarCancel = function () {
    if (root.classList.contains(OPEN)) cancelAndClose();
  };

  init();
})();
