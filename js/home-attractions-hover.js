/**
 * Home attractions hover (no overlay):
 * - Cards stay the same size.
 * - On hover, each card switches to show the hovered card's image,
 *   and we adjust object-position per card (left/center/right) so the three
 *   tiles look like a single continuous expanded image.
 * - Captions: subtle emphasis on the active card only.
 */
(function () {
  "use strict";

  function pickCards(row) {
    if (!row) return [];
    return Array.prototype.slice.call(row.querySelectorAll("figure.wp-block-image"));
  }

  // For seamless “single expanded image” feel across N equal tiles,
  // avoid extremes (0% / 100%) which can overlap due to rounding.
  // Use slice centers: (i + 0.5) / N.
  function getObjectPositionForIndex(i, n) {
    if (n <= 0) return "50% 50%";
    var x = ((i + 0.5) / n) * 100;
    return x.toFixed(3) + "% 50%";
  }

  function main() {
    var rowEl = document.querySelector(".home-attractions-row");
    if (!rowEl) return;

    var cards = pickCards(rowEl);
    if (!cards.length) return;

    var data = cards.map(function (card) {
      var img = card.querySelector("img");
      return {
        card: card,
        img: img || null,
        src: img ? img.getAttribute("src") || img.src : "",
        origObjectFit: img ? img.style.objectFit : "",
        origObjectPosition: img ? img.style.objectPosition : "",
      };
    });

    function restore() {
      cards.forEach(function (c) {
        c.classList.remove("is-active");
      });
      rowEl.classList.remove("home-attractions-row--hovering");

      data.forEach(function (d) {
        if (!d.img) return;
        if (!d.src) return;
        d.img.style.opacity = "0";
        requestAnimationFrame(function () {
          d.img.src = d.src;
          d.img.style.objectFit = d.origObjectFit || "";
          d.img.style.objectPosition = d.origObjectPosition || "";
          d.img.style.opacity = "1";
        });
      });
    }

    function activate(index) {
      if (index < 0 || index >= data.length) return;
      var hovered = data[index];
      if (!hovered || !hovered.src) return;

      cards.forEach(function (c, i) {
        c.classList.toggle("is-active", i === index);
      });
      rowEl.classList.add("home-attractions-row--hovering");

      data.forEach(function (d, i) {
        if (!d.img) return;
        d.img.style.opacity = "0";
        requestAnimationFrame(function () {
          d.img.src = hovered.src;
          // Use the same photo across all 3 cards, but slice it so it aligns.
          d.img.style.objectFit = "cover";
          d.img.style.objectPosition = getObjectPositionForIndex(i, data.length);
          d.img.style.opacity = "1";
        });
      });
    }

    cards.forEach(function (card, idx) {
      card.addEventListener("mouseenter", function () {
        activate(idx);
      });
      card.addEventListener("focusin", function () {
        activate(idx);
      });
    });

    rowEl.addEventListener("mouseleave", restore);
    rowEl.addEventListener("focusout", function (e) {
      if (!rowEl.contains(e.relatedTarget)) restore();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();

