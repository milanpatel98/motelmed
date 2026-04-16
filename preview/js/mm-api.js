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
    useMock        : true,   // ← flip to false once ASI credentials arrive
    endpoint       : "",     // ASI base URL  e.g. "https://api.asipm.com/v1"
    propertyId     : "",     // ASI property / hotel ID
    apiKey         : "",     // ASI API key (sent as Bearer token)
    // Shift4 i4Go — get these from your Shift4 account manager
    shift4Endpoint : "",     // "https://access.i4go.com" (live) or "https://access.shift4test.com" (test)
    shift4AuthToken: ""      // Auth Token from Shift4 (exchange for AccessToken server-side)
  };

  /* ── Mock rate table ───────────────────────────────────────
     Mirrors what the ASI /rates endpoint will return.
     base    = standard weekday rate (USD).
     Weekend auto-adjusts: +$30 Fri/Sat, +$10 Sun.
     unavail = specific dates blocked for that room type (YYYY-MM-DD).

     IMPORTANT: room IDs here must match data-room-id attributes
     on the .mm-bk-room-card elements in book.html.
  ────────────────────────────────────────────────────────── */
  var MOCK_RATES = {
    "queen": {
      base: 89,
      unavail: {
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-09": true, "2026-05-10": true,
        "2026-06-13": true, "2026-06-14": true
      }
    },
    "king": {
      base: 99,
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-02": true, "2026-05-23": true, "2026-05-24": true,
        "2026-06-06": true, "2026-06-07": true,
        "2026-06-20": true, "2026-06-21": true
      }
    },
    "ada": {
      base: 99,
      unavail: {
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-23": true, "2026-05-24": true,
        "2026-06-06": true, "2026-06-07": true
      }
    },
    "queen-double": {
      base: 109,
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-05-09": true, "2026-05-10": true,
        "2026-06-13": true, "2026-06-14": true,
        "2026-06-20": true, "2026-06-21": true
      }
    },
    "suite-2room": {
      base: 129,
      unavail: {
        "2026-04-18": true, "2026-04-19": true,
        "2026-05-02": true,
        "2026-05-23": true, "2026-05-24": true,
        "2026-06-20": true, "2026-06-21": true
      }
    },
    "suite-jacuzzi": {
      base: 149,
      unavail: {
        "2026-04-25": true, "2026-04-26": true,
        "2026-05-09": true, "2026-05-10": true,
        "2026-06-06": true, "2026-06-07": true
      }
    },
    "suite-kitchen": {
      base: 189,
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
    fetchRatesForCalendar: function (callback) {
      if (config.useMock) {
        // Mock: nothing to fetch — getRateForDate reads MOCK_RATES directly
        return callback(null);
      }
      var self = this;
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var end = new Date(today.getTime() + 90 * 86400000);

      fetch(
        config.endpoint + "/rates"
        + "?property=" + encodeURIComponent(config.propertyId)
        + "&checkin="  + fmtKey(today)
        + "&checkout=" + fmtKey(end),
        { headers: { "Authorization": "Bearer " + config.apiKey } }
      )
      .then(function (r) {
        if (!r.ok) throw new Error("Rates fetch failed: " + r.status);
        return r.json();
      })
      .then(function (data) {
        self._rateCache = data;   // { roomId: { "YYYY-MM-DD": rate } }
        callback(null);
      })
      .catch(function (err) { callback(err); });
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
      var qs = [
        "property=" + encodeURIComponent(config.propertyId),
        "checkin="  + fmtKey(checkin),
        "checkout=" + fmtKey(checkout),
        "rooms="    + (guests.rooms    || 1),
        "adults="   + (guests.adults   || 2),
        "children=" + (guests.children || 0)
      ].join("&");

      fetch(config.endpoint + "/availability?" + qs, {
        headers: { "Authorization": "Bearer " + config.apiKey }
      })
      .then(function (r) {
        if (!r.ok) throw new Error("Availability fetch failed: " + r.status);
        return r.json();
      })
      .then(function (data) {
        var results = data.map(function (item) {
          return {
            roomId    : item.room_type_id,   // ← adjust key to match ASI response
            available : item.available,
            totalRate : item.total
          };
        });
        callback(null, results);
      })
      .catch(function (err) { callback(err, null); });
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

      callback(new Error("Shift4 i4Go not yet configured — follow steps A–D in the comment above."), null);
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
      fetch(config.endpoint + "/reservations", {
        method : "POST",
        headers: {
          "Content-Type" : "application/json",
          "Authorization": "Bearer " + config.apiKey
        },
        body: JSON.stringify({
          property_id      : config.propertyId,
          room_type_id     : bookingData.roomId,
          checkin          : fmtKey(bookingData.checkin),
          checkout         : fmtKey(bookingData.checkout),
          rooms            : bookingData.rooms,
          adults           : bookingData.adults,
          children         : bookingData.children,
          rate_total       : bookingData.total,
          guarantee_type   : "CC",               // card guarantee, not prepayment
          guest_first_name : bookingData.guest.firstName,
          guest_last_name  : bookingData.guest.lastName,
          guest_email      : bookingData.guest.email,
          guest_phone      : bookingData.guest.phone,
          guest_address    : bookingData.guest.address,
          guest_city       : bookingData.guest.city,
          guest_state      : bookingData.guest.state,
          guest_zip        : bookingData.guest.zip,
          motive           : bookingData.guest.motive,
          special_requests : bookingData.guest.specialRequests,
          // Shift4 TrueToken — ASI stores this and charges via Shift4 at desk
          cc_truetoken     : bookingData.payment.paymentToken,
          cc_last4         : bookingData.payment.cardLast4,
          cc_name          : bookingData.payment.nameOnCard
        })
      })
      .then(function (r) {
        if (!r.ok) throw new Error("Booking failed: " + r.status);
        return r.json();
      })
      .then(function (data) {
        callback(null, {
          success   : data.success !== false && data.status !== "error",
          refNumber : data.reservation_id || data.ref || data.confirmation_number || "MM-ERR",
          message   : data.message || ""
        });
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
        var results = Object.keys(MOCK_RATES).map(function (id) {
          // Room-level override first
          if (MOCK_AVAILABILITY[id] === false) {
            return { roomId: id, available: false, totalRate: 0 };
          }
          // Then check for any blocked dates within the stay
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
