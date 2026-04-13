/**
 * Hero booking: rooms & guests popover (Hilton-style steppers, Done/Cancel).
 * Draft until Done; syncs hidden fields + Booking.com params via mmBookingRefresh.
 */
(function () {
  var trigger = document.getElementById("mm-book-hero-trigger-guests");
  var labelEl = document.getElementById("mm-book-hero-guests-line");
  var stateEl = document.getElementById("mm-book-guests-state");
  var noRoomsEl = document.getElementById("mm-book-no-rooms");
  var adultsEl = document.getElementById("mm-book-group-adults");
  var childrenEl = document.getElementById("mm-book-group-children");
  if (!trigger || !stateEl || !noRoomsEl || !adultsEl || !childrenEl) return;

  var OPEN = "mm-book-guests--open";
  var MAX_ROOMS = 4;
  var MAX_ADULTS = 8;
  var MAX_CHILDREN = 6;

  var root;
  var panel;
  var rowsWrap;
  var btnAdd;
  var anchorEl = null;
  /** @type {{adults:number,children:number}[]} */
  var snapRooms = [];
  /** @type {{adults:number,children:number}[]} */
  var draftRooms = [];

  function parseState() {
    try {
      var raw = String(stateEl.value || "").trim();
      if (!raw) return null;
      var a = JSON.parse(raw);
      if (!Array.isArray(a) || !a.length) return null;
      return a.map(function (r) {
        return {
          adults: Math.max(1, Math.min(MAX_ADULTS, parseInt(r.adults, 10) || 1)),
          children: Math.max(0, Math.min(MAX_CHILDREN, parseInt(r.children, 10) || 0)),
        };
      });
    } catch (_) {
      return null;
    }
  }

  function defaultRooms() {
    return [{ adults: 2, children: 0 }];
  }

  function cloneRooms(arr) {
    return arr.map(function (r) {
      return { adults: r.adults, children: r.children };
    });
  }

  function writeAggregatesFrom(rooms) {
    var na = 0;
    var nc = 0;
    for (var i = 0; i < rooms.length; i++) {
      na += rooms[i].adults;
      nc += rooms[i].children;
    }
    noRoomsEl.value = String(rooms.length);
    adultsEl.value = String(na);
    childrenEl.value = String(nc);
    stateEl.value = JSON.stringify(rooms);
  }

  function positionPanel() {
    if (!panel || !anchorEl) return;
    var rect = anchorEl.getBoundingClientRect();
    var margin = 10;
    var pw = panel.offsetWidth || 400;
    var ph = panel.offsetHeight || 360;
    var cx = rect.left + rect.width / 2 - pw / 2;
    cx = Math.max(margin, Math.min(cx, window.innerWidth - pw - margin));
    panel.style.left = cx + "px";

    var spaceBelow = window.innerHeight - rect.bottom - margin;
    var spaceAbove = rect.top - margin;
    var preferUp = spaceBelow < ph + 24 && spaceAbove > spaceBelow;
    if (preferUp) {
      panel.style.top = "auto";
      panel.style.bottom = window.innerHeight - rect.top + margin + "px";
    } else {
      panel.style.top = rect.bottom + margin + "px";
      panel.style.bottom = "auto";
    }
  }

  function detachListeners() {
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onDocClickCapture, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll, true);
  }

  function closeUi() {
    root.classList.remove(OPEN);
    root.setAttribute("hidden", "");
    anchorEl = null;
    detachListeners();
    trigger.classList.remove("is-active");
    trigger.setAttribute("aria-expanded", "false");
  }

  function commitAndClose() {
    writeAggregatesFrom(draftRooms);
    noRoomsEl.dispatchEvent(new Event("change", { bubbles: true }));
    adultsEl.dispatchEvent(new Event("change", { bubbles: true }));
    childrenEl.dispatchEvent(new Event("change", { bubbles: true }));
    stateEl.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof window.mmBookingRefresh === "function") window.mmBookingRefresh();
    closeUi();
  }

  function cancelAndClose() {
    closeUi();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelAndClose();
    }
  }

  function onDocClickCapture(e) {
    if (!root.classList.contains(OPEN)) return;
    if (panel.contains(e.target)) return;
    if (trigger.contains(e.target)) return;
    var tIn = document.getElementById("mm-book-hero-trigger-in");
    var tOut = document.getElementById("mm-book-hero-trigger-out");
    if (tIn && tIn.contains(e.target)) return;
    if (tOut && tOut.contains(e.target)) return;
    cancelAndClose();
  }

  function onResize() {
    if (root.classList.contains(OPEN)) positionPanel();
  }

  function onScroll() {
    if (root.classList.contains(OPEN)) positionPanel();
  }

  function stepper(ri, field, delta) {
    var r = draftRooms[ri];
    if (!r) return;
    if (field === "adults") {
      var next = r.adults + delta;
      if (next < 1 || next > MAX_ADULTS) return;
      r.adults = next;
    } else {
      var nc = r.children + delta;
      if (nc < 0 || nc > MAX_CHILDREN) return;
      r.children = nc;
    }
    renderRows();
  }

  function removeRoom(ri) {
    if (draftRooms.length <= 1) return;
    draftRooms.splice(ri, 1);
    renderRows();
  }

  function renderRows() {
    rowsWrap.innerHTML = "";
    for (var ri = 0; ri < draftRooms.length; ri++) {
      (function (idx) {
        var r = draftRooms[idx];
        var block = document.createElement("div");
        block.className = "mm-book-guests__room-block";

        var row = document.createElement("div");
        row.className = "mm-book-guests__row";

        var labCol = document.createElement("div");
        labCol.className = "mm-book-guests__room-label-col";
        var lab = document.createElement("div");
        lab.className = "mm-book-guests__room-label";
        lab.textContent = draftRooms.length > 1 ? "Room " + (idx + 1) : "Room 1";
        labCol.appendChild(lab);
        if (draftRooms.length > 1) {
          var rm = document.createElement("button");
          rm.type = "button";
          rm.className = "mm-book-guests__remove";
          rm.textContent = "Remove";
          rm.addEventListener("click", function () {
            removeRoom(idx);
          });
          labCol.appendChild(rm);
        }
        row.appendChild(labCol);

        function makeStep(field, min, max) {
          var w = document.createElement("div");
          w.className = "mm-book-guests__stepper";
          var bMinus = document.createElement("button");
          bMinus.type = "button";
          bMinus.className = "mm-book-guests__step-btn";
          bMinus.setAttribute("aria-label", field === "adults" ? "Fewer adults" : "Fewer children");
          bMinus.innerHTML = "&#8722;";
          var val = document.createElement("span");
          val.className = "mm-book-guests__step-val";
          val.setAttribute("aria-live", "polite");
          val.textContent = String(field === "adults" ? r.adults : r.children);
          var bPlus = document.createElement("button");
          bPlus.type = "button";
          bPlus.className = "mm-book-guests__step-btn";
          bPlus.setAttribute("aria-label", field === "adults" ? "More adults" : "More children");
          bPlus.textContent = "+";

          var v = field === "adults" ? r.adults : r.children;
          bMinus.disabled = v <= min;
          bPlus.disabled = v >= max;
          bMinus.addEventListener("click", function () {
            stepper(idx, field, -1);
          });
          bPlus.addEventListener("click", function () {
            stepper(idx, field, 1);
          });
          w.appendChild(bMinus);
          w.appendChild(val);
          w.appendChild(bPlus);
          return w;
        }

        row.appendChild(makeStep("adults", 1, MAX_ADULTS));
        row.appendChild(makeStep("children", 0, MAX_CHILDREN));
        block.appendChild(row);
        rowsWrap.appendChild(block);
      })(ri);
    }

    btnAdd.disabled = draftRooms.length >= MAX_ROOMS;
    requestAnimationFrame(positionPanel);
  }

  function openGuests() {
    if (root.classList.contains(OPEN)) {
      commitAndClose();
      return;
    }

    if (typeof window.mmBookingCalendarCancel === "function") window.mmBookingCalendarCancel();

    snapRooms = cloneRooms(parseState() || defaultRooms());
    draftRooms = cloneRooms(snapRooms);
    anchorEl = trigger;

    root.removeAttribute("hidden");
    root.classList.add(OPEN);
    trigger.classList.add("is-active");
    trigger.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-label", "Rooms and guests");
    renderRows();
    requestAnimationFrame(function () {
      positionPanel();
      requestAnimationFrame(positionPanel);
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClickCapture, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
  }

  function buildDom() {
    root = document.createElement("div");
    root.id = "mm-book-guests";
    root.className = "mm-book-guests";
    root.setAttribute("hidden", "");

    var backdrop = document.createElement("div");
    backdrop.className = "mm-book-guests__backdrop";
    backdrop.addEventListener("click", cancelAndClose);

    panel = document.createElement("div");
    panel.className = "mm-book-guests__panel";
    panel.id = "mm-book-guests-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    var head = document.createElement("div");
    head.className = "mm-book-guests__head";
    head.innerHTML =
      "<span>Rooms</span><span>Adults</span><span>Kids</span>";
    panel.appendChild(head);

    rowsWrap = document.createElement("div");
    rowsWrap.className = "mm-book-guests__rows";
    panel.appendChild(rowsWrap);

    btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "mm-book-guests__add";
    btnAdd.innerHTML =
      '<span class="mm-book-guests__add-ic" aria-hidden="true">+</span><span>Add room</span>';
    btnAdd.addEventListener("click", function () {
      if (draftRooms.length >= MAX_ROOMS) return;
      draftRooms.push({ adults: 1, children: 0 });
      renderRows();
    });
    panel.appendChild(btnAdd);

    var note = document.createElement("p");
    note.className = "mm-book-guests__note";
    var phone = document.querySelector(".mm-topbar__phone");
    var tel = phone && phone.getAttribute("href") ? phone.getAttribute("href") : "tel:+17607432300";
    note.innerHTML =
      "Need several rooms or a block? <a href=\"" +
      tel +
      "\">Call the front desk</a> — we&rsquo;ll help with availability.";

    panel.appendChild(note);

    var foot = document.createElement("div");
    foot.className = "mm-book-guests__footer";
    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "mm-book-guests__btn mm-book-guests__btn--ghost";
    btnCancel.textContent = "Cancel";
    btnCancel.addEventListener("click", cancelAndClose);
    var btnDone = document.createElement("button");
    btnDone.type = "button";
    btnDone.className = "mm-book-guests__btn mm-book-guests__btn--primary";
    btnDone.textContent = "Done";
    btnDone.addEventListener("click", commitAndClose);
    foot.appendChild(btnCancel);
    foot.appendChild(btnDone);
    panel.appendChild(foot);

    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);
  }

  window.mmBookingGuestsCancel = cancelAndClose;

  buildDom();
  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    openGuests();
  });

  if (!parseState()) writeAggregatesFrom(defaultRooms());
  if (typeof window.mmBookingRefresh === "function") window.mmBookingRefresh();
})();
