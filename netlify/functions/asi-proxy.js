/**
 * Netlify Serverless Function — ASI WebRes Proxy
 * ================================================
 * Deployed at : /.netlify/functions/asi-proxy
 * Redirected  : /php/asi-proxy.php  →  here  (via netlify.toml)
 *
 * THREE ACTIONS
 * ─────────────
 * calendar  Pre-fetches 90 days of nightly rates for the booking calendar.
 *           Cached in Lambda memory for 15 min (warm invocations only).
 *
 * check     Live availability + total rates for a specific stay.
 *           Cached 5 min per unique stay in Lambda memory.
 *
 * book      Full 4-step ASI booking flow — creates the reservation in
 *           ASI FrontDesk without ever redirecting the guest:
 *             1. GET  RoomAvailability.aspx    → session cookie + Sid
 *             2. POST GetRoomAvailability      → register dates in session
 *             3. POST BookNow                  → lock room into session
 *             4. POST ConfirmBooking           → create reservation
 *
 * NOTE: This property has IsSendCreditCardInfo=false in ASI — no card
 * data is sent during booking. The motel collects payment at check-in.
 */

"use strict";

/* ── Constants ──────────────────────────────────────────────────────────── */
const GUID         = "77c9401ba7e640988f8410033a7434cc";
const BASE         = "https://reservation.asiwebres.com/v5";
const PAGE_URL     = `${BASE}/RoomAvailability.aspx?id=${GUID}&lang=en&Curr=1`;
const AVAIL_URL    = `${BASE}/RoomAvailability.aspx/GetRoomAvailability`;
const BOOK_NOW_URL = `${BASE}/RoomAvailability.aspx/BookNow`;
const CONFIRM_URL  = `${BASE}/ReviewAndBook.aspx/ConfirmBooking`;
const IMG_CDN      = "https://reservation.asiwebres.com/HotelImages/";
const RATE_TYPE_ID = 3323;  // Best Available Rate

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

/* ASI linktoRoomTypeMasterId → your room ID */
const ASI_ID_MAP = {
  13697: "queen", 13696: "king", 13698: "queen-double",
  13701: "ada",   13702: "ada",  13703: "ada",
  13699: "suite-jacuzzi", 13700: "suite-2room", 13704: "suite-kitchen",
};

/* Your room ID → ASI linktoRoomTypeMasterId */
const ROOM_TO_ASI = {
  "queen": 13697, "king": 13696, "queen-double": 13698,
  "ada": 13701, "suite-jacuzzi": 13699, "suite-2room": 13700, "suite-kitchen": 13704,
};

/* ── In-memory cache (survives warm Lambda containers) ──────────────────── */
const _cache = new Map();

function getCached(key, ttlMs) {
  const e = _cache.get(key);
  if (!e || Date.now() - e.ts > ttlMs) { _cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

/* ASI sometimes returns booleans as strings; non-empty strings are truthy in JS,
   so never use `if (!cfResp.BookingStatus)` alone. */
function asiConfirmSucceeded(resp) {
  const s = resp.BookingStatus;
  if (s === true || s === 1) return true;
  if (s === false || s === 0) return false;
  if (s == null || s === "") return false;
  if (typeof s === "string") {
    const t = s.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "success" || t === "confirmed") return true;
    if (t === "false" || t === "0" || t === "no") return false;
  }
  return false;
}

function extractAsiBookingId(resp) {
  const candidates = [
    resp.BookingMasterId,
    resp.BookingID,
    resp.bookingMasterId,
    resp.bookingId,
  ];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = typeof c === "number" ? c : parseInt(String(c), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/* ── Date formatting ────────────────────────────────────────────────────── */
function fmtASI(d) {
  // MM/DD/YYYY
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── Session initialisation ─────────────────────────────────────────────── */
async function initSession() {
  const res = await fetch(PAGE_URL, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`ASI page load failed: ${res.status}`);
  const html = await res.text();

  /* Extract ASP.NET session cookie */
  const rawCookies = res.headers.get("set-cookie") || "";
  const cm = rawCookies.match(/ASP\.NET_SessionId=([^;,\s]+)/i);
  if (!cm) throw new Error("ASI did not return a session cookie");
  const cookie = `ASP.NET_SessionId=${cm[1]}`;

  /* Extract Sid (session file name) hidden in the HTML */
  const sm = html.match(/ContentPlaceHolder1_hdnSessionFileName[^>]*value="([a-f0-9]{32})"/);
  if (!sm) throw new Error("Could not extract Sid from ASI page");

  return { sid: sm[1], cookie };
}

/* ── Shared headers for JSON WebMethod calls ────────────────────────────── */
function asiHeaders(cookie, referer) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://reservation.asiwebres.com",
    "Referer": referer || PAGE_URL,
    "Cookie": cookie,
    "User-Agent": UA,
  };
}

/* ── POST helper ─────────────────────────────────────────────────────────── */
async function postASI(url, payload, cookie, referer) {
  const res = await fetch(url, {
    method: "POST",
    headers: asiHeaders(cookie, referer),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`ASI ${url} → HTTP ${res.status}`);
  return res.json();
}

/* ── Availability fetch (reuses an existing session) ────────────────────── */
async function fetchAvailability(session, checkin, checkout, adults, children) {
  const outer = await postASI(AVAIL_URL, {
    GuId: GUID, Sid: session.sid,
    CheckinDate: checkin, CheckoutDate: checkout,
    AdultChild: [{ Adult: adults, Child: children, Pets: 0 }],
    NoofRooms: 1, PromotionCode: "", txtPromotionCode: "",
    toCurrency: "1", AgentCode: "", isSearchClick: true,
    SelectedLang: "en", IsCalendarView: false,
  }, session.cookie);

  if (!outer.d) return null;
  const inner = JSON.parse(outer.d);
  const rooms = inner.lstAvailableRooms || [];
  if (!rooms.length) return null;

  return rooms.map(r => {
    /* Per-night rates from lstRoomRateType (one entry per night in the stay) */
    const nightly = (r.lstRoomRateType || []).map(n => ({
      date:      n.TranDate ? fmtISO(new Date(n.TranDate)) : null,
      rate:      parseFloat(n.Rate) || 0,
      available: parseInt(n.AvailableRooms ?? 0),
    })).filter(n => n.date);

    /* Availability = min available rooms across all nights */
    const availArr = nightly.map(n => n.available);
    const available = availArr.length ? Math.min(...availArr) : parseInt(r.lstRoomRateType?.[0]?.AvailableRooms ?? 0);

    return {
      id:          r.linktoRoomTypeMasterId,
      name:        r.RoomType || "",
      rateTypeId:  r.linktoRateTypeMasterId,
      rate:        parseFloat(r.TotalRateWithoutTax) || 0,
      tax:         parseFloat(r.TotalTaxAmount) || 0,
      rateWithTax: parseFloat(r.TotalRateWithTax) || 0,
      available,
      maxAdults:   parseInt(r.MaxNoofAdults  || 2),
      maxChildren: parseInt(r.MaxNoofChildren || 0),
      maxOcc:      parseInt(r.MaxOccupancy || 2),
      bedCount:    parseInt(r.BedCount || 1),
      sortOrder:   parseInt(r.Sortorder || 0),
      images:      (r.lstRoomImages || []).map(i => IMG_CDN + i.ImageName),
      nightly,   /* per-night breakdown: [{ date, rate, available }] */
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTION: calendar
   Returns { roomId: { "YYYY-MM-DD": nightlyRate | null } }
   Fetches 90 days in 3×30-day chunks, reusing the same ASI session.
 ═══════════════════════════════════════════════════════════════════════════ */
async function handleCalendar() {
  const cached = getCached("calendar", 15 * 60 * 1000);
  if (cached) return cached;

  const session  = await initSession();
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const calData  = {};
  const CHUNK    = 30;
  const DAYS     = 90;

  for (let offset = 0; offset < DAYS; offset += CHUNK) {
    const ci  = new Date(today); ci.setDate(ci.getDate() + offset);
    const len = Math.min(CHUNK, DAYS - offset);
    const co  = new Date(ci);    co.setDate(co.getDate() + len);

    const rooms = await fetchAvailability(session, fmtASI(ci), fmtASI(co), 1, 0).catch(() => null);
    if (!rooms) continue;

    for (const r of rooms) {
      const rid = ASI_ID_MAP[r.id];
      if (!rid) continue;
      if (!calData[rid]) calData[rid] = {};

      if (r.nightly && r.nightly.length) {
        /* Use exact per-night rates from ASI lstRoomRateType */
        for (const n of r.nightly) {
          if (!n.date) continue;
          if (calData[rid][n.date] === undefined) {
            calData[rid][n.date] = (n.available > 0 && n.rate > 0) ? n.rate : null;
          }
        }
      } else {
        /* Fallback: divide total by chunk length if per-night data is missing */
        const nightlyRate = (r.available > 0 && r.rate > 0 && len > 0) ? +(r.rate / len).toFixed(2) : null;
        for (let i = 0; i < len; i++) {
          const d = new Date(ci); d.setDate(d.getDate() + i);
          const key = fmtISO(d);
          if (calData[rid][key] === undefined) calData[rid][key] = nightlyRate;
        }
      }
    }
  }

  setCached("calendar", calData);
  return calData;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTION: check
   Returns normalised room array with live rates for the specific stay.
 ═══════════════════════════════════════════════════════════════════════════ */
async function handleCheck(checkin, checkout, adults, children) {
  /* No caching — every check availability click fetches live from ASI */
  const session = await initSession();
  const rooms   = await fetchAvailability(session, checkin, checkout, adults, children);
  return rooms || [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTION: book
   Runs the full 4-step ASI flow and creates the reservation in FrontDesk.
 ═══════════════════════════════════════════════════════════════════════════ */
async function handleBook({ checkin, checkout, adults, children, roomId, grandTotal, guest }) {
  const roomTypeMasterId = ROOM_TO_ASI[roomId];
  if (!roomTypeMasterId) throw new Error(`Unknown roomId: ${roomId}`);

  /* Step 1 — session */
  const session = await initSession();
  const { sid, cookie } = session;

  /* Step 2 — register dates */
  await postASI(AVAIL_URL, {
    GuId: GUID, Sid: sid,
    CheckinDate: checkin, CheckoutDate: checkout,
    AdultChild: [{ Adult: adults, Child: children, Pets: 0 }],
    NoofRooms: 1, PromotionCode: "", txtPromotionCode: "",
    toCurrency: "1", AgentCode: "", isSearchClick: true,
    SelectedLang: "en", IsCalendarView: false,
  }, cookie);

  /* Step 3 — select room */
  const bnRaw = await postASI(BOOK_NOW_URL, {
    RoomtypeMasterId: roomTypeMasterId,
    RatetypeMasterId: RATE_TYPE_ID,
    SessionId: sid,
    lstAmenitiesRoom: [], lstAmenitiesHotel: [],
    CanPolicy: null, isNonrefundale: false,
    AgentCode: "", hdnRateTypeMasterId: RATE_TYPE_ID,
    IsAllowBookRefundableRoom: false,
    LowestPriceWithTaxes: "0", LowestPriceWithoutTaxes: "0",
  }, cookie);

  const bnResp = typeof bnRaw.d === "string" ? JSON.parse(bnRaw.d) : (bnRaw.d || {});
  if (!bnResp.BookingSession) throw new Error("ASI BookNow did not confirm room selection");

  /* Step 4 — confirm booking */
  const reviewReferer = `${BASE}/ReviewAndBook.aspx?sid=${sid}&lang=en&Curr=1`;
  const cfRaw = await postASI(CONFIRM_URL, {
    Sid:                        sid,
    txtFirstName:               guest.firstName       || "",
    txtLastName:                guest.lastName        || "",
    txtEmail:                   guest.email           || "",
    txtPhone1:                  guest.phone           || "",
    txtAddress1:                guest.address         || "",
    txtCity:                    guest.city            || "",
    txtState:                   guest.state           || "",
    txtZipcode:                 guest.zip             || "",
    ddlCountry:                 "223",
    ddlCountryName:             "United States",
    ddlMethodType:              "Credit Card",
    ddlMethodTypeId:            "1",
    ddlCardType:                "",
    ddlEstimatedCheckIn:        "",
    txtReqDocument:             "",
    txtSpecialInstruction:      guest.specialRequests || "",
    txtOtherFirstName:          "",
    txtOtherLastName:           "",
    ExtraAdultCharges:          "0",
    ExtraChildrenCharges:       "0",
    ExtraPetCharges:            "0",
    lblPackageOrRoomType:       "",
    GrandTotal:                 grandTotal,
    DepositeAmount:             "0",
    ServiceCharge:              "0",
    CancellationDateTimeText:   "",
    lstInsuredPlanHotelAmenities: [],
  }, cookie, reviewReferer);

  const cfResp = typeof cfRaw.d === "string" ? JSON.parse(cfRaw.d) : (cfRaw.d || {});

  if (!asiConfirmSucceeded(cfResp)) {
    const msg = cfResp.message || cfResp.Message || "ASI did not confirm the booking";
    throw new Error(msg);
  }

  const bookingId = extractAsiBookingId(cfResp);
  if (bookingId == null) {
    console.error("[asi-proxy] ConfirmBooking succeeded flag but no booking ID:", JSON.stringify(cfResp).slice(0, 800));
    throw new Error(
      cfResp.message ||
        cfResp.Message ||
        "ASI did not return a booking number. The reservation may not have been created — please call the property."
    );
  }

  return { success: true, refNumber: `ASI-${bookingId}`, bookingId };
}

/* ═══════════════════════════════════════════════════════════════════════════
   NETLIFY HANDLER
 ═══════════════════════════════════════════════════════════════════════════ */
exports.handler = async (event) => {
  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      action    = "check",
      checkin, checkout,
      adults    = 1,
      children  = 0,
      roomId,
      grandTotal = "0.00",
      guest      = {},
    } = body;

    let result;

    if (action === "calendar") {
      result = await handleCalendar();

    } else if (action === "book") {
      if (!checkin || !checkout || !roomId)
        throw new Error("checkin, checkout and roomId are required");
      result = await handleBook({
        checkin, checkout,
        adults: +adults, children: +children,
        roomId, grandTotal, guest,
      });

    } else {
      /* check (default) */
      if (!checkin || !checkout)
        throw new Error("checkin and checkout are required");
      result = await handleCheck(checkin, checkout, +adults, +children);
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(result) };

  } catch (err) {
    console.error("[asi-proxy]", err.message);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
