(() => {
  const hero = document.querySelector('[data-mm-slider="hero"]');
  const suites = document.querySelector('[data-mm-slider="suites"]');
  const rooms = document.querySelector('[data-mm-slider="rooms"]');

  function bindViewAll(scope = document) {
    scope.querySelectorAll("[data-mm-viewall]").forEach((viewAllBtn) => {
      if (viewAllBtn.dataset.mmBound === "1") return;
      viewAllBtn.dataset.mmBound = "1";
      const panel = viewAllBtn.parentElement?.querySelector("[data-mm-viewall-panel]");
      if (!panel) return;
      viewAllBtn.addEventListener("click", () => {
        const open = panel.hasAttribute("hidden");
        panel.toggleAttribute("hidden", !open);
        viewAllBtn.setAttribute("aria-expanded", String(open));
        const plus = viewAllBtn.querySelector(".mm-plus");
        if (plus) plus.textContent = open ? "−" : "+";
      });
    });
  }

  function initSlider(root, slides, captions, suiteDetails = null) {
    if (!root || !slides.length) return;

    const stage = root.querySelector(".mm-hero__stage") || root.querySelector(".mm-wide__stage");
    if (!stage) return;

    const prev = root.querySelector(".mm-arrow--prev");
    const next = root.querySelector(".mm-arrow--next");
    const dotsWrap = root.querySelector("[data-mm-dots]");
    const captionEl = root.querySelector("[data-mm-caption]");
    const captionTrack = root.querySelector(".mm-caption-track");
    const metaTrack = root.querySelector(".mm-suite-meta-track");
    const sliderType = root.getAttribute("data-mm-slider");
    const isSuites = sliderType === "suites";
    const isRooms = sliderType === "rooms";
    const isDeckSlider = isSuites || isRooms;
    const hostSection = isSuites ? root.closest("#suites") : (isRooms ? root.closest("#rooms") : null);
    const detailTrack = isDeckSlider ? hostSection?.querySelector(".mm-suite-detail-track") || null : null;
    const suitesGapPx = 48;
    const reserveHref =
      "http://www.booking.com/hotel/us/motel-mediteran.html?aid=330843;lang=en;pb=1";

    const n = slides.length;
    const order = Array.from({ length: n }, (_, k) => k);
    const altBase = isSuites ? "Suite photo" : "Room photo";

    if (isDeckSlider) {
      slides.forEach((src) => {
        const pre = new Image();
        pre.src = src;
      });
    }

    stage.innerHTML = "";
    const track = document.createElement("div");
    track.className = "mm-slider__track";
    order.forEach((slideIdx, pos) => {
      const im = document.createElement("img");
      im.className = "mm-slider__slide";
      im.src = slides[slideIdx];
      im.alt = pos === 0 ? altBase : "";
      im.decoding = isDeckSlider ? "sync" : "async";
      im.loading = isDeckSlider ? "eager" : (pos === 0 ? "eager" : "lazy");
      im.draggable = false;
      track.appendChild(im);
    });
    stage.appendChild(track);

    if (!isSuites && captionTrack) {
      captionTrack.innerHTML = "";
      captions.forEach((text) => {
        const cap = document.createElement("p");
        cap.className = "mm-caption-slide";
        cap.textContent = text;
        captionTrack.appendChild(cap);
      });
    }

    if (isDeckSlider) {
      const centerSlot = 1; // [left, center, right, ...]
      let current = 0;
      let t = null;
      let animating = false;
      let pendingDir = 0; // +1 next, -1 prev

      function detailFor(idx) {
        if (Array.isArray(suiteDetails) && suiteDetails[idx]) return suiteDetails[idx];
        return {
          text: "Upgraded suite comfort with spacious layout, premium bedding, and practical amenities for longer stays.",
          bullets: ["King bed", "Flat-screen TV", "Mini-fridge", "Air conditioning", "Free Wi-Fi"],
        };
      }

      function setTransitionEnabled(enabled) {
        const value = enabled ? "" : "none";
        track.style.transition = value;
        if (metaTrack) metaTrack.style.transition = value;
        if (detailTrack) detailTrack.style.transition = value;
      }

      function forceReflow() {
        void track.offsetWidth;
        if (metaTrack) void metaTrack.offsetWidth;
        if (detailTrack) void detailTrack.offsetWidth;
      }

      function getImgStep() {
        return stage.clientWidth + suitesGapPx;
      }

      function getMetaStep() {
        const rail = metaTrack?.parentElement;
        return rail ? rail.clientWidth : stage.clientWidth;
      }

      function getDetailStep() {
        const rail = detailTrack?.parentElement;
        return rail ? rail.clientWidth : stage.clientWidth;
      }

      function applyOffset(multiplier) {
        track.style.transform = `translate3d(-${multiplier * getImgStep()}px, 0, 0)`;
        if (metaTrack) {
          metaTrack.style.transform = `translate3d(-${multiplier * getMetaStep()}px, 0, 0)`;
        }
        if (detailTrack) {
          detailTrack.style.transform = `translate3d(-${multiplier * getDetailStep()}px, 0, 0)`;
        }
      }

      function updateUI() {
        if (!dotsWrap) return;
        Array.from(dotsWrap.children).forEach((d, di) => d.classList.toggle("is-active", di === current));
      }

      function sizeTracks() {
        const count = track.children.length;
        const stageW = stage.clientWidth;
        track.style.display = "flex";
        track.style.gap = `${suitesGapPx}px`;
        track.style.width = `${count * stageW + (count - 1) * suitesGapPx}px`;
        Array.from(track.children).forEach((el) => {
          el.style.flex = `0 0 ${stageW}px`;
          el.style.width = `${stageW}px`;
          el.style.maxWidth = `${stageW}px`;
        });

        if (metaTrack) {
          const rail = metaTrack.parentElement;
          const railW = rail ? rail.clientWidth : stageW;
          metaTrack.style.display = "flex";
          metaTrack.style.gap = "0px";
          metaTrack.style.width = `${count * railW}px`;
          Array.from(metaTrack.children).forEach((el) => {
            el.style.flex = `0 0 ${railW}px`;
            el.style.width = `${railW}px`;
            el.style.maxWidth = `${railW}px`;
          });
        }

        if (detailTrack) {
          const rail = detailTrack.parentElement;
          const railW = rail ? rail.clientWidth : stageW;
          detailTrack.style.display = "flex";
          detailTrack.style.gap = "0px";
          detailTrack.style.width = `${count * railW}px`;
          Array.from(detailTrack.children).forEach((el) => {
            el.style.flex = `0 0 ${railW}px`;
            el.style.width = `${railW}px`;
            el.style.maxWidth = `${railW}px`;
          });
        }
      }

      function snapCenter() {
        setTransitionEnabled(false);
        applyOffset(centerSlot);
        forceReflow();
        setTransitionEnabled(true);
      }

      function rotateLeft(el) {
        if (!el || !el.firstElementChild) return;
        el.appendChild(el.firstElementChild);
      }

      function rotateRight(el) {
        if (!el || !el.lastElementChild) return;
        el.insertBefore(el.lastElementChild, el.firstElementChild);
      }

      function animateStep(dir) {
        if (animating) return;
        animating = true;
        pendingDir = dir;
        applyOffset(dir > 0 ? centerSlot + 1 : centerSlot - 1);
      }

      function buildOrder(targetIdx) {
        const out = [];
        // Unique cyclic order: one left neighbor, then current, then remaining forward.
        out.push((targetIdx - 1 + n) % n);
        for (let k = 0; k < n - 1; k += 1) {
          out.push((targetIdx + k) % n);
        }
        return out;
      }

      function rebuildAround(targetIdx) {
        const around = buildOrder(targetIdx);

        track.innerHTML = "";
        around.forEach((slideIdx, pos) => {
          const im = document.createElement("img");
          im.className = "mm-slider__slide";
          im.src = slides[slideIdx];
          im.alt = pos === centerSlot ? altBase : "";
          im.decoding = "sync";
          im.loading = "eager";
          im.draggable = false;
          track.appendChild(im);
        });

        if (metaTrack) {
          metaTrack.innerHTML = "";
          around.forEach((slideIdx) => {
            const slide = document.createElement("div");
            slide.className = "mm-suite-meta-slide";
            const nameEl = document.createElement("div");
            nameEl.className = "mm-row__name";
            nameEl.textContent = captions[slideIdx] || "";
            const actions = document.createElement("div");
            actions.className = "mm-row__actions";
            if (isRooms && detailTrack) {
              const moreBtn = document.createElement("button");
              moreBtn.className = "mm-more-details";
              moreBtn.type = "button";
              moreBtn.innerHTML = '<span class="mm-more-details__label">More details</span>';
              moreBtn.addEventListener("click", () => {
                if (!metaTrack || !detailTrack) return;
                const rail = hostSection?.querySelector(".mm-suite-detail-rail");
                if (!rail) return;

                const isCollapsed = rail.classList.contains("is-collapsed");
                if (!isCollapsed) {
                  rail.classList.add("is-collapsed");
                  detailTrack.querySelectorAll("[data-mm-viewall-panel]").forEach((panel) => {
                    panel.setAttribute("hidden", "");
                  });
                  detailTrack.querySelectorAll("[data-mm-viewall]").forEach((btn) => {
                    btn.setAttribute("aria-expanded", "false");
                    const plus = btn.querySelector(".mm-plus");
                    if (plus) plus.textContent = "+";
                  });
                  return;
                }

                const metaSlide = moreBtn.closest(".mm-suite-meta-slide");
                if (!metaSlide) return;
                const idx = Array.from(metaTrack.children).indexOf(metaSlide);
                if (idx < 0) return;
                const detailSlide = detailTrack.children[idx];
                const panel = detailSlide?.querySelector("[data-mm-viewall-panel]");
                const viewAllBtn = detailSlide?.querySelector("[data-mm-viewall]");
                if (panel && viewAllBtn) {
                  panel.removeAttribute("hidden");
                  viewAllBtn.setAttribute("aria-expanded", "true");
                  const plus = viewAllBtn.querySelector(".mm-plus");
                  if (plus) plus.textContent = "−";
                }
                rail.classList.remove("is-collapsed");
              });
              actions.appendChild(moreBtn);
            }
            const viewA = document.createElement("a");
            viewA.className = "mm-pill";
            const _d = detailFor(slideIdx);
            viewA.href = _d.id ? "room-detail.html?room=" + _d.id : slides[slideIdx];
            if (!_d.id) { viewA.target = "_blank"; viewA.rel = "noopener"; }
            viewA.textContent = "View room";
            const resA = document.createElement("a");
            resA.className = "mm-pill mm-pill--dark";
            resA.href = reserveHref;
            resA.target = "_blank";
            resA.rel = "noopener noreferrer";
            resA.textContent = "Reserve";
            actions.append(viewA, resA);
            slide.append(nameEl, actions);
            metaTrack.appendChild(slide);
          });
        }

        if (detailTrack) {
          detailTrack.innerHTML = "";
          around.forEach((slideIdx) => {
            const d = detailFor(slideIdx);
            const slide = document.createElement("div");
            slide.className = "mm-suite-detail-slide";
            const detail = document.createElement("div");
            detail.className = "mm-detail";
            const h3 = document.createElement("h3");
            h3.className = "mm-detail__title";
            h3.textContent = "Features";
            const p = document.createElement("p");
            p.className = "mm-detail__text";
            p.textContent = d.text;
            const btn = document.createElement("button");
            btn.className = "mm-viewall";
            btn.type = "button";
            btn.setAttribute("aria-expanded", "false");
            btn.setAttribute("data-mm-viewall", "");
            btn.innerHTML =
              '<span class="mm-viewall__label">View all <span class="mm-plus" aria-hidden="true">+</span></span>';
            const box = document.createElement("div");
            box.className = "mm-box";
            box.setAttribute("data-mm-viewall-panel", "");
            box.setAttribute("hidden", "");
            const ul = document.createElement("ul");
            ul.className = "mm-list";
            (d.bullets || []).forEach((item) => {
              const li = document.createElement("li");
              li.textContent = item;
              if (item === "Exclusive room") li.className = "mm-list__exclusive";
              ul.appendChild(li);
            });
            box.appendChild(ul);
            detail.append(h3, p, btn, box);
            slide.appendChild(detail);
            detailTrack.appendChild(slide);
          });
        }

        current = targetIdx;
        sizeTracks();
        snapCenter();
        updateUI();
        bindViewAll(hostSection || root);
      }

      function renderDots() {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = "";
        slides.forEach((_, di) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "mm-dot";
          b.setAttribute("aria-label", `Go to slide ${di + 1}`);
          b.addEventListener("click", () => {
            rebuildAround(di);
            restart();
          });
          dotsWrap.appendChild(b);
        });
      }

      function stop() {
        if (!t) return;
        window.clearInterval(t);
        t = null;
      }

      function start() {
        stop();
      }

      function restart() {
        stop();
        start();
      }

      track.addEventListener("transitionend", (ev) => {
        if (ev.propertyName !== "transform" || !animating) return;
        if (pendingDir > 0) {
          rotateLeft(track);
          if (metaTrack) rotateLeft(metaTrack);
          if (detailTrack) rotateLeft(detailTrack);
          current = (current + 1) % n;
        } else if (pendingDir < 0) {
          rotateRight(track);
          if (metaTrack) rotateRight(metaTrack);
          if (detailTrack) rotateRight(detailTrack);
          current = (current - 1 + n) % n;
        }
        pendingDir = 0;
        animating = false;
        snapCenter();
        updateUI();
      });

      renderDots();
      rebuildAround(0);
      if (isRooms) {
        const rail = hostSection?.querySelector(".mm-suite-detail-rail");
        if (rail) {
          rail.classList.add("is-collapsed");
        }
      }
      window.addEventListener("resize", () => {
        sizeTracks();
        snapCenter();
      });

      if (prev) prev.addEventListener("click", () => { animateStep(-1); });
      if (next) next.addEventListener("click", () => { animateStep(1); });

      // Touch swipe for deck sliders
      let dtx = 0, dty = 0;
      stage.addEventListener("touchstart", (e) => {
        dtx = e.touches[0].clientX;
        dty = e.touches[0].clientY;
      }, { passive: true });
      stage.addEventListener("touchend", (e) => {
        const dx = e.changedTouches[0].clientX - dtx;
        const dy = e.changedTouches[0].clientY - dty;
        if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy)) {
          animateStep(dx < 0 ? 1 : -1);
        }
      }, { passive: true });

      return;
    }

    // Hero / non-suites slider
    let i = 0;
    let t = null;

    function layoutStripPercent(stripEl, count) {
      if (!stripEl || count < 1) return;
      stripEl.style.display = "flex";
      stripEl.style.gap = "0px";
      stripEl.style.width = `${count * 100}%`;
      const slice = `${100 / count}%`;
      Array.from(stripEl.children).forEach((el) => {
        el.style.flex = `0 0 ${slice}`;
        el.style.width = slice;
        el.style.maxWidth = slice;
      });
    }

    function applyTransform() {
      const pct = (i / n) * 100;
      const tr = `translate3d(-${pct}%, 0, 0)`;
      track.style.transform = tr;
      if (captionTrack) captionTrack.style.transform = tr;
    }

    function updateUI() {
      if (captionEl) captionEl.textContent = captions[i] || "";
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((d, di) => d.classList.toggle("is-active", di === i));
      }
    }

    function layoutSizes() {
      layoutStripPercent(track, n);
      if (captionTrack) layoutStripPercent(captionTrack, n);
      applyTransform();
      updateUI();
    }

    function set(idx) {
      i = ((idx % n) + n) % n;
      applyTransform();
      updateUI();
    }

    function renderDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      slides.forEach((_, di) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mm-dot";
        b.setAttribute("aria-label", `Go to slide ${di + 1}`);
        b.addEventListener("click", () => {
          set(di);
          restart();
        });
        dotsWrap.appendChild(b);
      });
    }

    function stop() {
      if (!t) return;
      window.clearInterval(t);
      t = null;
    }

    function start() {
      stop();
      t = window.setInterval(() => set(i + 1), 5200);
    }

    function restart() {
      stop();
      start();
    }

    renderDots();
    layoutSizes();
    window.addEventListener("resize", layoutSizes);
    set(0);
    start();

    if (prev) prev.addEventListener("click", () => { set(i - 1); restart(); });
    if (next) next.addEventListener("click", () => { set(i + 1); restart(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    // Touch swipe
    let tx = 0, ty = 0;
    stage.addEventListener("touchstart", (e) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy)) {
        set(dx < 0 ? i + 1 : i - 1);
        restart();
      }
    }, { passive: true });
  }

  initSlider(
    hero,
    [
      "assets/motel-pics/std%20king/1.png",
      "assets/motel-pics/std%20queen/1.png",
      "assets/motel-pics/std%202%20queen/1.png",
      "assets/motel-pics/2%20rooms%20kitchen%20suite/1.png",
      "assets/motel-pics/king%20room%20jacuzzi/2.png",
      "assets/motel-pics/2%20rooms%20kitchen%20suite/2.png",
    ],
    [
      "King room",
      "Queen room",
      "Queen room with 2 queen bed",
      "Deluxe King suite with kitchen",
      "Deluxe King Suite",
      "2 Room suite with kitchen",
    ]
  );

  initSlider(
    suites,
    [
      "assets/motel-pics/2%20rooms%20kitchen%20suite/1.png",
      "assets/motel-pics/king%20room%20jacuzzi/2.png",
      "assets/motel-pics/2%20rooms%20kitchen%20suite/2.png",
    ],
    ["Deluxe King suite with kitchen", "Deluxe King Suite", "2 Room suite with kitchen"],
    [
      {
        id: "suite-kitchen",
        text: "Spacious king suite with kitchen conveniences, flexible lounging space, and modern essentials for longer, comfortable stays, ideal for both short getaways and extended trips.",
        bullets: [
          "Sleeps 4",
          "Living area",
          "Fireplace",
          "Dining area",
          "Kitchen with 2 stovetops",
          "Full size refrigerator",
          "Microwave",
          "Utensils provided",
          "King bed",
          "Queen bed",
          "In-room jacuzzi hot tub",
          "Flat screen TV",
          "Non-smoking",
          "Exclusive room",
        ],
      },
      {
        id: "suite-jacuzzi",
        text: "Refined deluxe suite atmosphere with jacuzzi comfort, upgraded finishes, and quiet rest after full San Diego days, with extra room to unwind in privacy.",
        bullets: [
          "Sleeps 2",
          "Comfy king size bed",
          "In-room jacuzzi",
          "Private outdoor patio",
          "Microwave",
          "Refrigerator",
          "Flat screen TV",
          "Non-smoking",
          "Exclusive room",
        ],
      },
      {
        id: "suite-2room",
        text: "Two-room suite with kitchen offers separated living and sleep zones for families, extended trips, and added privacy, with practical space for relaxing or planning the day.",
        bullets: [
          "Sleeps 4",
          "Kitchen with 2 stovetops",
          "Full size refrigerator",
          "Microwave",
          "Utensils provided",
          "2 Queen beds in separate room",
          "Flat screen TV",
          "Non-smokin",
          "Exclusive room",
        ],
      },
    ]
  );

  initSlider(
    rooms,
    [
      "assets/motel-pics/std%20king/1.png",
      "assets/motel-pics/std%20queen/1.png",
      "assets/motel-pics/std%202%20queen/1.png",
    ],
    ["King room", "Queen room", "Queen room with 2 queen bed"],
    [
      {
        id: "king",
        text: "Standard king room with a clean layout and practical essentials for restful overnight stays.",
        bullets: ["Sleeps 2", "Comfy king size bed", "Microwave", "Refrigerator", "Flat screen TV", "Non-smoking"],
      },
      {
        id: "queen",
        text: "Standard queen room designed for comfort and convenience, ideal for solo travelers or couples.",
        bullets: ["Sleeps 2", "Comfy queen size bed", "Microwave", "Refrigerator", "Flat screen TV", "Non-smoking"],
      },
      {
        id: "queen-double",
        text: "Double-queen room with extra sleeping space for small families or friends traveling together.",
        bullets: ["Sleeps 4", "2 Queen beds", "Microwave", "Refrigerator", "Flat screen TV", "Non-smoking"],
      },
    ]
  );

  bindViewAll(document);
})();
