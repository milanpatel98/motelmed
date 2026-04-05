/**
 * Loads 5-star reviews from data/google-reviews.json and shows a few in
 * "What people are saying". The JSON can hold hundreds of curated entries;
 * each full page load shuffles the pool and picks a random starting window, so
 * refresh shows a different set. Optional timed rotation advances that window.
 */
(function () {
  "use strict";

  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function starsHtml() {
    return (
      '<figure class="wp-block-jetpack-rating-star is-style-filled" style="text-align:left" aria-label="5 out of 5 stars">' +
      "<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>" +
      "</figure>"
    );
  }

  function columnHtml(review) {
    const name = esc(review.authorName || "Google reviewer");
    const text = esc(review.text || "").trim();
    const quoted = text ? "&ldquo;" + text + "&rdquo;" : "";
    const time = review.relativeTime ? '<span class="google-reviews-time">' + esc(review.relativeTime) + "</span>" : "";
    let avatar = "";
    if (review.authorPhotoUrl) {
      avatar =
        '<figure class="wp-block-image size-full is-resized has-custom-border google-reviews-avatar">' +
        '<img src="' +
        esc(review.authorPhotoUrl) +
        '" alt="" width="48" height="48" loading="lazy" referrerpolicy="no-referrer" style="border-radius:100px;aspect-ratio:1;object-fit:cover;width:48px;height:48px" />' +
        "</figure>";
    } else {
      const initial = name.charAt(0).toUpperCase() || "?";
      avatar =
        '<figure class="wp-block-image size-full is-resized has-custom-border google-reviews-avatar google-reviews-avatar--placeholder" aria-hidden="true">' +
        '<span class="google-reviews-initial">' +
        esc(initial) +
        "</span></figure>";
    }
    return (
      '<div class="wp-block-column google-reviews-column">' +
      starsHtml() +
      '<p class="is-testimonial-review">' +
      quoted +
      "</p>" +
      avatar +
      '<p class="is-testimonial-name">' +
      name +
      (time ? " · " + time : "") +
      "</p>" +
      "</div>"
    );
  }

  function pickWindow(pool, start, count) {
    const out = [];
    const n = pool.length;
    if (!n) return out;
    for (let i = 0; i < count; i++) {
      out.push(pool[(start + i) % n]);
    }
    return out;
  }

  function render(root, reviews, mapsUrl) {
    const count = Math.max(1, Math.min(6, parseInt(root.getAttribute("data-columns") || "3", 10) || 3));
    if (!reviews.length) {
      root.innerHTML =
        '<div class="wp-block-column"><p class="is-testimonial-review">No five-star reviews are available yet. Check back soon or read reviews on Google Maps.</p></div>';
      root.hidden = false;
      return;
    }
    const pool = shuffle(reviews);
    /* New random slice on every page load; interval rotation continues from there. */
    let start = pool.length ? Math.floor(Math.random() * pool.length) : 0;

    function paint() {
      const slice = pickWindow(pool, start, count);
      root.innerHTML = slice.map(columnHtml).join("");
      start = (start + count) % Math.max(pool.length, 1);
    }

    paint();
    root.hidden = false;
    const ms = parseInt(root.getAttribute("data-rotate-ms") || "60000", 10);
    if (pool.length > count && ms >= 4000) {
      setInterval(paint, ms);
    }
    if (mapsUrl) {
      const link = document.getElementById("google-reviews-maps-link");
      if (link) link.href = mapsUrl;
    }
  }

  function main() {
    const root = document.getElementById("google-reviews-root");
    const loading = document.getElementById("google-reviews-loading");
    const attr = document.getElementById("google-reviews-attribution");
    if (!root) return;

    const jsonUrl = root.getAttribute("data-json") || "data/google-reviews.json";

    fetch(jsonUrl, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("Bad response");
        return r.json();
      })
      .then(function (data) {
        const raw = (data && data.reviews) || [];
        const five = raw.filter(function (x) {
          return Number(x.rating) === 5;
        });
        if (loading) loading.hidden = true;
        if (attr) attr.hidden = false;
        render(root, five, data.googleMapsUri || "");
      })
      .catch(function () {
        if (loading) {
          loading.textContent =
            "Reviews could not be loaded. Run scripts/fetch_google_reviews.py to create data/google-reviews.json, or open this page via the local server (not as a file).";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
