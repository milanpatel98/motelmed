(function () {
  "use strict";

  var heroBg = document.getElementById("heroBg");

  var heroImages = [
    "assets/home-hero/hero-1.jpg",
    "assets/home-hero/hero-2.jpg",
    "assets/home-hero/hero-3.jpg",
    "assets/home-hero/hero-4.jpg",
    "assets/home-hero/hero-5.jpg",
    "assets/home-hero/hero-6.jpg",
    "assets/home-hero/hero-7.jpg"
  ];

  var layers = [];

  if (heroBg) {
    heroImages.forEach(function (src) {
      var div = document.createElement("div");
      div.className = "v2-hero__layer";
      div.style.backgroundImage = "url(" + src + ")";
      heroBg.appendChild(div);
      layers.push(div);
    });

    if (layers.length) {
      var current = 0;
      layers[0].classList.add("is-active");
      setInterval(function () {
        layers[current].classList.remove("is-active");
        current = (current + 1) % layers.length;
        layers[current].classList.add("is-active");
      }, 5500);
    }
  }

  var prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Splits paragraph text into individual word <span> elements and returns them
  function splitIntoWords(el) {
    var words = [];
    el.querySelectorAll("p").forEach(function (p) {
      var tokens = p.textContent.trim().split(/\s+/);
      p.innerHTML = tokens.map(function (w) {
        return '<span class="mm-word">' + w + "</span>";
      }).join(" ");
      Array.prototype.push.apply(words, Array.from(p.querySelectorAll(".mm-word")));
    });
    return words;
  }

  function initAnimations() {
    if (prefersReduced) return;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    // ─── 1. Hero background — slow parallax drift ───────────────────
    // Background images shift position at ~70% of scroll speed,
    // making the landscape feel deeper than the content above it.
    if (layers.length) {
      gsap.fromTo(layers,
        { backgroundPositionY: "50%" },
        {
          backgroundPositionY: "70%",
          ease: "none",
          scrollTrigger: {
            trigger: ".v2-hero",
            start: "top top",
            end: "bottom top",
            scrub: true
          }
        }
      );
    }

    // ─── 2. Hero content — rises and dissolves as you scroll away ────
    var heroContentEl = document.getElementById("heroContent");
    if (heroContentEl) {
      gsap.fromTo(heroContentEl,
        { y: 0, autoAlpha: 1 },
        {
          y: -70,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".v2-hero",
            start: "top top",
            end: "38% top",
            scrub: true
          }
        }
      );
    }

    // ─── 3. Scroll indicator — vanishes on first scroll ──────────────
    // fromTo with explicit start so GSAP doesn't capture the CSS animation's
    // initial opacity:0 (from fadeUp's 1.8s delay) as the "from" value.
    var scrollHintEl = document.querySelector(".v2-hero__scroll");
    if (scrollHintEl) {
      gsap.fromTo(scrollHintEl,
        { autoAlpha: 1 },
        {
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".v2-hero",
            start: "top top",
            end: "10% top",
            scrub: true
          }
        }
      );
    }

    // ─── 4. Intro quote — word-by-word blur reveal ───────────────────
    // Each word fades in from blurred + slightly below, staggered as the
    // section enters. This is the signature effect of elite hotel sites —
    // it makes the visitor feel like they're reading something being
    // written live just for them.
    var introQuote = document.querySelector(".v2-intro__quote");
    if (introQuote) {
      var words = splitIntoWords(introQuote);
      gsap.set(words, { opacity: 0, filter: "blur(10px)", y: 12 });
      gsap.to(words, {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.75,
        ease: "power2.out",
        stagger: { each: 0.07, from: "start" },
        scrollTrigger: {
          trigger: ".v2-intro",
          start: "top 68%",
          toggleActions: "play none none none"
        }
      });
    }

    // ─── 5. Intro body — elegant fade-up ─────────────────────────────
    var introBody = document.querySelector(".v2-intro__body");
    if (introBody) {
      gsap.fromTo(introBody,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".v2-intro",
            start: "top 62%",
            toggleActions: "play none none none"
          }
        }
      );
    }

    // ─── 6. Room cards — clip-path curtain reveal ────────────────────
    // All three cards share a single ScrollTrigger on the grid so they
    // animate as a choreographed wave: image curtain opens from bottom,
    // then the card body fades up underneath it.
    var roomsGrid = document.querySelector(".v2-rooms__grid");
    if (roomsGrid) {
      var cards = roomsGrid.querySelectorAll(".v2-room-card");
      var roomTl = gsap.timeline({
        scrollTrigger: {
          trigger: roomsGrid,
          start: "top 80%",
          toggleActions: "play none none none"
        }
      });

      cards.forEach(function (card, i) {
        var img  = card.querySelector(".v2-room-card__img");
        var body = card.querySelector(".v2-room-card__body");
        var offset = i * 0.14;

        if (img) {
          gsap.set(img, { clipPath: "inset(100% 0 0 0)" });
          roomTl.to(img, {
            clipPath: "inset(0% 0 0 0)",
            duration: 1.2,
            ease: "power3.out"
          }, offset);
        }
        if (body) {
          gsap.set(body, { opacity: 0, y: 20 });
          roomTl.to(body, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out"
          }, offset + 0.38);
        }
      });
    }

    // ─── 7. Gallery — wave of clip-path reveals ───────────────────────
    var galleryGrid = document.querySelector(".v2-gallery__grid");
    if (galleryGrid) {
      var items = galleryGrid.querySelectorAll(".v2-gallery__item");
      items.forEach(function (item) {
        gsap.set(item, { clipPath: "inset(0 0 100% 0)" });
      });
      var galleryTl = gsap.timeline({
        scrollTrigger: {
          trigger: galleryGrid,
          start: "top 82%",
          toggleActions: "play none none none"
        }
      });
      items.forEach(function (item, i) {
        galleryTl.to(item, {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.05,
          ease: "power2.out"
        }, i * 0.09);
      });
    }

    // ─── 8. Pool image — true parallax within overflow:hidden ────────
    var poolImgEl = document.querySelector(".v2-pool__img img");
    if (poolImgEl) {
      poolImgEl.style.transition = "none";
      poolImgEl.style.height = "calc(100% + 80px)";
      poolImgEl.style.marginTop = "-40px";
      gsap.fromTo(poolImgEl,
        { y: -30 },
        {
          y: 30,
          ease: "none",
          scrollTrigger: {
            trigger: ".v2-pool",
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    }

    // ─── 9. CTA background — cinematic slow float ────────────────────
    var ctaBgEl = document.getElementById("ctaBg");
    if (ctaBgEl) {
      gsap.fromTo(ctaBgEl,
        { backgroundPositionY: "35%" },
        {
          backgroundPositionY: "65%",
          ease: "none",
          scrollTrigger: {
            trigger: ".v2-cta",
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    }

    window.addEventListener("load",   function () { ScrollTrigger.refresh(); }, { once: true });
    window.addEventListener("resize", function () { ScrollTrigger.refresh(); }, { passive: true });
  }

  initAnimations();

  // Room card image auto-cycle
  document.querySelectorAll(".v2-room-card__img").forEach(function (wrap) {
    var imgs = wrap.querySelectorAll("img");
    if (imgs.length < 2) return;
    var idx = 0;
    setInterval(function () {
      imgs[idx].classList.remove("is-active");
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add("is-active");
    }, 3200);
  });

  // CSS scroll reveal — covers all [data-reveal] elements that GSAP doesn't own
  var revealEls = document.querySelectorAll(".v2-home [data-reveal]");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-revealed"); });
  }
})();
