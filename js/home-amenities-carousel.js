/**
 * Home Amenities carousel:
 * - Auto-advances one card width at a time (same as advanceOne)
 * - Pager count is step-based: "1" = initial view, "2" = one card forward, etc. ("n / m" = step / total steps)
 * - Max 5 dot/pill indicators (mapped across m when m > 5)
 */
(function () {
  var MAX_PAGER_DOTS = 5;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function visibleDotCount(totalSteps) {
    return Math.min(Math.max(1, totalSteps), MAX_PAGER_DOTS);
  }

  /** Map step index (0…m-1) to which of the (≤5) indicators is.active */
  function stepToActiveDotIndex(stepIndex, totalSteps) {
    var dots = visibleDotCount(totalSteps);
    if (dots <= 1) return 0;
    if (totalSteps <= 1) return 0;
    return Math.round((stepIndex * (dots - 1)) / (totalSteps - 1));
  }

  /** Click target: which step (0…m-1) this dot represents (inverse coarse map when m > 5) */
  function dotIndexToStepIndex(dotIndex, totalSteps) {
    var dots = visibleDotCount(totalSteps);
    if (dots <= 1) return 0;
    if (totalSteps <= 1) return 0;
    dotIndex = clamp(dotIndex, 0, dots - 1);
    if (totalSteps <= MAX_PAGER_DOTS) return dotIndex;
    return Math.round((dotIndex * (totalSteps - 1)) / (dots - 1));
  }

  function boot() {
    var root = document.querySelector(".home-amenities-carousel");
    if (!root) return;

    var viewport = root.querySelector(".home-amenities-carousel__viewport");
    var track = root.querySelector(".home-amenities-cards");
    var dotsHost = root.querySelector(".home-amenities-carousel__dots");
    var curEl = root.querySelector(".home-amenities-carousel__cur");
    var totalEl = root.querySelector(".home-amenities-carousel__total");

    if (!viewport || !track || !dotsHost || !curEl || !totalEl) return;

    var prefersReduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var autoplayMs = parseInt(root.getAttribute("data-autoplay-ms") || "5200", 10);
    autoplayMs = clamp(autoplayMs || 5200, 2500, 20000);

    var state = { stepIndex: 0, steps: 1, timer: 0 };

    function cards() {
      return Array.prototype.slice.call(track.querySelectorAll(".home-amenity-card"));
    }

    /** How many discrete one-card steps from start until the last panel (matches advanceOne). */
    function computeStepCount() {
      var maxScroll = track.scrollWidth - track.clientWidth;
      var step = stepPx();
      if (maxScroll <= 0 || !step) return 1;
      return Math.floor(maxScroll / step) + 1;
    }

    var SCROLL_END_TOL = 4;

    function scrollLeftToStepIndex(scrollLeft, step, steps, maxScroll) {
      if (steps <= 1) return 0;
      if (scrollLeft >= maxScroll - SCROLL_END_TOL) return steps - 1;
      return clamp(Math.round(scrollLeft / step), 0, steps - 1);
    }

    function clearDots() {
      while (dotsHost.firstChild) dotsHost.removeChild(dotsHost.firstChild);
    }

    function renderDots(dotSlots) {
      clearDots();
      for (var i = 0; i < dotSlots; i++) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "home-amenities-carousel__dot" + (i === 0 ? " is-active" : "");
        d.setAttribute("aria-label", "Show amenities view " + (i + 1));
        dotsHost.appendChild(d);
      }
    }

    function scrollToStep(stepIndex, animate) {
      var maxScroll = track.scrollWidth - track.clientWidth;
      var step = stepPx();
      var steps = computeStepCount();
      if (maxScroll <= 0 || !step) return;
      var idx = clamp(stepIndex, 0, steps - 1);
      var target = idx >= steps - 1 ? maxScroll : idx * step;
      var behavior = animate === false ? "auto" : prefersReduce ? "auto" : "smooth";
      track.scrollTo({ left: target, behavior: behavior });
    }

    function setActiveStep(stepIndex) {
      state.steps = computeStepCount();
      state.stepIndex = clamp(stepIndex, 0, Math.max(0, state.steps - 1));
      curEl.textContent = String(state.stepIndex + 1);
      totalEl.textContent = String(state.steps);

      var activeDot = stepToActiveDotIndex(state.stepIndex, state.steps);
      var dots = dotsHost.querySelectorAll(".home-amenities-carousel__dot");
      dots.forEach(function (el, i) {
        el.classList.toggle("is-active", i === activeDot);
      });
    }

    function syncFromScroll() {
      var maxScroll = track.scrollWidth - track.clientWidth;
      var step = stepPx();
      var steps = computeStepCount();
      if (maxScroll <= 0 || !step || steps <= 1) {
        setActiveStep(0);
        return;
      }
      var idx = scrollLeftToStepIndex(track.scrollLeft, step, steps, maxScroll);
      setActiveStep(idx);
    }

    function layout() {
      state.steps = computeStepCount();
      renderDots(visibleDotCount(state.steps));
      syncFromScroll();
    }

    function clearTimer() {
      if (state.timer) window.clearInterval(state.timer);
      state.timer = 0;
    }

    function stop() {
      clearTimer();
    }

    function stepPx() {
      var c = cards();
      if (!c.length) return 0;
      var cardW = c[0].getBoundingClientRect().width || 0;
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap || "16");
      if (Number.isNaN(gap)) gap = 16;
      return Math.round(cardW + gap);
    }

    function advanceOne(animate) {
      var maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return;
      var step = stepPx();
      if (!step) return;

      var cur = track.scrollLeft;
      var cand = cur + step;
      var behavior = animate && !prefersReduce ? "smooth" : "auto";

      if (cand > maxScroll + SCROLL_END_TOL) {
        if (cur >= maxScroll - SCROLL_END_TOL) {
          track.scrollTo({ left: 0, behavior: behavior });
        } else {
          track.scrollTo({ left: maxScroll, behavior: behavior });
        }
      } else {
        track.scrollTo({ left: Math.min(cand, maxScroll), behavior: behavior });
      }
    }

    function start() {
      clearTimer();
      if (prefersReduce) return;
      state.timer = window.setInterval(function () {
        advanceOne(true);
      }, autoplayMs);
    }

    // pause on interaction
    track.addEventListener("pointerdown", stop, { passive: true });
    track.addEventListener("mouseenter", stop);
    track.addEventListener("mouseleave", start);
    track.addEventListener("focusin", stop);
    track.addEventListener("focusout", start);
    track.addEventListener("scroll", function () {
      window.clearTimeout(state._st);
      state._st = window.setTimeout(syncFromScroll, 90);
    }, { passive: true });

    dotsHost.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || t.nodeName !== "BUTTON" || !t.classList.contains("home-amenities-carousel__dot")) return;
      e.preventDefault();
      var idx = Array.prototype.indexOf.call(dotsHost.children, t);
      if (idx < 0) return;
      var stepsNow = computeStepCount();
      var stepIdx = dotIndexToStepIndex(idx, stepsNow);
      scrollToStep(stepIdx, true);
    });

    dotsHost.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target;
      if (!t || t.nodeName !== "BUTTON" || !t.classList.contains("home-amenities-carousel__dot")) return;
      e.preventDefault();
      t.click();
    });

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(function () {
        layout();
      }).observe(track);
    } else {
      window.addEventListener("resize", layout);
    }

    layout();
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

