(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cover = document.querySelector('.wp-block-cover');
  if (cover) cover.classList.add('is-inview');
  if (reduced) return;

  var revealTargets = document.querySelectorAll(
    '.wp-block-columns.alignwide, .wp-block-group.is-style-section-1, .wp-block-group.alignwide, .wp-block-group.alignfull .wp-block-columns.alignwide, .google-reviews-wrap, footer.site-footer-container, footer.mm-footer'
  );

  // Keep the location block static (Lakehouse-like): no reveal motion on map/pin/panel.
  revealTargets = Array.prototype.filter.call(revealTargets, function (el) {
    return !el.closest('.location-feature');
  });

  revealTargets.forEach(function (el) {
    el.classList.add('reveal');
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  revealTargets.forEach(function (el) {
    io.observe(el);
  });
})();
