(function () {
  var root = document.querySelector(".mm-td-near");
  if (!root) return;

  var grid = root.querySelector("[data-mm-td-grid]");
  if (grid) grid.classList.add("mm-td-grid--js");

  var filters = root.querySelectorAll('.mm-td-filters input[type="checkbox"][name="td-filter"]');
  var cards = root.querySelectorAll(".mm-td-card[data-mm-td-categories]");

  try {
    var params = new URLSearchParams(window.location.search);
    var pref = params.get("td-filter") || (window.location.hash || "").replace(/^#/, "").trim();
    if (pref) {
      for (var fi = 0; fi < filters.length; fi++) {
        if (filters[fi].value === pref) {
          for (var j = 0; j < filters.length; j++) {
            filters[j].checked = j === fi;
          }
          break;
        }
      }
    }
  } catch (err) {}

  function parseCategories(card) {
    var raw = card.getAttribute("data-mm-td-categories") || "";
    return raw.split(/\s+/).filter(Boolean);
  }

  function apply() {
    var selected = [];
    for (var i = 0; i < filters.length; i++) {
      if (filters[i].checked) selected.push(filters[i].value);
    }

    var showAll = selected.length === 0;

    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      if (showAll) {
        card.hidden = false;
        continue;
      }
      var cats = parseCategories(card);
      var match = false;
      for (var s = 0; s < selected.length; s++) {
        if (cats.indexOf(selected[s]) !== -1) {
          match = true;
          break;
        }
      }
      card.hidden = !match;
    }

    var seenVisible = false;
    for (var j = 0; j < cards.length; j++) {
      var cd = cards[j];
      if (cd.hidden) {
        cd.classList.remove("mm-td-card--joint-top");
        continue;
      }
      cd.classList.toggle("mm-td-card--joint-top", seenVisible);
      seenVisible = true;
    }
  }

  for (var f = 0; f < filters.length; f++) {
    filters[f].addEventListener("change", function (e) {
      var t = e.target;
      if (t.checked) {
        for (var i = 0; i < filters.length; i++) {
          if (filters[i] !== t) filters[i].checked = false;
        }
      }
      apply();
      // Persist active filter in URL hash so back/refresh restores selection
      try {
        var active = null;
        for (var k = 0; k < filters.length; k++) {
          if (filters[k].checked) { active = filters[k].value; break; }
        }
        history.replaceState(null, "", active ? "#" + active : window.location.pathname + window.location.search);
      } catch (_) {}
    });
  }

  apply();
})();
