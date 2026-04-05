(() => {
  function initSlider(sliderEl) {
    const sliderName = sliderEl.getAttribute("data-rooms-slider-name") || "slider";
    const slides = Array.from(sliderEl.querySelectorAll(".roomsx-slide"));
    const prevBtn = sliderEl.querySelector(".roomsx-slider__arrow--prev");
    const nextBtn = sliderEl.querySelector(".roomsx-slider__arrow--next");
    const dotsWrap = document.querySelector(`[data-rooms-dots][data-rooms-dots-for="${sliderName}"]`);
    const nameEl = document.querySelector(`[data-rooms-slide-name][data-rooms-slide-name-for="${sliderName}"]`);

    const namesBySlider = {
      top: ["Standard King", "Standard Queen", "Standard Two Queens", "Two-Room Kitchen Suite"],
      suites: ["Deluxe King Jacuzzi Suite", "Deluxe King Jacuzzi Interior", "King Jacuzzi Suite", "King Jacuzzi Interior"],
    };
    const slideNames = namesBySlider[sliderName] || [];

    let index = 0;
    let timer = null;

    function renderDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "roomsx-dot";
        b.setAttribute("aria-label", `Go to slide ${i + 1}`);
        b.addEventListener("click", () => {
          setSlide(i);
          restart();
        });
        dotsWrap.appendChild(b);
      });
    }

    function setSlide(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((slide, sIdx) => slide.classList.toggle("is-active", sIdx === index));
      if (dotsWrap) Array.from(dotsWrap.children).forEach((d, dIdx) => d.classList.toggle("is-active", dIdx === index));
      if (nameEl) nameEl.textContent = slideNames[index] || "";
    }

    function next() {
      setSlide(index + 1);
    }

    function prev() {
      setSlide(index - 1);
    }

    function start() {
      stop();
      timer = window.setInterval(next, sliderName === "top" ? 4200 : 5200);
    }

    function stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    }

    function restart() {
      stop();
      start();
    }

    renderDots();
    setSlide(0);
    start();

    if (nextBtn) nextBtn.addEventListener("click", () => { next(); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); restart(); });

    sliderEl.addEventListener("mouseenter", stop);
    sliderEl.addEventListener("mouseleave", start);
  }

  document.querySelectorAll("[data-rooms-slider]").forEach(initSlider);

  const viewAllBtn = document.querySelector("[data-rooms-viewall]");
  const viewAllPanel = document.querySelector("[data-rooms-viewall-panel]");
  if (viewAllBtn && viewAllPanel) {
    viewAllBtn.addEventListener("click", () => {
      const next = viewAllPanel.hasAttribute("hidden");
      viewAllBtn.setAttribute("aria-expanded", String(next));
      viewAllPanel.toggleAttribute("hidden", !next);
      const icon = viewAllBtn.querySelector(".roomsx-viewall__icon");
      if (icon) icon.textContent = next ? "−" : "+";
    });
  }
})();
