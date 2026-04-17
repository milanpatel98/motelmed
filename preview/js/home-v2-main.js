(function () {
  "use strict";

  // Hero image crossfade
  var heroImages = [
    "assets/home-hero/hero-1.jpg",
    "assets/home-hero/hero-2.jpg",
    "assets/home-hero/hero-3.jpg",
    "assets/home-hero/hero-4.jpg",
    "assets/home-hero/hero-5.jpg",
    "assets/home-hero/hero-6.jpg",
    "assets/home-hero/hero-7.jpg"
  ];

  var heroBg = document.getElementById("heroBg");
  var heroContent = document.getElementById("heroContent");
  if (heroBg) {
    var layers = [];
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

  // Hero parallax
  window.addEventListener("scroll", function () {
    if (!heroContent) return;
    var y = window.scrollY;
    if (y < window.innerHeight) {
      heroContent.style.transform = "translateY(" + (y * 0.22) + "px)";
      heroContent.style.opacity = 1 - (y / (window.innerHeight * 0.7));
    }
  }, { passive: true });

  // Room card auto-cycle
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

  // Scroll reveal
  var revealEls = document.querySelectorAll(".v2-home [data-reveal]");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-revealed"); });
  }
})();
