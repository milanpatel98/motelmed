/**
 * Rotates the home “Welcome to SoCal” column quote on a timer (gentle fade).
 * Quotes are plain strings; curly quotes are added in script.
 */
(function () {
  var INTERVAL_MS = 9000;
  var FADE_MS = 480;
  var LD = "\u201c";
  var RD = "\u201d";

  var QUOTES = [
    "Experience the charm of Southern California, where the sun shines bright and adventure awaits. Whether you're here to relax or explore, you'll find endless opportunities to enjoy all SoCal offers.",
    "From golden mornings to soft Pacific evenings, SoCal has a way of stretching time—just enough to breathe, wander, and remember why you came.",
    "Coastline or canyons, city lights or quiet streets: every day here offers another angle on California, and a comfortable place to return to when the sun goes down.",
    "North County keeps San Diego close while the pace stays human—outdoor plans by day, easy miles on the road, and room to unwind when you're done exploring.",
    "Southern California rewards curiosity—new trails, familiar beaches, and small-town corners worth a second look. Stay awhile; there's always one more sunset worth catching.",
  ];

  /** Reserve height of the tallest quote so the welcome row does not reflow. */
  function lockQuoteBlockHeight(root, span) {
    var saved = span.textContent;
    /* Must clear first: otherwise offsetHeight is stuck at the old min-height and each
       remeasure (fonts, load, resize) only ever grows — content below keeps shifting down. */
    root.style.minHeight = "";
    span.classList.remove("is-hidden");
    var maxH = 0;
    for (var k = 0; k < QUOTES.length; k++) {
      span.textContent = LD + QUOTES[k] + RD;
      maxH = Math.max(maxH, root.offsetHeight);
    }
    span.textContent = saved;
    root.style.minHeight = Math.ceil(maxH + 2) + "px";
  }

  function boot() {
    var root = document.getElementById("home-welcome-quote");
    if (!root) return;

    var span = root.querySelector(".home-welcome-quote__text");
    if (!span) return;

    function applyHeightLock() {
      lockQuoteBlockHeight(root, span);
    }

    applyHeightLock();
    window.requestAnimationFrame(function () {
      applyHeightLock();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyHeightLock);
    }
    window.addEventListener("load", applyHeightLock);

    var resizeTid;
    function scheduleHeightLock() {
      window.clearTimeout(resizeTid);
      resizeTid = window.setTimeout(applyHeightLock, 120);
    }
    var col = root.closest(".wp-block-column");
    if (col && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(scheduleHeightLock).observe(col);
    } else {
      window.addEventListener("resize", scheduleHeightLock);
    }

    if (QUOTES.length < 2) return;

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    var i = 0;

    function tick() {
      span.classList.add("is-hidden");
      window.setTimeout(function () {
        i = (i + 1) % QUOTES.length;
        span.textContent = LD + QUOTES[i] + RD;
        window.requestAnimationFrame(function () {
          span.classList.remove("is-hidden");
        });
      }, FADE_MS);
    }

    window.setInterval(tick, INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
