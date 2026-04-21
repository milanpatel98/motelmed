(() => {
  const body = document.body;
  const sentinel = document.querySelector(".mm-topbar-sentinel");
  if (body && sentinel && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        body.classList.toggle("is-scrolled", !entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );
    io.observe(sentinel);
  } else if (body) {
    const sync = () => body.classList.toggle("is-scrolled", window.scrollY > 10);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  }

  /* Home: sentinel flips is-scrolled on tiny scroll; keep bar transparent until hero leaves view */
  const heroEl =
    document.getElementById("heroScene") || document.getElementById("v2hero");
  if (body.classList.contains("mm-home") && heroEl && "IntersectionObserver" in window) {
    const heroIo = new IntersectionObserver(
      ([entry]) => {
        body.classList.toggle("mm-home-past-hero", !entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );
    heroIo.observe(heroEl);
  }

  const nav = document.querySelector("[data-mm-nav]");
  const menuBtn = document.getElementById("mm-menu-btn");
  if (!nav || !menuBtn) return;

  /** @type {number | null} */
  let navScrollLockY = null;

  /** Width of the vertical scrollbar so layout does not shift when it disappears. */
  function scrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  /** Restore scroll without smooth scrolling (site.css sets `html { scroll-behavior: smooth }`). */
  function scrollToRestore(y) {
    const root = document.documentElement;
    const prevRoot = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    if (Math.abs(window.scrollY - y) > 1) {
      root.scrollTop = y;
      document.body.scrollTop = y;
    }
    requestAnimationFrame(() => {
      root.style.scrollBehavior = prevRoot;
    });
  }

  function applyNavScrollLock() {
    if (navScrollLockY !== null) return;
    navScrollLockY = window.scrollY;
    const y = navScrollLockY;
    const sbw = scrollbarWidth();
    if (sbw > 0) {
      document.body.style.paddingRight = `${sbw}px`;
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function releaseNavScrollLock() {
    if (navScrollLockY === null) return;
    const y = navScrollLockY;
    navScrollLockY = null;
    document.body.style.paddingRight = "";
    document.documentElement.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    scrollToRestore(y);
  }

  function setNavOpen(open) {
    if (open) {
      /* Scroll lock makes the sentinel think we're at top and drops is-scrolled — keep the solid bar. */
      body.classList.toggle("mm-nav-solid-topbar", body.classList.contains("is-scrolled"));
    } else {
      body.classList.remove("mm-nav-solid-topbar");
    }
    nav.classList.toggle("is-open", open);
    nav.setAttribute("aria-hidden", open ? "false" : "true");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    body.classList.toggle("mm-nav-open", open);
    if (open) applyNavScrollLock();
    else releaseNavScrollLock();

    const closeBtn = nav.querySelector(".mm-nav__close");
    if (open) {
      requestAnimationFrame(() => {
        closeBtn?.focus({ preventScroll: true });
      });
    } else {
      menuBtn.focus({ preventScroll: true });
    }
  }

  const panel = nav.querySelector(".mm-nav__panel");
  const chrome = nav.querySelector(".mm-nav__chrome");
  if (panel) {
    panel.querySelector(".mm-nav__dock")?.remove();
  }
  if (chrome && !chrome.querySelector(".mm-nav__chrome-cta")) {
    const ctaEl = document.querySelector(".mm-topbar__cta");
    if (ctaEl) {
      const a = document.createElement("a");
      a.className = "mm-nav__chrome-cta";
      a.href = ctaEl.getAttribute("href") || "book.html";
      a.textContent = (ctaEl.textContent || "").trim() || "Check availability";
      chrome.appendChild(a);
    }
  }

  menuBtn.addEventListener("click", () => {
    setNavOpen(!nav.classList.contains("is-open"));
  });
  nav.querySelectorAll("[data-mm-nav-close]").forEach((el) => {
    el.addEventListener("click", () => setNavOpen(false));
  });
  nav.querySelectorAll(".mm-nav__list a, a.mm-nav__chrome-cta").forEach((a) => {
    a.addEventListener("click", () => setNavOpen(false));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) setNavOpen(false);
  });
})();
