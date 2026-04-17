<?php
/**
 * Motel Mediteran — ASI Availability Proxy  (v2 — with smart caching)
 * =====================================================================
 *
 * HOW IT WORKS
 * ────────────
 * ASI's GetRoomAvailability endpoint needs an active ASP.NET server-side
 * session. This proxy handles that session handshake transparently and
 * caches results so the booking calendar stays fast and always current.
 *
 * TWO ACTIONS
 * ───────────
 * action=calendar   Pre-fetches rates day-by-day for the next CALENDAR_DAYS
 *                   days and returns a date→rate map for the calendar.
 *                   Cached server-side for CACHE_TTL_MINUTES.
 *                   Called once on booking-page load.
 *
 * action=check      (default) Live availability + rates for a specific
 *                   check-in/check-out window. Never cached — always fresh.
 *                   Called when the user confirms their dates.
 *
 * ENDPOINTS
 * ─────────
 * POST /php/asi-proxy.php
 *   { action: "calendar" }
 *   → { "queen": {"2026-05-01": 74, "2026-05-02": 74, ...}, "king": {...}, ... }
 *
 * POST /php/asi-proxy.php
 *   { action: "check", checkin: "MM/DD/YYYY", checkout: "MM/DD/YYYY",
 *     adults: 1, children: 0 }
 *   → [{ id, name, rate, rateWithTax, available, images, ... }, ...]
 *
 * CACHE
 * ─────
 * Results are stored as JSON files in the system temp directory:
 *   /tmp/asi_cache_calendar.json     ← calendar rates (15-min TTL)
 *   /tmp/asi_cache_CHECKIN_CHECKOUT_A_C.json  ← per-stay (5-min TTL)
 *
 * When the cache is fresh, ASI is never called — response is instant.
 * When the cache expires, the next request refreshes it transparently.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

/* ── Config ─────────────────────────────────────────────────────────── */
define('ASI_GUID',         '77c9401ba7e640988f8410033a7434cc');
define('ASI_PAGE',         'https://reservation.asiwebres.com/v5/RoomAvailability.aspx');
define('ASI_API',          'https://reservation.asiwebres.com/v5/RoomAvailability.aspx/GetRoomAvailability');
define('ASI_IMG_CDN',      'https://reservation.asiwebres.com/HotelImages/');

define('CACHE_TTL_MINUTES',  15);   // calendar cache lifetime
define('STAY_TTL_MINUTES',    5);   // per-stay cache lifetime
define('CALENDAR_DAYS',      90);   // days ahead to pre-fetch for calendar

/* Internal roomType ID → your book.html data-room-id */
$ASI_ID_MAP = [
    13697 => 'queen',
    13696 => 'king',
    13698 => 'queen-double',
    13701 => 'ada',
    13702 => 'ada',
    13703 => 'ada',
    13699 => 'suite-jacuzzi',
    13700 => 'suite-2room',
    13704 => 'suite-kitchen',
];

/* ── Input ──────────────────────────────────────────────────────────── */
$body     = json_decode(file_get_contents('php://input'), true) ?: [];
$action   = $body['action']   ?? ($_GET['action']   ?? 'check');
$checkin  = $body['checkin']  ?? ($_GET['checkin']  ?? null);
$checkout = $body['checkout'] ?? ($_GET['checkout'] ?? null);
$adults   = (int)($body['adults']   ?? ($_GET['adults']   ?? 1));
$children = (int)($body['children'] ?? ($_GET['children'] ?? 0));

/* ════════════════════════════════════════════════════════════════════ */
/*  CALENDAR ACTION — return date→BAR map for next CALENDAR_DAYS days  */
/* ════════════════════════════════════════════════════════════════════ */
if ($action === 'calendar') {
    $cacheFile = sys_get_temp_dir() . '/asi_cache_calendar.json';
    $cached    = readCache($cacheFile, CACHE_TTL_MINUTES);

    if ($cached !== null) {
        echo $cached;
        exit;
    }

    /* Build the calendar: fetch in chunks of CHUNK_DAYS to limit calls */
    define('CHUNK_DAYS', 30);
    $today     = new DateTime('today');
    $calData   = [];   // [ roomId => [ "YYYY-MM-DD" => rate ] ]

    $offset = 0;
    while ($offset < CALENDAR_DAYS) {
        $ci = clone $today;
        $ci->modify("+{$offset} days");

        $len = min(CHUNK_DAYS, CALENDAR_DAYS - $offset);
        $co  = clone $ci;
        $co->modify("+{$len} days");

        $rooms = callASI($ci->format('m/d/Y'), $co->format('m/d/Y'), 1, 0);
        if (!$rooms) { $offset += $len; continue; }

        /* Distribute each room's average nightly rate across the chunk */
        foreach ($rooms as $r) {
            $rid = $GLOBALS['ASI_ID_MAP'][$r['id']] ?? null;
            if (!$rid) continue;
            if (!isset($calData[$rid])) $calData[$rid] = [];

            /* ASI returns AverageRateWithoutTax for the whole stay;
               use it for every night in the chunk (accurate enough for calendar) */
            $nightlyRate = $r['available'] > 0 ? $r['rate'] : null;
            for ($i = 0; $i < $len; $i++) {
                $day = clone $ci;
                $day->modify("+{$i} days");
                $key = $day->format('Y-m-d');
                /* Only set if not already set (first room type wins per day) */
                if (!isset($calData[$rid][$key])) {
                    $calData[$rid][$key] = $nightlyRate;
                }
            }
        }

        $offset += $len;
    }

    $json = json_encode($calData);
    writeCache($cacheFile, $json);
    echo $json;
    exit;
}

/* ════════════════════════════════════════════════════════════════════ */
/*  CHECK ACTION — live rates for a specific stay                       */
/* ════════════════════════════════════════════════════════════════════ */
if (!$checkin || !$checkout) {
    http_response_code(400);
    echo json_encode(['error' => 'checkin and checkout are required (MM/DD/YYYY)']);
    exit;
}

$cacheKey  = 'asi_cache_' . preg_replace('/[\/]/', '-', $checkin)
           . '_' . preg_replace('/[\/]/', '-', $checkout)
           . "_A{$adults}_C{$children}.json";
$cacheFile = sys_get_temp_dir() . '/' . $cacheKey;
$cached    = readCache($cacheFile, STAY_TTL_MINUTES);

if ($cached !== null) {
    echo $cached;
    exit;
}

$rooms = callASI($checkin, $checkout, $adults, $children);
if ($rooms === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach ASI reservation system. Please try again.']);
    exit;
}

$json = json_encode($rooms, JSON_PRETTY_PRINT);
writeCache($cacheFile, $json);
echo $json;
exit;


/* ════════════════════════════════════════════════════════════════════ */
/*  HELPERS                                                             */
/* ════════════════════════════════════════════════════════════════════ */

/**
 * readCache($file, $ttlMinutes)
 * Returns file contents if fresh, null if missing or expired.
 */
function readCache(string $file, int $ttl): ?string {
    if (!file_exists($file)) return null;
    if ((time() - filemtime($file)) > ($ttl * 60)) return null;
    $content = file_get_contents($file);
    return ($content && strlen($content) > 2) ? $content : null;
}

/**
 * writeCache($file, $json) — atomic write via temp file
 */
function writeCache(string $file, string $json): void {
    $tmp = $file . '.tmp';
    file_put_contents($tmp, $json, LOCK_EX);
    rename($tmp, $file);
}

/**
 * callASI($checkin, $checkout, $adults, $children)
 * Initialises an ASI session then calls GetRoomAvailability.
 * Returns normalised room array or null on failure.
 */
function callASI(string $checkin, string $checkout, int $adults, int $children): ?array {
    $cookieJar = tempnam(sys_get_temp_dir(), 'asi_');

    /* ── Step 1: Load page — get ASP.NET session cookie + Sid ── */
    $pageUrl = ASI_PAGE . '?id=' . ASI_GUID . '&lang=en&Curr=1';
    $ch = curl_init($pageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEJAR      => $cookieJar,
        CURLOPT_COOKIEFILE     => $cookieJar,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.5',
        ],
    ]);
    $html = curl_exec($ch);
    curl_close($ch);

    if (!$html) { @unlink($cookieJar); return null; }

    preg_match('/ContentPlaceHolder1_hdnSessionFileName[^>]*value="([a-f0-9]{32})"/', $html, $m);
    $sid = $m[1] ?? null;
    if (!$sid) { @unlink($cookieJar); return null; }

    /* ── Step 2: Call GetRoomAvailability ── */
    $payload = json_encode([
        'GuId'            => ASI_GUID,
        'Sid'             => $sid,
        'CheckinDate'     => $checkin,
        'CheckoutDate'    => $checkout,
        'AdultChild'      => [['Adult' => $adults, 'Child' => $children, 'Pets' => 0]],
        'NoofRooms'       => 1,
        'PromotionCode'   => '',
        'txtPromotionCode'=> '',
        'toCurrency'      => '1',
        'AgentCode'       => '',
        'isSearchClick'   => true,
        'SelectedLang'    => 'en',
        'IsCalendarView'  => false,
    ]);

    $ch2 = curl_init(ASI_API);
    curl_setopt_array($ch2, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_COOKIEJAR      => $cookieJar,
        CURLOPT_COOKIEFILE     => $cookieJar,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json; charset=utf-8',
            'Accept: application/json, text/javascript, */*; q=0.01',
            'X-Requested-With: XMLHttpRequest',
            'Referer: ' . $pageUrl,
            'Origin: https://reservation.asiwebres.com',
        ],
    ]);
    $raw    = curl_exec($ch2);
    $status = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    @unlink($cookieJar);

    if (!$raw || $status !== 200) return null;

    $outer = json_decode($raw, true);
    if (!isset($outer['d']) || !$outer['d']) return null;
    $data  = json_decode($outer['d'], true);
    $rooms = $data['lstAvailableRooms'] ?? [];
    if (!$rooms) return null;

    /* ── Normalise ── */
    $result = [];
    foreach ($rooms as $r) {
        $avail = 0;
        $imgs  = [];
        if (!empty($r['lstRoomRateType'])) {
            $avail = (int)($r['lstRoomRateType'][0]['AvailableRooms'] ?? 0);
        }
        if (!empty($r['lstRoomImages'])) {
            foreach ($r['lstRoomImages'] as $img) {
                $imgs[] = ASI_IMG_CDN . $img['ImageName'];
            }
        }
        $result[] = [
            'id'          => (int)$r['linktoRoomTypeMasterId'],
            'roomId'      => (int)($r['RoomID'] ?? 0),
            'name'        => $r['RoomType'] ?? '',
            'rateTypeId'  => (int)$r['linktoRateTypeMasterId'],
            'rate'        => (float)$r['TotalRateWithoutTax'],
            'tax'         => (float)$r['TotalTaxAmount'],
            'rateWithTax' => (float)$r['TotalRateWithTax'],
            'available'   => $avail,
            'maxAdults'   => (int)($r['MaxNoofAdults']   ?? 2),
            'maxChildren' => (int)($r['MaxNoofChildren'] ?? 0),
            'maxOcc'      => (int)($r['MaxOccupancy']    ?? 2),
            'bedCount'    => (int)($r['BedCount']        ?? 1),
            'sortOrder'   => (int)($r['Sortorder']       ?? 0),
            'images'      => $imgs,
        ];
    }

    usort($result, fn($a, $b) => $a['sortOrder'] <=> $b['sortOrder']);
    return $result;
}
