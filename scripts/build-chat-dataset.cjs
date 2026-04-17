#!/usr/bin/env node
/**
 * Rebuilds chat Q&A from:
 *  - <main> <details> accordions (FAQs, policies, rooms, accessibility)
 *  - mm-data.js (motel facts + every room type)
 *  - Key pages without accordions: directions, amenities, things-to-do (h2/h3 sections)
 *
 *   node scripts/build-chat-dataset.cjs
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const PREVIEW = path.join(ROOT, "preview");
const OUT = path.join(PREVIEW, "js", "mm-chat-dataset.auto.js");
const MM_DATA_PATH = path.join(PREVIEW, "js", "mm-data.js");

const ACCORDION_PAGES = [
  { file: "faqs.html", label: "FAQs" },
  { file: "hotel-policies.html", label: "Hotel policies" },
  { file: "accessibility.html", label: "Accessibility" },
  { file: "rooms.html", label: "Rooms" },
];

const SECTION_PAGES = [
  { file: "directions.html", label: "Directions", max: 50 },
  { file: "amenities.html", label: "Amenities", max: 30 },
  /** Venue cards only — skipping h2 avoids filter UI (“Dear & Near”) polluting the dataset. */
  { file: "things-to-do.html", label: "Things to do", max: 120, h3Only: true },
];

const STOP = new Set(
  "a an the and or but if in on at to for of is are was were be been it this that with from by not no we you your they there can will would could should may might about into than then also just only any all some so when what which who how where while do does did have has had".split(
    " "
  )
);

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Stays English in Google ES mode when shown by Marcos (innerHTML). */
function preserveBrandInReplyHtml(text) {
  return String(text || "").replace(
    /\bMotel Mediteran\b/g,
    '<span class="notranslate" translate="no">Motel Mediteran</span>'
  );
}

function extractMain(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : "";
}

function keywordsFromSummary(summary) {
  const words = decodeEntities(stripTags(summary))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  return [...new Set(words)].slice(0, 14);
}

function triggersFromSummary(summary) {
  const text = decodeEntities(stripTags(summary))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const out = [text];
  const words = text.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length > 10) {
    out.push(words.slice(0, 10).join(" "));
  }
  return [...new Set(out)].filter((t) => t.length >= 4);
}

const MAX_TRIGGERS_PER_ENTRY = 32;

/**
 * Extra how-guests-ask phrases per FAQ heading — all offline; ships inside mm-chat-dataset.auto.js.
 * Kept conservative: phrases attach only when the <summary>/heading matches the topic regex.
 */
function augmentTriggersFromTopic(summaryRaw, existing) {
  const text = decodeEntities(stripTags(summaryRaw))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const add = new Set((existing || []).filter((t) => t && String(t).length >= 4));
  const push = (phrases) => {
    for (const p of phrases) {
      const t = String(p || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      if (t.length >= 4 && t.length <= 88) add.add(t);
      if (add.size >= MAX_TRIGGERS_PER_ENTRY) return;
    }
  };
  const rules = [
    {
      re: /\bcheck[\s-]?in\b|\barrival\b|\bfront desk\b|\bphoto id\b|\bguest age\b|\bminimum age\b/,
      phrases: [
        "what time can we check in",
        "when is check in",
        "when do we get our room",
        "early check in",
        "arrive before check in time",
        "what do i need to check in",
        "checkin time",
      ],
    },
    {
      re: /\bcheck[\s-]?out\b|\bdeparture\b|\blate checkout\b|\bleave the room\b/,
      phrases: [
        "what time is checkout",
        "when do we have to leave",
        "late check out",
        "stay a bit longer",
        "extend checkout",
      ],
    },
    {
      re: /\bparking\b|\brv\b|\btruck\b|park\s+(the|my|our)\s+(car|truck|rv)\b|\bparking lot\b|\bvehicle\b/,
      phrases: [
        "where do i park",
        "is parking free",
        "free parking",
        "park overnight",
        "truck parking",
      ],
    },
    {
      re: /\bpet\b|\bdog\b|\bcat\b|\bservice animal\b|\banimal\b/,
      phrases: [
        "can i bring my dog",
        "are cats allowed",
        "pet friendly",
        "traveling with pets",
      ],
    },
    {
      re: /\bpool\b|\bswim\b|\bswimming\b|\bheated pool\b/,
      phrases: ["pool hours", "go swimming", "is the pool open", "swimming pool"],
    },
    {
      re: /\bwifi\b|\bwi\s*fi\b|\binternet\b|\bwireless\b|\bpassword\b.*\broom\b/,
      phrases: ["wifi password", "internet in the room", "wireless login", "free wifi"],
    },
    {
      re: /\bcancel\b|\brefund\b|\bnon[\s-]?refundable\b|\breservation\b.*\bchange\b|\bno show\b|\bcancellation\b/,
      phrases: [
        "can i cancel",
        "get my money back",
        "change booking",
        "cancellation policy",
      ],
    },
    {
      re: /\bsmok(e|ing)\b|\bnon[\s-]?smoking\b|\bcigarette\b|\bvape\b/,
      phrases: ["smoking allowed", "smoke in room", "vape pen"],
    },
    {
      re: /\bbreakfast\b|\bcoffee\b|\bdining\b.*\bmorning\b|\bcontinental\b/,
      phrases: ["free breakfast", "morning coffee", "food included"],
    },
    {
      re: /\blaundry\b|\bwasher\b|\bdryer\b|\bwashing clothes\b/,
      phrases: ["coin laundry", "wash clothes", "guest laundry"],
    },
    {
      re: /\belevator\b|\blift\b|\bstairs\b|\bground floor\b|\bsecond floor\b/,
      phrases: ["is there an elevator", "stairs only", "walk up"],
    },
    {
      re: /\baccessib(le|ility)\b|\bwheelchair\b|\bada\b|\broll[\s-]?in\b|\bmobility\b/,
      phrases: ["handicap room", "accessible bathroom", "walk in shower", "wheelchair access"],
    },
    {
      re: /\bsafari\b|\bzoo\b|\bzoo safari park\b|\bwild animal park\b|\battractions?\b.*\bnear\b/,
      phrases: [
        "how far safari park",
        "san diego zoo safari park",
        "things to do near hotel",
      ],
    },
    {
      re: /\bdirection(s)?\b|getting here|how to find|address|freeway|\bi[\s-]?15\b|\bescondido blvd\b|\bgps\b/,
      phrases: [
        "how do i get there",
        "driving directions",
        "where are you located",
        "find the motel",
      ],
    },
    {
      re: /\brate\b|\bprice\b|\bcost\b|\bhow much\b|\bnightly\b|\bfee\b/,
      phrases: ["room rates", "how expensive", "price per night"],
    },
    {
      re: /\bjacuzzi\b|\bhot tub\b|\bjetted\b|\bwhirlpool\b/,
      phrases: ["in room jacuzzi", "tub in the room", "suite with hot tub"],
    },
    {
      re: /\bkitchen\b|\bcook\b|\bstovetop\b|\brefrigerator\b|\bmicrowave\b.*\bsuite\b/,
      phrases: ["room with kitchen", "cook in room", "kitchenette"],
    },
  ];
  for (const { re, phrases } of rules) {
    if (!re.test(text)) continue;
    push(phrases);
  }
  return [...add].filter((t) => t.length >= 4);
}

function extractDetails(mainHtml) {
  const entries = [];
  const re = /<details\b[^>]*>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(mainHtml))) {
    const block = m[1];
    const sm = block.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    if (!sm) continue;
    const summaryRaw = sm[1];
    let bodyHtml = block.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i, "");
    const summary = decodeEntities(stripTags(summaryRaw));
    let reply = decodeEntities(stripTags(bodyHtml));
    if (summary.length < 4 || reply.length < 8) continue;
    if (reply.length > 2400) reply = reply.slice(0, 2397).trim() + "…";
    entries.push({
      triggers: augmentTriggersFromTopic(summaryRaw, triggersFromSummary(summaryRaw)),
      keywords: keywordsFromSummary(summaryRaw),
      reply,
      link: null,
      linkLabel: null,
    });
  }
  return entries;
}

/** h2/h3 blocks → Q&A when body has enough text (directions, amenities, venue cards, …). */
function extractSections(mainHtml, maxEntries, h3Only) {
  const entries = [];
  if (!mainHtml || maxEntries <= 0) return entries;
  let clean = mainHtml.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const re = h3Only
    ? /<h3\b([^>]*)>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h[23]\b|<\/main\b|$)/gi
    : /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>\s*([\s\S]*?)(?=<h[23]\b|<\/main\b|$)/gi;
  let m;
  while ((m = re.exec(clean))) {
    if (h3Only) {
      const openAttrs = m[1] || "";
      if (/visually-hidden/i.test(openAttrs)) continue;
      const summaryRaw = m[2];
      const bodyHtml = m[3];
      const summary = decodeEntities(stripTags(summaryRaw)).trim();
      let reply = decodeEntities(stripTags(bodyHtml)).replace(/\s+/g, " ").trim();
      if (summary.length < 3 || reply.length < 36) continue;
      if (/image placeholder/i.test(reply) && reply.length < 80) continue;
      reply = reply.replace(/\bImage placeholder\b/gi, "").replace(/\s+/g, " ").trim();
      if (reply.length < 36) continue;
      if (reply.length > 2400) reply = reply.slice(0, 2397).trim() + "…";
      entries.push({
        triggers: augmentTriggersFromTopic(summaryRaw, triggersFromSummary(summaryRaw)),
        keywords: keywordsFromSummary(summaryRaw),
        reply: `Q: ${summary}\n\n${reply}`,
        link: null,
        linkLabel: null,
      });
    } else {
      const openAttrs = m[2] || "";
      if (/visually-hidden/i.test(openAttrs)) continue;
      const summaryRaw = m[3];
      const bodyHtml = m[4];
      const summary = decodeEntities(stripTags(summaryRaw)).trim();
      let reply = decodeEntities(stripTags(bodyHtml)).replace(/\s+/g, " ").trim();
      if (summary.length < 3 || reply.length < 36) continue;
      if (/^property map$/i.test(summary)) continue;
      if (reply.length > 2400) reply = reply.slice(0, 2397).trim() + "…";
      entries.push({
        triggers: augmentTriggersFromTopic(summaryRaw, triggersFromSummary(summaryRaw)),
        keywords: keywordsFromSummary(summaryRaw),
        reply: `Q: ${summary}\n\n${reply}`,
        link: null,
        linkLabel: null,
      });
    }
    if (entries.length >= maxEntries) break;
  }
  return entries;
}

function formatClockFromDecimal(n) {
  if (n == null || Number.isNaN(Number(n))) return "";
  const totalMin = Math.round(Number(n) * 60) % (24 * 60);
  let h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  if (min === 0) return `${h12}:00 ${ampm}`;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

function loadMmData() {
  const code = fs.readFileSync(MM_DATA_PATH, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInNewContext(code, sandbox);
  return sandbox.window.MM_DATA || {};
}

const ROOM_TRIGGER_EXTRA = {
  "suite-kitchen": [
    "deluxe king suite with kitchen",
    "king suite kitchen",
    "kitchen jacuzzi suite",
    "suite with kitchen and jacuzzi",
  ],
  "suite-jacuzzi": ["deluxe king no kitchen", "king suite patio", "jacuzzi suite romantic"],
  "suite-2room": ["two room suite", "2 room suite kitchen", "separate living room suite", "family suite two queens"],
  king: ["standard king", "king bed room", "basic king"],
  queen: ["standard queen", "queen bed room"],
  "queen-double": ["two queen beds", "double queen room", "2 queen beds"],
  ada: ["ada room", "wheelchair accessible hotel", "roll in shower room", "accessible king"],
};

function entriesFromMmData(data) {
  const out = [];
  const motel = data.motel || {};
  const rooms = data.rooms || {};
  const name = motel.name || "Motel Mediteran";
  const addr = motel.address || "";
  const phone = motel.phone || "";
  const bookingUrl = motel.bookingUrl || "";
  const cin = motel.checkIn || "";
  const cout = motel.checkOut || "";
  const pOpen = formatClockFromDecimal(motel.poolHours && motel.poolHours.open);
  const pClose = formatClockFromDecimal(motel.poolHours && motel.poolHours.close);

  const motelsReply = [
    `${name} — ${addr}. Phone ${phone}.`,
    `Check-in from ${cin}, check-out by ${cout}.`,
    pOpen && pClose ? `Outdoor pool typically ${pOpen}–${pClose} daily (confirm at check-in).` : "",
    bookingUrl ? `Book online via the reservation link on our site.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  out.push({
    triggers: [
      "phone and address",
      "address and phone",
      "contact the motel",
      "property address",
      "how do i reach you",
      "what city are you in",
      `${String(name).toLowerCase()} phone`,
      "front desk phone number",
    ],
    keywords: ["phone", "address", "check", "pool", "escondido", "book"],
    reply: motelsReply,
    link: "index.html",
    linkLabel: "Home",
  });

  for (const [roomId, r] of Object.entries(rooms)) {
    const title = String(r.name || "").replace(/\n/g, " ").trim();
    if (!title) continue;
    const specs = Array.isArray(r.specs) ? r.specs.join(" · ") : "";
    const bullets = Array.isArray(r.bullets) ? r.bullets.slice(0, 12).map((b) => `• ${b}`).join("\n") : "";
    let reply = [title, specs && `(${specs})`, "", String(r.desc || "").trim(), bullets && "", bullets].filter((x) => x !== "").join("\n");
    if (reply.length > 2350) reply = reply.slice(0, 2347).trim() + "…";

    const extra = ROOM_TRIGGER_EXTRA[roomId] || [];
    const trigSet = new Set([...triggersFromSummary(title), ...extra.map((t) => t.toLowerCase())]);
    const trigs = [...trigSet].filter((t) => t.length >= 3);
    out.push({
      triggers: trigs.length ? trigs : triggersFromSummary(title),
      keywords: keywordsFromSummary(`${title} ${(r.specs || []).join(" ")}`),
      reply,
      link: `room-detail.html?room=${encodeURIComponent(roomId)}`,
      linkLabel: "Room details",
    });
  }

  return out;
}

function main() {
  const all = [];

  for (const { file, label } of ACCORDION_PAGES) {
    const fp = path.join(PREVIEW, file);
    if (!fs.existsSync(fp)) {
      console.warn("skip missing", file);
      continue;
    }
    const html = fs.readFileSync(fp, "utf8");
    const main = extractMain(html);
    if (!main) continue;
    const chunk = extractDetails(main);
    chunk.forEach((e) => {
      e.link = file;
      e.linkLabel = label;
      all.push(e);
    });
  }

  try {
    const data = loadMmData();
    const fromData = entriesFromMmData(data);
    fromData.forEach((e) => all.push(e));
    console.log("mm-data.js →", fromData.length, "entries");
  } catch (e) {
    console.warn("mm-data.js skipped:", e.message);
  }

  for (const { file, label, max, h3Only } of SECTION_PAGES) {
    const fp = path.join(PREVIEW, file);
    if (!fs.existsSync(fp)) {
      console.warn("skip missing", file);
      continue;
    }
    const html = fs.readFileSync(fp, "utf8");
    const main = extractMain(html);
    const chunk = extractSections(main, max, !!h3Only);
    chunk.forEach((e) => {
      e.link = file;
      e.linkLabel = label;
      all.push(e);
    });
    console.log(file, "sections →", chunk.length);
  }

  const sources = [
    ...ACCORDION_PAGES.map((p) => p.file),
    "mm-data.js",
    ...SECTION_PAGES.map((p) => p.file),
  ];
  const banner = `/* AUTO-GENERATED — do not edit by hand.
 * Source: ${sources.join(", ")}
 * Rebuild: node scripts/build-chat-dataset.cjs (runs on Netlify deploy)
 */
`;
  all.forEach((e) => {
    if (e && typeof e.reply === "string") e.reply = preserveBrandInReplyHtml(e.reply);
  });

  const body = `window.MM_CHAT_DATASET_AUTO = {\n  generatedAt: "${new Date().toISOString()}",\n  entryCount: ${all.length},\n  entries: ${JSON.stringify(all, null, 2)}\n};\n`;
  fs.writeFileSync(OUT, banner + body, "utf8");
  console.log("Wrote", all.length, "total Q&A entries →", path.relative(ROOT, OUT));
}

main();
