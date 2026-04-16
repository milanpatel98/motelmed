(() => {
  const data = window.MM_DATA;
  const ROOMS = data.rooms;

  // Base prices matching book.html room cards
  const ROOM_PRICES = {
    "suite-kitchen": 189, "suite-jacuzzi": 149, "suite-2room": 129,
    "king": 99, "queen": 89, "queen-double": 109, "ada": 99
  };

  // ── Read URL param ──────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "king";
  const room = ROOMS[roomId] || ROOMS["king"];
  const displayName = room.name.replace("\n", " ");

  // ── Page title ──────────────────────────────────────────
  const titleTag = document.getElementById("rd-page-title");
  if (titleTag)
    titleTag.textContent =
      displayName.replace(/\r\n/g, " ").replace(/\n/g, " ") + " — Motel Mediteran";

  // ── Hero ────────────────────────────────────────────────
  const heroImg = document.getElementById("rd-hero-img");
  const heroLabel = document.getElementById("rd-hero-label");
  if (heroImg) {
    heroImg.src = room.photos[0];
    heroImg.alt = displayName + " at Motel Mediteran";
  }
  if (heroLabel)
    heroLabel.innerHTML =
      typeof window.mmPreserveEn === "function"
        ? window.mmPreserveEn(room.label)
        : String(room.label);

  // ── Content ─────────────────────────────────────────────
  const nameEl = document.getElementById("rd-room-name");
  const specsEl = document.getElementById("rd-specs");
  const descEl = document.getElementById("rd-desc");
  const bulletsEl = document.getElementById("rd-bullets");
  const reserveEl = document.getElementById("rd-reserve");

  if (nameEl)
    nameEl.innerHTML =
      typeof window.mmPreserveEnHtml === "function"
        ? window.mmPreserveEnHtml(room.name.replace(/\n/g, "<br>"))
        : room.name.replace("\n", "<br>");

  if (specsEl) {
    specsEl.innerHTML = "";
    room.specs.forEach((s) => {
      const d = document.createElement("div");
      d.className = "rd-spec";
      if (typeof window.mmPreserveEn === "function") d.innerHTML = window.mmPreserveEn(s);
      else d.textContent = s;
      specsEl.appendChild(d);
    });
  }

  if (descEl) descEl.textContent = room.desc;

  if (bulletsEl) {
    bulletsEl.innerHTML = "";
    room.bullets.forEach((b) => {
      const li = document.createElement("li");
      if (typeof window.mmPreserveEn === "function") li.innerHTML = window.mmPreserveEn(b);
      else li.textContent = b;
      bulletsEl.appendChild(li);
    });
  }

  if (reserveEl) {
    reserveEl.href = "book.html";
    reserveEl.addEventListener("click", function (e) {
      e.preventDefault();
      try {
        sessionStorage.setItem("mm_bk_room", JSON.stringify({
          id: roomId,
          name: displayName,
          price: ROOM_PRICES[roomId] || 99,
          thumb: room.photos[0] || ""
        }));
      } catch (_) {}
      window.location.href = "book.html";
    });
  }

  // ── Gallery ─────────────────────────────────────────────
  const galleryTrack = document.getElementById("rd-gallery-track");
  const thumbsWrap = document.getElementById("rd-thumbs");
  const dotsWrap = document.getElementById("rd-dots");
  const counterEl = document.getElementById("rd-counter");
  const prevBtn = document.getElementById("rd-prev");
  const nextBtn = document.getElementById("rd-next");

  if (!galleryTrack) return;

  const photos = room.photos;
  let current = 0;
  let autoTimer = null;

  // Build slides
  galleryTrack.innerHTML = "";
  photos.forEach((src, idx) => {
    const img = document.createElement("img");
    img.className = "rd-gallery__slide";
    img.src = src;
    img.alt = idx === 0 ? displayName + " at Motel Mediteran" : "";
    img.loading = idx === 0 ? "eager" : "lazy";
    img.decoding = "async";
    img.draggable = false;
    galleryTrack.appendChild(img);
  });

  // Build thumbnails
  if (thumbsWrap) {
    thumbsWrap.innerHTML = "";
    photos.forEach((src, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rd-thumb" + (idx === 0 ? " is-active" : "");
      btn.setAttribute("aria-label", "Photo " + (idx + 1));
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      btn.appendChild(img);
      btn.addEventListener("click", () => { go(idx); resetAuto(); });
      thumbsWrap.appendChild(btn);
    });
  }

  // Build dots
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    photos.forEach((_, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rd-dot" + (idx === 0 ? " is-active" : "");
      b.setAttribute("aria-label", "Photo " + (idx + 1));
      b.addEventListener("click", () => { go(idx); resetAuto(); });
      dotsWrap.appendChild(b);
    });
  }

  function updateDots() {
    if (dotsWrap) {
      Array.from(dotsWrap.children).forEach((el, i) =>
        el.classList.toggle("is-active", i === current)
      );
    }
    if (thumbsWrap) {
      Array.from(thumbsWrap.children).forEach((el, i) =>
        el.classList.toggle("is-active", i === current)
      );
    }
  }

  function updateCounter() {
    if (counterEl) counterEl.textContent = (current + 1) + " / " + photos.length;
  }

  function layoutTrack() {
    galleryTrack.style.width = photos.length * 100 + "%";
    Array.from(galleryTrack.children).forEach((el) => {
      el.style.flex = "0 0 " + 100 / photos.length + "%";
      el.style.width = 100 / photos.length + "%";
    });
    go(current, false);
  }

  function go(idx, animate = true) {
    current = ((idx % photos.length) + photos.length) % photos.length;
    if (!animate) {
      galleryTrack.style.transition = "none";
      void galleryTrack.offsetWidth;
    }
    galleryTrack.style.transform =
      "translate3d(-" + (current / photos.length) * 100 + "%, 0, 0)";
    if (!animate) {
      void galleryTrack.offsetWidth;
      galleryTrack.style.transition = "";
    }
    updateCounter();
    updateDots();
  }

  function resetAuto() { startAuto(); }

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => go(current + 1), 5000);
  }

  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  if (prevBtn) prevBtn.addEventListener("click", () => { go(current - 1); startAuto(); });
  if (nextBtn) nextBtn.addEventListener("click", () => { go(current + 1); startAuto(); });

  const frame = document.querySelector(".rd-gallery__frame");
  if (frame) {
    frame.addEventListener("mouseenter", stopAuto);
    frame.addEventListener("mouseleave", startAuto);
  }

  window.addEventListener("resize", layoutTrack);
  layoutTrack();
  updateCounter();
  startAuto();

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;
  const clip = document.querySelector(".rd-gallery__clip");
  if (clip) {
    clip.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    clip.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? current + 1 : current - 1);
        startAuto();
      }
    }, { passive: true });
  }

  // Scroll fade-in
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".rd-fade").forEach((el, i) => {
      el.style.transitionDelay = (i * 60) + "ms";
      io.observe(el);
    });
  } else {
    document.querySelectorAll(".rd-fade").forEach((el) => el.classList.add("is-visible"));
  }
})();
