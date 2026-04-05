(() => {
  const RESERVE_HREF =
    "http://www.booking.com/hotel/us/motel-mediteran.html?aid=330843;lang=en;pb=1";

  const ROOMS = {
    "suite-kitchen": {
      label: "Suite",
      name: "Deluxe King Suite\nwith Kitchen",
      specs: ["King Bed + Queen Bed", "Sleeps 4", "Full Kitchen"],
      desc: "Spacious two-room suite with a full kitchen, dining area, and living space — ideal for longer stays, families, or anyone who wants room to spread out. The kitchen comes fully equipped with two stovetops, a full-size refrigerator, microwave, and utensils, so you can cook and settle in like home.",
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
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/deluxe%20king%20jacuzzi/1.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/2.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/3.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/4.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/5.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/6.png",
      ],
    },

    "suite-jacuzzi": {
      label: "Suite",
      name: "Deluxe King Suite",
      specs: ["King Bed", "Sleeps 2", "In-Room Jacuzzi"],
      desc: "Refined deluxe suite with in-room jacuzzi, upgraded finishes, and a private outdoor patio. A quiet retreat after full days exploring San Diego County — with extra space to unwind in privacy and comfort.",
      bullets: [
        "Sleeps 2",
        "King bed",
        "In-room jacuzzi",
        "Private outdoor patio",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/king%20room%20jacuzzi/1.png",
        "assets/motel-pics/king%20room%20jacuzzi/2.png",
        "assets/motel-pics/king%20room%20jacuzzi/3.png",
        "assets/motel-pics/king%20room%20jacuzzi/4.png",
        "assets/motel-pics/king%20room%20jacuzzi/5.png",
      ],
    },

    "suite-2room": {
      label: "Suite",
      name: "2-Room Suite\nwith Kitchen",
      specs: ["2 Queen Beds", "Sleeps 4", "Separate Living Room"],
      desc: "Two-room suite with separated living and sleeping zones — ideal for families, groups, and extended trips. The kitchen comes with two stovetops, a full-size refrigerator, microwave, and utensils. Practical space for relaxing or planning the day.",
      bullets: [
        "Sleeps 4",
        "Separate living room",
        "Kitchen with 2 stovetops",
        "Full size refrigerator",
        "Microwave",
        "Utensils provided",
        "2 Queen beds",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/2%20rooms%20kitchen%20suite/1.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/2.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/3.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/4.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/5.png",
      ],
    },

    "king": {
      label: "Room",
      name: "Standard King",
      specs: ["King Bed", "Sleeps 2"],
      desc: "Clean, comfortable king room with the practical essentials you need for a restful stay near I-15 in Escondido. Fresh non-smoking environment, free Wi-Fi, and everything set up so you can get in, rest, and head out ready for the day.",
      bullets: [
        "Sleeps 2",
        "King size bed",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/std%20king/1.png",
        "assets/motel-pics/std%20king/2.png",
        "assets/motel-pics/std%20king/3.png",
        "assets/motel-pics/std%20king/4.png",
      ],
    },

    "queen": {
      label: "Room",
      name: "Standard Queen",
      specs: ["Queen Bed", "Sleeps 2"],
      desc: "Comfortable queen room designed for solo travelers and couples. A calm, non-smoking space with free Wi-Fi and the everyday essentials — fridge, microwave, and a flat-screen TV — so you can settle in with ease.",
      bullets: [
        "Sleeps 2",
        "Queen size bed",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/std%20queen/1.png",
        "assets/motel-pics/std%20queen/2.png",
        "assets/motel-pics/std%20queen/3.png",
      ],
    },

    "queen-double": {
      label: "Room",
      name: "Double Queen",
      specs: ["2 Queen Beds", "Sleeps 4"],
      desc: "Roomy double-queen setup with extra sleeping space — a practical choice for small families or friends traveling together. Non-smoking throughout, with free Wi-Fi and daily essentials already taken care of.",
      bullets: [
        "Sleeps 4",
        "2 Queen beds",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/std%202%20queen/1.png",
        "assets/motel-pics/std%202%20queen/2.png",
        "assets/motel-pics/std%202%20queen/3.png",
        "assets/motel-pics/std%202%20queen/4.png",
      ],
    },

    "ada": {
      label: "ADA Accessible",
      name: "Accessible Rooms",
      specs: ["King or Queen Bed", "Roll-In Shower Available"],
      desc: "Accessible accommodations designed for comfort and convenience, with mobility-friendly features for a smooth and restful stay. Available as king, queen, or double-queen configurations — all with practical accessibility features built in.",
      bullets: [
        "King, Queen, or 2-Queen bed",
        "Grab bars in bathroom",
        "Lowered vanity",
        "Roll-in shower (select rooms)",
        "Lowered light switches",
        "Refrigerator",
        "Microwave",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/King%20accessible/1.png",
        "assets/motel-pics/King%20accessible/2.png",
        "assets/motel-pics/King%20accessible/3.png",
        "assets/motel-pics/King%20accessible/4.jpeg",
        "assets/motel-pics/queen%20accessible/1.png",
        "assets/motel-pics/queen%20accessible/2.png",
        "assets/motel-pics/queen%20accessible/3.png",
        "assets/motel-pics/Double%20queen%20accesible/1.png",
        "assets/motel-pics/Double%20queen%20accesible/2.png",
        "assets/motel-pics/Double%20queen%20accesible/3.png",
        "assets/motel-pics/Double%20queen%20accesible/4.jpeg",
      ],
    },
  };

  // ── Read URL param ──────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "king";
  const room = ROOMS[roomId] || ROOMS["king"];
  const displayName = room.name.replace("\n", " ");

  // ── Page title ──────────────────────────────────────────
  const titleTag = document.getElementById("rd-page-title");
  if (titleTag) titleTag.textContent = displayName + " — Motel Mediteran";

  // ── Hero ────────────────────────────────────────────────
  const heroImg = document.getElementById("rd-hero-img");
  const heroLabel = document.getElementById("rd-hero-label");
  if (heroImg) {
    heroImg.src = room.photos[0];
    heroImg.alt = displayName + " at Motel Mediteran";
  }
  if (heroLabel) heroLabel.textContent = room.label;

  // ── Content ─────────────────────────────────────────────
  const nameEl = document.getElementById("rd-room-name");
  const specsEl = document.getElementById("rd-specs");
  const descEl = document.getElementById("rd-desc");
  const bulletsEl = document.getElementById("rd-bullets");
  const reserveEl = document.getElementById("rd-reserve");

  if (nameEl) nameEl.innerHTML = room.name.replace("\n", "<br>");

  if (specsEl) {
    specsEl.innerHTML = "";
    room.specs.forEach((s) => {
      const d = document.createElement("div");
      d.className = "rd-spec";
      d.textContent = s;
      specsEl.appendChild(d);
    });
  }

  if (descEl) descEl.textContent = room.desc;

  if (bulletsEl) {
    bulletsEl.innerHTML = "";
    room.bullets.forEach((b) => {
      const li = document.createElement("li");
      li.textContent = b;
      bulletsEl.appendChild(li);
    });
  }

  if (reserveEl) reserveEl.href = RESERVE_HREF;

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

  // Auto-slide — always clear before setting to prevent stacked intervals
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

  // Pause on hover — use the frame so arrows don't trigger mouseleave
  const frame = document.querySelector(".rd-gallery__frame");
  if (frame) {
    frame.addEventListener("mouseenter", stopAuto);
    frame.addEventListener("mouseleave", startAuto);
  }

  window.addEventListener("resize", layoutTrack);
  layoutTrack();
  updateCounter();
  startAuto();

  // Touch swipe support
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
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? current + 1 : current - 1);
        startAuto();
      }
    }, { passive: true });
  }

  // ── Scroll fade-in ──────────────────────────────────────
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

    // Stagger the fade-ins
    document.querySelectorAll(".rd-fade").forEach((el, i) => {
      el.style.transitionDelay = (i * 60) + "ms";
      io.observe(el);
    });
  } else {
    // Fallback: just show everything
    document.querySelectorAll(".rd-fade").forEach((el) => el.classList.add("is-visible"));
  }
})();
