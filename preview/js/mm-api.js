/* =============================================================
   Motel Mediteran — ASI PMS Integration Layer  (mm-api.js)
   =============================================================

   THIS IS THE ONLY FILE YOU NEED TO EDIT WHEN ASI SENDS THEIR API.

   PAYMENT MODEL
   ─────────────
   • Gateway      : Shift4 (you are already set up with them)
   • Tokenization : Shift4 i4Go (iframe — PCI SAQ-A compliant)
   • Charge timing: NO prepayment. Card is stored as a guarantee.
                    Staff charges from ASI FrontDesk at check-out.
   • What ASI gets: Shift4 TrueToken + last 4 digits + name on card

   HOW TO GO LIVE
   ──────────────
   1.  Set  MM_API.config.useMock         = false
   2.  Set  MM_API.config.endpoint        (ASI API base URL)
   3.  Set  MM_API.config.propertyId      (your ASI hotel/property ID)
   4.  Set  MM_API.config.apiKey          (your ASI API key)
   5.  Set  MM_API.config.shift4Endpoint  (from Shift4 account manager)
   6.  Replace the card <input> fields in book.html with the i4Go
       iframe — see the capturePaymentToken() comment below.

   INTEGRATION POINTS (called from book.js)
   ─────────────────────────────────────────
   MM_API.getRateForDate(roomId, date)      → nightly rate or null
   MM_API.checkAvailability(...)            → per-room availability
   MM_API.capturePaymentToken(...)          → Shift4 TrueToken (i4Go)
   MM_API.submitBooking(...)                → create reservation, get ref#

   ============================================================= */

var MM_API = (function () {
  "use strict";

  /* ── Configuration ─────────────────────────────────────── */
  var config = {
    useMock        : false,  // live — routed through netlify/functions/asi-proxy.js
    endpoint       : "",     // ASI base URL  e.g. "https://api.asipm.com/v1"
    propertyId     : "",     // ASI property / hotel ID
    apiKey         : "",     // ASI API key (sent as Bearer token)
    // Shift4 i4Go — get these from your Shift4 account manager
    shift4Endpoint : "",     // "https://access.i4go.com" (live) or "https://access.shift4test.com" (test)
    shift4AuthToken: ""      // Auth Token from Shift4 (exchange for AccessToken server-side)
  };

  /* ── ASI Room Type ID map (confirmed from live GetRoomAvailability response) ──
     linktoRoomTypeMasterId values from reservation.asiwebres.com
     HotelID: 34134  |  HotelMasterID: 2270  |  HotelGUID: 77c9401ba7e640988f8410033a7434cc
     Tax: 10% City Tax
  ────────────────────────────────────────────────────────── */
  var ASI_ROOM_TYPE_IDS = {
    "queen"        : 13697,   // Queen Size Room
    "king"         : 13696,   // King Size Room
    "queen-double" : 13698,   // Room with 2 Queen
    "ada"          : 13701,   // King Handicap (also: 13702 Queen, 13703 2Q)
    "suite-jacuzzi": 13699,   // King room Jacuzzi
    "suite-2room"  : 13700,   // 2 Room Suite with kitchenette
    "suite-kitchen": 13704    // Deluxe King Jaccuzi
  };

  /* ── Mock rate table (base rates synced from live ASI GetRoomAvailability Apr 2026) ──
     base    = standard weekday rate (USD) — confirmed from live API.
     Weekend auto-adjusts: +$20 Fri/Sat, +$10 Sun (approximation).
     unavail = specific dates blocked for that room type (YYYY-MM-DD).
     Tax: 10% City Tax (added at checkout display, not charged by site).

     IMPORTANT: room IDs here must match data-room-id attributes
     on the .mm-bk-room-card elements in book.html.
  ────────────────────────────────────────────────────────── */
  var MOCK_RATES = {
    "queen": {
      base: 74,   // ASI live: $74/night (Queen Size Room)
      unavail: {
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-09": true, "2026-05-10": true,
        "2026-06-13": true, "2026-06-14": true
      }
    },
    "king": {
      base: 79,   // ASI live: $79/night (King Size Room)
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-02": true, "2026-05-23": true, "2026-05-24": true,
        "2026-06-06": true, "2026-06-07": true,
        "2026-06-20": true, "2026-06-21": true
      }
    },
    "ada": {
      base: 99,   // ASI live: $99/night (King/Queen/2Q Handicap)
      unavail: {
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-23": true, "2026-05-24": true,
        "2026-06-06": true, "2026-06-07": true
      }
    },
    "queen-double": {
      base: 84,   // ASI live: $84/night (Room with 2 Queen)
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-05-09": true, "2026-05-10": true,
        "2026-06-13": true, "2026-06-14": true,
        "2026-06-20": true, "2026-06-21": true
      }
    },
    "suite-2room": {
      base: 150,  // ASI live: $150/night (2 Room Suite with kitchenette)
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-05-02": true,
        "2026-05-23": true, "2026-05-24": true,
        "2026-06-20": true, "2026-06-21": true
      }
    },
    "suite-jacuzzi": {
      base: 150,  // ASI live: $150/night (King room Jacuzzi)
      unavail: {
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-09": true, "2026-05-10": true,
        "2026-06-06": true, "2026-06-07": true
      }
    },
    "suite-kitchen": {
      base: 150,  // ASI live: $150/night (Deluxe King Jaccuzi)
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-05-23": true, "2026-05-24": true,
        "2026-06-13": true, "2026-06-14": true
      }
    }
  };

  /* ── Mock availability overrides ───────────────────────────
     Simulates which rooms ASI would return as fully sold-out
     for a given stay regardless of individual date blocks above.
     Set any roomId to false to mark that room as unavailable
     in the mock. The real API will compute this dynamically.
  ────────────────────────────────────────────────────────── */
  var MOCK_AVAILABILITY = {
    "queen"        : true,
    "king"         : true,
    "ada"          : false,   // simulating unavailable for demo
    "queen-double" : true,
    "suite-2room"  : true,
    "suite-jacuzzi": true,
    "suite-kitchen": true
  };

  /* ── Max occupancy per room type ────────────────────────────
     Must match data-max-occupancy attributes on room cards
     in book.html and the "Sleeps X" amenity label.
     The check is: adults + children > maxOccupancy → unavailable.
  ────────────────────────────────────────────────────────── */
  var MOCK_MAX_OCCUPANCY = {
    "queen"        : 2,
    "king"         : 2,
    "ada"          : 2,
    "queen-double" : 4,
    "suite-2room"  : 4,
    "suite-jacuzzi": 2,
    "suite-kitchen": 4
  };

  /* ── Internal helpers ──────────────────────────────────── */
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function fmtKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function mockRateForDate(rd, d) {
    var key = fmtKey(d);
    if (rd.unavail[key]) return null;
    var dow = d.getDay();
    if (dow === 5 || dow === 6) return rd.base + 30;
    if (dow === 0)              return rd.base + 10;
    return rd.base;
  }

  /* ── Public API ────────────────────────────────────────── */
  return {

    config: config,

    /* --------------------------------------------------------
       getRateForDate(roomId, date)
       ─────────────────────────────
       Returns the nightly rate (number) for the given date, or
       null if unavailable / no data.

       • roomId = null  →  BAR: cheapest rate across all rooms
       • roomId = "queen" etc  →  that room's specific rate

       LIVE: reads from _rateCache populated by fetchRatesForCalendar().
       The cache is keyed as { roomId: { "YYYY-MM-DD": rate } }.
       Blocked dates should be absent or mapped to null.
    -------------------------------------------------------- */
    getRateForDate: function (roomId, date) {
      if (config.useMock) return this._mock_getRateForDate(roomId, date);

      var cache = this._rateCache;
      if (!cache) return null;
      var key = fmtKey(date);

      if (!roomId) {
        // BAR from cache
        var min = null;
        Object.keys(cache).forEach(function (id) {
          var r = cache[id] && cache[id][key];
          if (r != null && (min === null || r < min)) min = r;
        });
        return min;
      }
      return (cache[roomId] && cache[roomId][key]) || null;
    },

    _rateCache: null,

    /* --------------------------------------------------------
       fetchRatesForCalendar(callback)
       ────────────────────────────────
       Pre-loads rate data so getRateForDate() can run synchronously.
       Call once on page load, before the calendar first renders.

       callback(error)

       LIVE endpoint: GET /rates
       Query params:  property, checkin (today), checkout (today+90)
       Expected response shape:
         {
           "queen":  { "2026-04-15": 89, "2026-04-16": 89, ... },
           "king":   { ... },
           ...
         }
       Blocked / sold-out dates should be omitted or set to null.
    -------------------------------------------------------- */
    /* ASI room type ID → our internal room ID map (reverse of ASI_ROOM_TYPE_IDS) */
    _asiIdToRoomId: {
      13697: "queen",
      13696: "king",
      13698: "queen-double",
      13701: "ada",
      13702: "ada",
      13703: "ada",
      13699: "suite-jacuzzi",
      13700: "suite-2room",
      13704: "suite-kitchen"
    },

    /* Proxy URL — relative path, works on any domain where the PHP file is deployed */
    _proxyUrl: "php/asi-proxy.php",

    /* --------------------------------------------------------
       _fmtAsiDate(date) → "MM/DD/YYYY"
    -------------------------------------------------------- */
    _fmtAsiDate: function (d) {
      return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear();
    },

    /* --------------------------------------------------------
       _callProxy(checkin, checkout, adults, children, callback)
       Calls the PHP proxy and returns raw ASI room array.
    -------------------------------------------------------- */
    _callProxy: function (checkin, checkout, adults, children, callback) {
      var self = this;
      fetch(self._proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action   : "check",
          checkin  : self._fmtAsiDate(checkin),
          checkout : self._fmtAsiDate(checkout),
          adults   : adults || 1,
          children : children || 0
        })
      })
      .then(function (r) {
        if (!r.ok) throw new Error("Proxy error " + r.status);
        return r.json();
      })
      .then(function (rooms) { callback(null, rooms); })
      .catch(function (err)  { callback(err, null);   });
    },

    fetchRatesForCalendar: function (callback) {
      if (config.useMock) {
        return callback(null);
      }

      /* Call the proxy's calendar action.
         The proxy fetches 90 days of rates from ASI in 30-day chunks,
         caches the result on disk for 15 minutes, and returns a map:
           { "queen": { "2026-05-01": 74, "2026-05-02": null, ... }, ... }
         Null = sold-out / unavailable on that date.
         We store this in _rateCache so getRateForDate() works instantly. */
      var self = this;
      fetch(self._proxyUrl, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ action: "calendar" })
      })
      .then(function (r) {
        if (!r.ok) throw new Error("Calendar proxy error " + r.status);
        return r.json();
      })
      .then(function (calData) {
        self._rateCache = calData;   // { roomId: { "YYYY-MM-DD": rate|null } }
        callback(null);
      })
      .catch(function (err) {
        /* Non-fatal: calendar won't show rates but booking still works */
        console.warn("MM_API: calendar pre-fetch failed —", err.message);
        callback(null);
      });
    },

    /* --------------------------------------------------------
       checkAvailability(checkin, checkout, guests, callback)
       ───────────────────────────────────────────────────────
       Returns availability for every room type for the stay.

       guests = { rooms, adults, children }

       callback(error, results)
       results = [
         { roomId: "queen", available: true,  totalRate: 890 },
         { roomId: "ada",   available: false, totalRate: 0   },
         ...
       ]

       LIVE endpoint: GET /availability
       Query params:  property, checkin, checkout, rooms, adults, children
       Expected response shape (adapt field names to match ASI docs):
         [
           { "room_type_id": "queen", "available": true,  "total": 890 },
           { "room_type_id": "ada",   "available": false, "total": 0   },
           ...
         ]
    -------------------------------------------------------- */
    checkAvailability: function (checkin, checkout, guests, callback) {
      if (config.useMock) {
        return this._mock_checkAvailability(checkin, checkout, guests, callback);
      }

      var self    = this;
      var nights  = Math.round((checkout - checkin) / 86400000);
      var adults  = guests.adults   || 1;
      var children = guests.children || 0;

      self._callProxy(checkin, checkout, adults, children, function (err, rooms) {
        if (err) return callback(err, null);

        /* Build results keyed by our internal room ID.
           Multiple ASI IDs may map to the same internal ID (e.g. ada variants) —
           keep the first available one found. */
        var byRoomId = {};
        (rooms || []).forEach(function (r) {
          var rid = self._asiIdToRoomId[r.id];
          if (!rid) return;
          if (byRoomId[rid] && byRoomId[rid].available) return; // keep available over unavailable
          byRoomId[rid] = {
            roomId      : rid,
            asiRoomTypeId: r.id,
            available   : r.available > 0,
            rate        : r.rate,
            tax         : r.tax,
            totalRate   : r.rate * nights,
            totalWithTax: r.rateWithTax * nights,
            images      : r.images || []
          };
          /* Also update the rate cache for getRateForDate() */
          if (!self._rateCache) self._rateCache = {};
          if (!self._rateCache[rid]) self._rateCache[rid] = {};
          /* Store rate for every night of the stay */
          for (var i = 0; i < nights; i++) {
            var d = new Date(checkin.getTime() + i * 86400000);
            self._rateCache[rid][fmtKey(d)] = r.available > 0 ? r.rate : null;
          }
        });

        callback(null, Object.values(byRoomId));
      });
    },

    /* --------------------------------------------------------
       capturePaymentToken(cardData, callback)
       ─────────────────────────────────────────
       *** THIS IS THE PCI COMPLIANCE STEP — SHIFT4 i4Go ***

       YOUR SETUP:
         • Payment processor : Shift4
         • Tokenization      : Shift4 i4Go (iframe-based)
         • Charge timing     : NO prepayment — card is stored as
                               a GUARANTEE only. Staff charges the
                               card from within ASI FrontDesk at
                               check-in / check-out.

       HOW i4Go WORKS:
         1. You exchange your Shift4 Auth Token for an Access Token
            via a backend call to https://access.i4go.com/api/access
         2. You embed the i4Go iframe on your payment page using
            that Access Token
         3. The iframe captures card number, expiry, and CVV directly
            on Shift4's servers — raw card data NEVER touches your
            server or your JavaScript
         4. i4Go returns a TrueToken (e.g. "4111111111114242")
         5. You send that TrueToken + last4 to ASI via their API
         6. ASI FrontDesk stores the TrueToken against the reservation
         7. Staff runs the actual charge from ASI FrontDesk later

       WHAT TO DO WHEN GOING LIVE:
       ────────────────────────────
       Step A — Get credentials from Shift4:
         • Auth Token (from your Shift4 account manager)
         • i4Go Access Token endpoint:
             Test:  https://access.shift4test.com/api/access
             Live:  https://access.i4go.com/api/access

       Step B — Add these to config above:
         config.shift4AuthToken = "YOUR_AUTH_TOKEN"
         config.shift4Endpoint  = "https://access.i4go.com"  // live
         // config.shift4Endpoint = "https://access.shift4test.com" // test

       Step C — In book.html, replace the card number / expiry / CVV
         <input> fields with the i4Go iframe container:
           <div id="i4go-container"></div>
         Then remove those three <input> fields from book.html.
         Keep nameOnCard and card logos — those stay as-is.

       Step D — Uncomment the live block below.

       REFERENCE: https://s4-myportal.s3.amazonaws.com/downloads/
         documentation/i4go/i4go%20technical%20reference%20guide%20
         using%20an%20access%20token%20and%20iframe.pdf
    -------------------------------------------------------- */
    capturePaymentToken: function (cardData, callback) {
      if (config.useMock) return this._mock_capturePaymentToken(cardData, callback);

      // ── LIVE: Shift4 i4Go ──────────────────────────────────────────
      //
      // This requires a backend endpoint on your server that exchanges
      // config.shift4AuthToken for an AccessToken (keeps Auth Token
      // server-side only — never expose it to the browser).
      //
      // fetch("/api/shift4-access-token")           // your server endpoint
      //   .then(function(r) { return r.json(); })
      //   .then(function(data) {
      //     var i4go = new i4GoSimpleConnect(
      //       data.accessToken,
      //       document.getElementById("i4go-container"),
      //       {
      //         i4goOptions: {
      //           oCSS: "input { font-family: inherit; font-size: 14px; }",
      //           cardNumberInputName : "cardnumber",
      //           cvv2InputName       : "cvv2",
      //           expirationDateName  : "expiry"
      //         },
      //         onSuccess: function(response) {
      //           // response.i4go_uniqueid is the TrueToken
      //           callback(null, response.i4go_uniqueid);
      //         },
      //         onFailure: function(response) {
      //           callback(new Error(response.i4go_response || "Tokenization failed"), null);
      //         }
      //       }
      //     );
      //   })
      //   .catch(function(err) { callback(err, null); });

      // ── ASI WebRes proxy mode ───────────────────────────────────────
      // This property has IsSendCreditCardInfo=false in ASI, meaning
      // ConfirmBooking does not require card data. The motel collects
      // payment at check-in from ASI FrontDesk. No tokenization needed.
      callback(null, "guarantee-at-checkin");
    },

    /* --------------------------------------------------------
       submitBooking(bookingData, callback)
       ─────────────────────────────────────
       Creates the reservation in ASI FrontDesk and returns a ref number.
       NO CHARGE IS MADE — the card is stored as a guarantee only.
       Staff will charge from within ASI FrontDesk at check-in/out.

       bookingData shape:
         {
           roomId, roomName,
           checkin  (Date),
           checkout (Date),
           rooms, adults, children,
           total,
           guest: {
             firstName, lastName, email, phone,
             address, city, state, zip,
             motive, specialRequests
           },
           payment: {
             nameOnCard,
             cardLast4,      ← last 4 digits for display in ASI
             paymentToken    ← Shift4 TrueToken from i4Go iframe
           }
         }

       callback(error, result)
       result = { success: bool, refNumber: "MM-XXXXX", message: "" }

       LIVE: Adapt field names to match the ASI WebRes / FrontDesk API
       docs once you receive them. The Shift4 TrueToken goes in as
       the card guarantee — ASI knows how to charge it via Shift4.
    -------------------------------------------------------- */
    submitBooking: function (bookingData, callback) {
      if (config.useMock) {
        return this._mock_submitBooking(bookingData, callback);
      }

      var self    = this;
      var nights  = Math.round((bookingData.checkout - bookingData.checkin) / 86400000);
      var total   = (bookingData.total || 0).toFixed(2);

      fetch(self._proxyUrl, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          action    : "book",
          checkin   : self._fmtAsiDate(bookingData.checkin),
          checkout  : self._fmtAsiDate(bookingData.checkout),
          adults    : bookingData.adults    || 1,
          children  : bookingData.children  || 0,
          roomId    : bookingData.roomId,
          grandTotal: total,
          nights    : nights,
          guest     : {
            firstName      : bookingData.guest.firstName       || "",
            lastName       : bookingData.guest.lastName        || "",
            email          : bookingData.guest.email           || "",
            phone          : bookingData.guest.phone           || "",
            address        : bookingData.guest.address         || "",
            city           : bookingData.guest.city            || "",
            state          : bookingData.guest.state           || "",
            zip            : bookingData.guest.zip             || "",
            specialRequests: bookingData.guest.specialRequests || ""
          }
        })
      })
      .then(function (r) {
        if (!r.ok) throw new Error("Proxy error " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (data.success) {
          callback(null, { success: true, refNumber: data.refNumber, message: "" });
        } else {
          callback(new Error(data.error || "Booking was not confirmed"), null);
        }
      })
      .catch(function (err) { callback(err, null); });
    },

    /* ========================================================
       MOCK IMPLEMENTATIONS
       Active when config.useMock = true.
       These replicate the real API contract using local data.
    ======================================================== */

    _mock_getRateForDate: function (roomId, date) {
      if (!roomId) {
        // BAR: lowest available rate across all room types
        var min = null;
        Object.keys(MOCK_RATES).forEach(function (id) {
          var r = mockRateForDate(MOCK_RATES[id], date);
          if (r !== null && (min === null || r < min)) min = r;
        });
        return min;
      }
      var rd = MOCK_RATES[roomId];
      return rd ? mockRateForDate(rd, date) : null;
    },

    _mock_checkAvailability: function (checkin, checkout, guests, callback) {
      // Small delay simulates network round-trip
      setTimeout(function () {
        var rooms    = guests.rooms    || 1;
        var adults   = guests.adults   || 2;
        var children = guests.children || 0;
        // Each booked room must fit this many people
        var peoplePerRoom = Math.ceil((adults + children) / rooms);

        var results = Object.keys(MOCK_RATES).map(function (id) {
          // Sold-out override
          if (MOCK_AVAILABILITY[id] === false) {
            return { roomId: id, available: false, totalRate: 0 };
          }
          // Occupancy check — room can't sleep this many people
          var maxOcc = MOCK_MAX_OCCUPANCY[id] || 2;
          if (peoplePerRoom > maxOcc) {
            return { roomId: id, available: false, totalRate: 0 };
          }
          // Date-level blocks within the stay
          var rd = MOCK_RATES[id];
          var available = true;
          var totalRate = 0;
          var cur = new Date(checkin);
          while (cur < checkout) {
            var r = mockRateForDate(rd, cur);
            if (r === null) { available = false; break; }
            totalRate += r;
            cur = new Date(cur.getTime() + 86400000);
          }
          return { roomId: id, available: available, totalRate: totalRate };
        });
        callback(null, results);
      }, 350);
    },

    _mock_capturePaymentToken: function (cardData, callback) {
      // Returns a fake token instantly — no network call in mock mode
      var fakeToken = "tok_mock_" + Math.random().toString(36).substring(2, 12);
      callback(null, fakeToken);
    },

    _mock_submitBooking: function (bookingData, callback) {
      // Simulates an 800 ms API call
      setTimeout(function () {
        // Set success = false here to test the "room no longer available" path
        var success = true;
        var ref = "MM-" + Math.random().toString(36).substring(2, 7).toUpperCase();
        callback(null, { success: success, refNumber: ref, message: "" });
      }, 800);
    }

  };
})();
