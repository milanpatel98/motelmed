(function () {
  "use strict";

  var grid = document.getElementById("mm-gal-grid");
  if (!grid) return;

  var items = Array.prototype.slice.call(grid.querySelectorAll(".mm-gal-item[data-cat]"));
  var filterRoot = document.querySelector("#main .mm-gal-filters");
  var filterInputs = filterRoot
    ? Array.prototype.slice.call(filterRoot.querySelectorAll('input[type="checkbox"][name="gal-filter"]'))
    : [];
  var countEl = document.getElementById("mm-gal-count");

  var lb = document.getElementById("mm-gal-lb");
  var lbImg = lb ? lb.querySelector(".mm-gal-lb__img") : null;
  var lbCaption = lb ? lb.querySelector(".mm-gal-lb__caption") : null;
  var lbCounter = lb ? lb.querySelector(".mm-gal-lb__counter") : null;
  var lbClose = lb ? lb.querySelector(".mm-gal-lb__close") : null;
  var lbPrev = lb ? lb.querySelector(".mm-gal-lb__prev") : null;
  var lbNext = lb ? lb.querySelector(".mm-gal-lb__next") : null;
  var lbOk = !!(lb && lbImg && lbCaption && lbCounter && lbClose && lbPrev && lbNext);

  var currentIdx = 0;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getVisible() {
    return items.filter(function (item) { return !item.classList.contains("mm-gal-item--hidden"); });
  }

  function updateCount() {
    if (!countEl) return;
    var n = getVisible().length;
    countEl.textContent = n + (n === 1 ? " photo" : " photos");
  }

  // ── Filter ───────────────────────────────────────────────────────────────────

  /* Same model as Things to do: no “All” control — nothing checked = show everything. */
  function getSelectedCat() {
    for (var i = 0; i < filterInputs.length; i++) {
      if (filterInputs[i].checked) return filterInputs[i].value;
    }
    return "all";
  }

  function applyFilter(cat) {
    grid.setAttribute("data-filter", cat);

    items.forEach(function (item) {
      var cats = (item.getAttribute("data-cat") || "").split(/\s+/);
      var hide = cat !== "all" && cats.indexOf(cat) === -1;
      item.classList.toggle("mm-gal-item--hidden", hide);
      item.hidden = hide;
      item.setAttribute("aria-hidden", hide ? "true" : "false");
      if (hide) {
        item.setAttribute("tabindex", "-1");
      } else {
        item.setAttribute("tabindex", "0");
      }
    });

    updateCount();
  }

  filterInputs.forEach(function (inp) {
    inp.addEventListener("change", function (e) {
      var t = e.target;
      if (t.checked) {
        for (var i = 0; i < filterInputs.length; i++) {
          if (filterInputs[i] !== t) filterInputs[i].checked = false;
        }
      }
      applyFilter(getSelectedCat());
    });
  });

  // ── Lightbox ─────────────────────────────────────────────────────────────────

  function updateLbContent(vis) {
    if (!lbOk) return;
    if (!vis) vis = getVisible();
    var item = vis[currentIdx];
    if (!item) return;
    var img = item.querySelector("img");
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = item.getAttribute("data-caption") || "";
    lbCounter.textContent = (currentIdx + 1) + " / " + vis.length;
    lbPrev.disabled = currentIdx === 0;
    lbNext.disabled = currentIdx === vis.length - 1;
  }

  function openLb(visIdx) {
    if (!lbOk) return;
    var vis = getVisible();
    if (!vis.length) return;
    currentIdx = Math.max(0, Math.min(visIdx, vis.length - 1));
    updateLbContent(vis);
    lb.removeAttribute("hidden");
    // Double rAF so display:flex is applied before opacity transition
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lb.classList.add("is-open");
      });
    });
    document.body.style.overflow = "hidden";
    setTimeout(function () { lbClose.focus(); }, 50);
  }

  function closeLb() {
    if (!lbOk) return;
    lb.classList.remove("is-open");
    var handler = function () {
      lb.setAttribute("hidden", "");
      lb.removeEventListener("transitionend", handler);
    };
    lb.addEventListener("transitionend", handler);
    document.body.style.overflow = "";
  }

  function navigate(dir) {
    if (!lbOk) return;
    var vis = getVisible();
    var next = currentIdx + dir;
    if (next < 0 || next >= vis.length) return;
    currentIdx = next;
    // Quick crossfade
    lbImg.style.opacity = "0";
    setTimeout(function () {
      updateLbContent(vis);
      lbImg.style.opacity = "1";
    }, 130);
  }

  // Attach click to items
  items.forEach(function (item) {
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");

    item.addEventListener("click", function () {
      var vis = getVisible();
      openLb(vis.indexOf(item));
    });

    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var vis = getVisible();
        openLb(vis.indexOf(item));
      }
    });
  });

  if (lbOk) {
    lbClose.addEventListener("click", closeLb);
    lbPrev.addEventListener("click", function () { navigate(-1); });
    lbNext.addEventListener("click", function () { navigate(1); });

    lb.addEventListener("click", function (e) {
      if (e.target === lb) closeLb();
    });

    document.addEventListener("keydown", function (e) {
      if (lb.hasAttribute("hidden")) return;
      if (e.key === "Escape") { closeLb(); return; }
      if (e.key === "ArrowLeft") { navigate(-1); return; }
      if (e.key === "ArrowRight") { navigate(1); return; }
    });

    var touchStartX = 0;
    lb.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  applyFilter(getSelectedCat());
})();
