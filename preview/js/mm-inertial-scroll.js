/**
 * Motel Mediteran — inertial (Lenis) scroll
 * - Site-wide smooth wheel momentum
 * - When GSAP ScrollTrigger is present (home hero), wires Lenis into ScrollTrigger
 * - Pauses while the premium nav overlay locks scroll (mm-nav-open)
 */
(function () {
  "use strict";

  if (typeof window.Lenis === "undefined") return;

  var prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  var useScrollTrigger =
    typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  var lenis = new window.Lenis({
    lerp: 0.1,
    wheelMultiplier: 0.75,
    touchMultiplier: 1.0,
    smoothWheel: true,
    autoRaf: !useScrollTrigger,
  });

  window.mmLenis = lenis;

  if (useScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    window.gsap.ticker.lagSmoothing(0);

    window.ScrollTrigger.scrollerProxy(document.body, {
      scrollTop: function (value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect: function () {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });
    window.ScrollTrigger.refresh();
  }

  function syncNavOverlay() {
    if (!document.body) return;
    if (document.body.classList.contains("mm-nav-open")) {
      lenis.stop();
    } else {
      lenis.start();
      requestAnimationFrame(function () {
        lenis.resize();
      });
    }
  }

  if (document.body) {
    syncNavOverlay();
    new MutationObserver(syncNavOverlay).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
})();
