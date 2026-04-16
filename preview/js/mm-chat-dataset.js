/**
 * Personality + paraphrase layer for Marcos (optional but recommended).
 * Entries here get a score bonus over auto-built FAQ rows, so friendly wording and
 * alternate phrasings you add here surface first when they match.
 *
 * Bulk policy Q&A still comes from mm-chat-dataset.auto.js (rebuilt from your HTML
 * on deploy via `node scripts/build-chat-dataset.cjs`). Improve chat via this file,
 * mm-data chatSnippets, and mm-chat-nlu.js anytime; rebuild auto dataset when site policies change.
 *
 * How to add / fix knowledge (most authoritative first):
 *  1) This file — { triggers, keywords, reply, link? } OR use replies: ["...","..."] instead of
 *     reply for random rotation (Marcos picks one). Train from real chats: paste guest wording
 *     into triggers; add synonyms to keywords; never invent policies — point to policies/FAQs.
 *  2) preview/js/mm-data.js → chatSnippets — short facts keyed by whenContains phrases.
 *  3) Site HTML — FAQs, hotel-policies, rooms, accessibility, etc.; rebuild auto dataset:
 *     node scripts/build-chat-dataset.cjs
 *  4) preview/js/chatbot.js — INTENTS[].keywords / responses for scripted small-talk + routing.
 *  5) Live page fetch index — preview/js/chatbot-knowledge.js SOURCES (BM25 over page text).
 */
window.MM_CHAT_DATASET = {
  version: 7,
  entries: [
    {
      triggers: [
        "where are you located",
        "where is the motel",
        "what is your address",
        "whats your address",
        "full address",
        "how do i get there",
        "location of the hotel",
        "where in escondido",
      ],
      keywords: ["address", "located", "escondido", "boulevard", "blvd", "2336", "find you", "map"],
      reply:
        "We’re at 2336 S. Escondido Blvd, Escondido, CA 92025 — easy on/off from I‑15 in North County San Diego. If you’re driving, the Directions page has the full turn‑by‑turn and landmarks.",
      link: "directions.html",
      linkLabel: "Directions",
    },
    {
      triggers: [
        "near the freeway",
        "close to i 15",
        "i-15",
        "highway 15",
        "off the freeway",
      ],
      keywords: ["interstate", "freeway", "highway", "exit", "traffic"],
      reply:
        "Yep — we’re a short hop from I‑15, which makes Safari Park trips, inland runs, and getting to San Diego County pretty painless. Exact city address is on our Directions page.",
      link: "directions.html",
      linkLabel: "Directions",
    },
    {
      triggers: [
        "how far safari",
        "distance to safari",
        "zoo safari park",
        "wild animal park",
        "san diego zoo safari",
        "safari park miles",
        "how close is safari",
      ],
      keywords: ["safari", "zoo", "wildlife", "park", "minutes", "miles", "drive"],
      reply:
        "San Diego Zoo Safari Park is about a 10–15 minute drive — roughly 6 miles — so it’s a very doable day trip from the motel. Great combo with a comfy room to crash in after.",
      link: "things-to-do.html",
      linkLabel: "Things to do",
    },
    {
      triggers: [
        "best room for family",
        "traveling with kids",
        "room for 4 people",
        "sleeps four",
        "two queens family",
        "need a kitchen for kids",
      ],
      keywords: ["family", "children", "kids", "sleeps", "queen", "suite", "group"],
      reply:
        "For families I usually point people to the Double Queen (two queens, sleeps 4) or our 2‑Room Suite with Kitchen — separate living space, full kitchen, sleeps 4. The Deluxe King Suite with Kitchen is another sleeps‑4 option with a king + queen, fireplace, and in‑room jacuzzi. All have Wi‑Fi, fridge, and microwave.",
      link: "rooms.html",
      linkLabel: "Rooms",
    },
    {
      triggers: [
        "romantic room",
        "anniversary",
        "honeymoon motel",
        "private jacuzzi room",
        "hot tub in room",
        "spa tub room",
        "most romantic suite",
      ],
      keywords: ["jacuzzi", "romantic", "couple", "private", "fireplace", "patio"],
      reply:
        "For something special, look at our Deluxe King Suite — private in‑room jacuzzi, patio, upgraded finishes. The Deluxe King Suite with Kitchen adds a full kitchen, dining area, fireplace, and jacuzzi too. Both are built for slowing down after a day out.",
      link: "rooms.html",
      linkLabel: "Suites",
    },
    {
      triggers: [
        "long stay",
        "extended stay",
        "week stay",
        "month stay",
        "need to cook",
        "full kitchen",
        "stove and fridge",
        "meal prep",
      ],
      keywords: ["kitchen", "cook", "stovetop", "utensils", "longer", "week"],
      reply:
        "Longer visits are exactly what our kitchen suites are for — full‑size fridge, microwave, two stovetops, utensils, and space to spread out. Both the Deluxe King Suite with Kitchen and 2‑Room Suite with Kitchen are popular with guests staying a few nights or more.",
      link: "rooms.html",
      linkLabel: "Kitchen suites",
    },
    {
      triggers: [
        "accessible room",
        "ada room",
        "wheelchair",
        "roll in shower",
        "mobility accessible",
        "handicap room",
        "grab bars",
      ],
      keywords: ["accessible", "disability", "a11y", "shower", "vanity"],
      reply:
        "We have ADA accessible kings, queens, and double queens — grab bars, lowered fixtures, and roll‑in showers on select rooms. They’re subject to availability, so tell the front desk what you need when you book or call (760‑743‑2300) so we can match you to the right room.",
      link: "accessibility.html",
      linkLabel: "Accessibility",
    },
    {
      triggers: [
        "difference between suites",
        "which suite should i pick",
        "compare suites",
        "deluxe king vs",
        "two room suite vs",
      ],
      keywords: ["suite", "compare", "versus", "which", "better"],
      reply:
        "Quick take: Deluxe King Suite — king, private jacuzzi, patio, sleeps 2, great for couples. Deluxe King Suite with Kitchen — king + queen, fireplace, full kitchen, jacuzzi, sleeps 4. 2‑Room Suite with Kitchen — two queens, separate living room, full kitchen, sleeps 4, ideal for families. All are non‑smoking with Wi‑Fi.",
      link: "rooms.html",
      linkLabel: "Compare rooms",
    },
    {
      triggers: [
        "how do i book",
        "make a reservation",
        "reserve a room",
        "book online",
        "booking link",
        "availability",
      ],
      keywords: ["book", "reservation", "reserve", "rates", "nights"],
      reply:
        "Easiest path: use our Booking.com link from the site for live rates and availability for your dates. Prefer the phone? Front desk is 760‑743‑2300 (24/7) — they can walk you through room types and questions.",
      link: "index.html",
      linkLabel: "Home — book",
    },
    {
      triggers: [
        "call the hotel",
        "front desk number",
        "phone number",
        "can i call you",
        "talk to front desk",
      ],
      keywords: ["phone", "call", "number", "reach", "760"],
      reply:
        "Absolutely — 760‑743‑2300. That’s our 24/7 front desk; they’re the authority on today’s availability, special requests, and anything time‑sensitive.",
      link: null,
      linkLabel: null,
    },
    {
      triggers: [
        "check in time",
        "check out time",
        "what time arrival",
        "when can i arrive",
        "when do i have to leave",
        "late checkout possible",
        "early check in",
      ],
      keywords: ["check", "checkout", "checkin", "3 00", "11 00", "arrival"],
      reply:
        "Standard times: check‑in from 3:00 PM, check‑out by 11:00 AM. Early check‑in or late check‑out can’t be guaranteed — it depends on housekeeping and occupancy — so call ahead and the desk will do their best.",
      link: "faqs.html",
      linkLabel: "FAQs — check‑in",
    },
    {
      triggers: [
        "arriving late",
        "after midnight",
        "check in at night",
        "24 hour desk",
        "will someone be there",
      ],
      keywords: ["late", "night", "arrival", "front desk", "hours"],
      reply:
        "You’re covered — the front desk is 24/7, so late arrivals are normal here. Have your ID ready; if anything’s unusual about your ETA, a quick call to 760‑743‑2300 puts everyone at ease.",
      link: "faqs.html",
      linkLabel: "FAQs — front desk",
    },
    {
      triggers: [
        "is parking free",
        "where do i park",
        "car parking",
        "rv parking",
        "truck parking",
      ],
      keywords: ["parking", "vehicle", "lot", "complimentary"],
      reply:
        "Registered guests get complimentary on‑site parking. If you’re rolling something oversized (RV, long trailer), call 760‑743‑2300 so they can steer you right.",
      link: "faqs.html",
      linkLabel: "FAQs — parking",
    },
    {
      triggers: [
        "wifi free",
        "internet in room",
        "wireless included",
        "do you have internet",
      ],
      keywords: ["wifi", "wi fi", "internet", "network"],
      reply:
        "Every room and common area has free Wi‑Fi. We don’t broadcast the network name/password in chat for security — you’ll get guest network details at check‑in, or the desk will help on the phone.",
      link: "faqs.html",
      linkLabel: "FAQs — Wi‑Fi",
    },
    {
      triggers: [
        "hair dryer",
        "blow dryer",
        "iron in the room",
        "ironing board",
        "extra towels",
        "do you have towels",
        "soap and shampoo",
      ],
      keywords: ["towels", "dryer", "iron", "shampoo", "soap", "bathroom"],
      reply:
        "Rooms include linens and towel sets; hair dryers and irons are typically available (sometimes on request or listed by room type). Details can vary, so the Amenities page is a good overview — for your exact stay, 760‑743‑2300 can confirm in a moment.",
      link: "amenities.html",
      linkLabel: "Amenities",
    },
    {
      triggers: [
        "pet friendly",
        "bring my dog",
        "bring my cat",
        "travel with pet",
        "emotional support animal",
        "therapy dog",
        "esa letter",
        "service dog",
        "are dogs allowed",
        "can i bring a pet",
      ],
      keywords: ["pet", "dog", "cat", "animal", "esa", "puppy"],
      replies: [
        "We’re not set up as a pet property — pets aren’t allowed. Trained service animals for guests with disabilities are welcome; mention it when you book or call 760‑743‑2300. Official wording is on Hotel policies.",
        "Pet rules and service animal notes are on our Hotel policies page (wording matters). When in doubt, call 760‑743‑2300 so the desk can match you to the current policy.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "smoking allowed",
        "can i smoke",
        "vape",
        "cigarette",
      ],
      keywords: ["smoke", "smoking", "tobacco", "non smoking"],
      reply:
        "Motel Mediteran is smoke‑free end to end — that includes vaping in guest rooms. Thanks for respecting that; it keeps rooms fresh for the next guest too.",
      link: "faqs.html",
      linkLabel: "FAQs — non‑smoking",
    },
    {
      triggers: [
        "what is motel mediteran",
        "about this motel",
        "describe the property",
        "kind of hotel are you",
      ],
      keywords: ["motel", "property", "place", "stay", "escondido"],
      reply:
        "We’re Motel Mediteran — family‑run North County lodging near I‑15, not a huge resort chain. Think clean rooms, straightforward rates, a pool, suites with real kitchens and jacuzzis, and a straight shot to Safari Park and San Diego County adventures.",
      link: "index.html",
      linkLabel: "Home",
    },
    {
      triggers: [
        "neighborhood safe",
        "is the area safe",
        "quiet at night",
        "noise",
      ],
      keywords: ["safe", "quiet", "neighborhood", "area", "noise"],
      reply:
        "Escondido is a real city neighborhood — we’re on a busy boulevard near I‑15, so you get convenience, not a remote resort bubble. Guests usually tell us nights feel calm once you’re in the room; if you’re noise‑sensitive, ask the desk for a quieter placement when you check in.",
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "things to do nearby",
        "what to do in escondido",
        "attractions",
        "day trips",
      ],
      keywords: ["activities", "sightseeing", "attractions", "day trip", "what to do"],
      reply:
        "We’ve curated a Things to do page — Safari Park, hikes, culture, shopping, eats, and distances from the motel. Use the filter chips on that page to narrow what you care about.",
      link: "things-to-do.html",
      linkLabel: "Things to do",
    },
    {
      triggers: [
        "restaurants close",
        "food near motel",
        "where to eat near motel",
        "dining near the hotel",
        "places to eat nearby",
      ],
      keywords: ["dining", "restaurant", "food", "eat", "eats", "brunch", "lunch", "dinner", "cafe"],
      reply:
        "All of our food & drink picks — addresses, miles, blurbs — live on Things to do. Open it with the Eats & drinks filter pre-selected so you see exactly that list.",
      link: "things-to-do.html?td-filter=food-drink",
      linkLabel: "Things to do — Eats & drinks",
    },
    {
      triggers: [
        "visitors allowed",
        "visitor allowed",
        "can i have visitors",
        "can we have visitors",
        "guest visitors",
        "outside visitors",
        "friends visit my room",
        "visitor policy",
        "overnight visitors",
        "extra people room",
      ],
      keywords: ["visitors", "visitor"],
      reply:
        "The website only notes that visitor rules are handled at the front desk — we don’t publish a full visitor policy in chat. Please call 760‑743‑2300 (24/7) or ask at check‑in so you get the exact, current answer for your stay.",
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "amenities list",
        "what comes in every room",
        "microwave fridge tv",
        "in all rooms",
      ],
      keywords: ["amenities", "microwave", "refrigerator", "fridge", "tv"],
      reply:
        "Standards across rooms: free Wi‑Fi, free parking, flat‑screen TV, microwave, refrigerator, non‑smoking. Everyone can use the pool too. Suites layer on kitchens, jacuzzis, fireplaces, and extra space — see Amenities and Rooms.",
      link: "amenities.html",
      linkLabel: "Amenities",
    },
    {
      triggers: [
        "policies page",
        "house rules",
        "cancellation policy",
        "deposit policy",
      ],
      keywords: ["policy", "policies", "rules", "cancel", "deposit"],
      reply:
        "All the formal stuff — payments, cancellations, deposits, incidentals — lives on Hotel policies alongside FAQ detail. That’s the page to read before you commit to dates.",
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "faq page",
        "frequently asked",
        "read all questions",
      ],
      keywords: ["faq", "faqs", "questions", "answers"],
      reply:
        "Our FAQs page is the kitchen‑sink list: check‑in/out, age ID, pool, parking, Wi‑fi, Safari distance, downtown Escondido, and more. If I summarize something wrong, the FAQ text wins 😊",
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "thanks marcos",
        "thank you marcos",
        "you've been helpful",
        "appreciate the help",
      ],
      keywords: ["thanks", "thank", "helpful", "appreciate"],
      reply:
        "Glad it helped! If anything else pops up — rooms, policies, directions — I’m here. For booking tweaks or same‑day fires, 760‑743‑2300 is still your best friend.",
      link: null,
      linkLabel: null,
    },
    {
      triggers: [
        "are you a real person",
        "am i talking to a robot",
        "are you ai",
        "chatbot",
      ],
      keywords: ["real", "human", "bot", "assistant"],
      reply:
        "I’m Marcos, the site’s chat guide — quick answers from what’s published on motelmediteran.com, not a person at the desk. For anything official or urgent, the 24/7 front desk (760‑743‑2300) always has the final word.",
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "first time guest",
        "never stayed before",
        "what should i know",
        "tips for staying",
      ],
      keywords: ["first", "new", "expect", "tips"],
      reply:
        "Welcome! Know the basics: 3:00 PM check‑in, 11:00 AM check‑out, free parking & Wi‑Fi, 24/7 desk, pool on site, and you’re about 10–15 min from Safari Park. Skim FAQs + Hotel policies the night before so day‑of is relaxed.",
      link: "faqs.html",
      linkLabel: "FAQs — start here",
    },
    {
      triggers: [
        "king vs queen room",
        "standard king",
        "standard queen",
        "double queen meaning",
      ],
      keywords: ["king", "queen", "standard", "bed"],
      reply:
        "Standard King — one king, sleeps 2. Standard Queen — one queen, sleeps 2, cozy for solo or couples. Double Queen — two queens, sleeps 4. All include TV, microwave, fridge, Wi‑Fi. Photos and specs are on Rooms.",
      link: "rooms.html",
      linkLabel: "Rooms",
    },
    {
      triggers: [
        "san diego downtown",
        "how far san diego",
        "day trip san diego",
        "gaslamp",
        "beach from here",
      ],
      keywords: ["diego", "downtown", "beach", "gaslamp", "coast"],
      reply:
        "We’re inland in Escondido — great for Safari Park and North County. Downtown San Diego and the coast are a longer haul (traffic‑dependent). Plug your target into maps from 2336 S. Escondido Blvd for realistic drive times the day you travel.",
      link: "things-to-do.html",
      linkLabel: "Things to do",
    },
    {
      triggers: [
        "photo id",
        "government id",
        "what id do i need",
        "age requirement",
        "how old to check in",
        "minor check in",
        "valid id",
      ],
      keywords: ["identification", "license", "passport", "driver", "18", "21"],
      replies: [
        "Please bring a valid government‑issued photo ID for check‑in. Exact age rules and ID wording on your confirmation channel matter — the FAQs spell out the basics, and 760‑743‑2300 can confirm for your specific booking.",
        "Front desk will verify ID at check‑in; bring a current photo ID for every adult on the reservation. For edge cases (minors, third‑party pay), call 760‑743‑2300 so nothing surprises you at arrival.",
      ],
      link: "faqs.html",
      linkLabel: "FAQs — check‑in",
    },
    {
      triggers: [
        "change my reservation",
        "modify booking",
        "change dates",
        "add a night",
        "remove a night",
      ],
      keywords: ["change", "modify", "dates", "extend", "shorten", "reservation"],
      replies: [
        "Date changes and room changes depend on how you booked and what’s available — I don’t want to guess. Use your booking link or call 760‑743‑2300 (24/7) with your confirmation handy.",
        "For swaps to dates or room types, the fastest path is whoever holds your reservation (booking site vs. phone). Our desk at 760‑743‑2300 can walk you through the Motel Mediteran side.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "cancel booking",
        "cancellation fee",
        "can i cancel",
        "refund policy",
        "will i get money back",
        "non refundable",
      ],
      keywords: ["cancel", "refund", "cancellation", "policy", "fee"],
      replies: [
        "Cancellations should be made at least 48 hours before 3:00 PM on the arrival date to avoid charges. Late changes may incur one night room and tax.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "extra person fee",
        "additional guest charge",
        "more than two people",
        "third person",
        "guest fee",
      ],
      keywords: ["extra", "additional", "person", "guest", "occupancy", "fee"],
      replies: [
        "Rates are usually built around listed room occupancy — adding adults or older children can change price or room type. Call 760‑743‑2300 before you arrive so the desk matches you to the right room and rate.",
        "If your headcount isn’t what you booked, loop in the front desk sooner than later: 760‑743‑2300. They’ll align occupancy with hotel policy and availability.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "rollaway bed",
        "extra bed",
        "cot for baby",
        "pack n play",
        "crib available",
      ],
      keywords: ["rollaway", "cot", "crib", "pack", "play", "bed"],
      replies: [
        "Rollaways, cribs, and pack‑and‑plays are the kind of request our team handles case‑by‑case — availability isn’t the same every night. Call 760‑743‑2300 and note it on the reservation if you can.",
        "Need an extra sleeping setup? Mention ages and room type when you ring 760‑743‑2300; they’ll tell you what we can place in the room before arrival.",
      ],
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "connecting rooms",
        "adjoining rooms",
        "two rooms next to each other",
        "family side by side",
      ],
      keywords: ["connecting", "adjoining", "adjacent", "next door"],
      replies: [
        "Connecting layouts are limited and not every category has them — call 760‑743‑2300 early with dates and party size so we can look for neighboring rooms or the right suite.",
        "Best bet for families wanting to be close: ask the desk for adjacent rooms or pick a two‑room suite style that already gives you separation. 760‑743‑2300 can map options to what’s open.",
      ],
      link: "rooms.html",
      linkLabel: "Rooms",
    },
    {
      triggers: [
        "room upgrade",
        "better room",
        "can i upgrade",
        "suite upgrade",
      ],
      keywords: ["upgrade", "nicer", "better", "suite"],
      replies: [
        "Upgrades at check‑in depend on what’s clean and unsold that day — it never hurts to ask nicely at the desk (760‑743‑2300 ahead of arrival if you want something specific like a jacuzzi suite).",
        "If you’re hoping to move up a category, mention it when you arrive or call 760‑743‑2300 before. They’ll quote you only if something is actually available.",
      ],
      link: "rooms.html",
      linkLabel: "Rooms",
    },
    {
      triggers: [
        "lost and found",
        "left something",
        "forgot in the room",
        "left my charger",
        "lost item",
      ],
      keywords: ["lost", "found", "forgot", "left", "belongings"],
      replies: [
        "For anything left behind or missing, contact the front desk directly — they log found items and can tell you what to do next. 760‑743‑2300 any time.",
        "Lost & found is handled property‑side, not through chat. Call 760‑743‑2300 with your stay dates and room so they can search what turned up after housekeeping.",
      ],
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "housekeeping come in",
        "daily cleaning",
        "do you clean every day",
        "fresh towels housekeeping",
        "do not disturb",
        "dnd sign",
      ],
      keywords: ["housekeeping", "cleaning", "maid", "towels", "linens", "disturb"],
      replies: [
        "Housekeeping routines and towel refresh policies can vary — check FAQs + policies for the latest wording, or ask at check‑in. The desk can note a do‑not‑disturb preference when you arrive: 760‑743‑2300.",
        "If you need limited service or extra amenities in the room, the front desk (760‑743‑2300) routes those requests to housekeeping correctly.",
      ],
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "quiet room",
        "away from freeway",
        "high floor",
        "ground floor",
        "corner room",
      ],
      keywords: ["quiet", "noise", "floor", "view", "location"],
      replies: [
        "We’re on a boulevard near I‑15, so let the desk know if you’re noise‑sensitive — they’ll do their best to place you away from traffic or ice when inventory allows. Mention it early: 760‑743‑2300.",
        "Specific room placements aren’t guaranteed from the website, but calling 760‑743‑2300 with your preference (quiet, ground level, etc.) helps us match you before arrival.",
      ],
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "store luggage",
        "luggage storage",
        "hold my bags",
        "before check in bags",
        "after checkout bags",
        "drop off my bags",
        "drop our bags",
        "leave our suitcases",
        "leave bags at hotel",
        "bags before room ready",
        "early arrival bags",
        "stash my luggage",
        "can you keep our bags",
        "bellhop bags",
        "coat check",
      ],
      keywords: ["luggage", "bags", "storage", "bell", "hold", "suitcase", "suitcases", "backpack"],
      replies: [
        "Whether we can hold bags early/late depends on day‑of business at the desk — ask 760‑743‑2300 around your arrival; they’ll give you the honest answer.",
        "Bag storage isn’t something I can promise from chat. Call ahead: 760‑743‑2300, especially if you’re squeezing in Safari Park before you get your keys.",
        "If you’ll arrive before the room is ready or need bags held a little after checkout, the 24/7 desk (760‑743‑2300) is who actually knows what’s possible that day — mention how many pieces you have.",
      ],
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "airport shuttle",
        "pick up from airport",
        "shuttle from san diego airport",
        "ride from san",
      ],
      keywords: ["shuttle", "airport", "transport", "pickup", "ride"],
      replies: [
        "We don’t publish a dedicated airport shuttle in our web copy — guests typically use rideshare or rent a car from SAN. For timing and parking here, Directions + 760‑743‑2300 can help you plan.",
        "North County is easiest with your own wheels or Uber/Lyft from San Diego International (SAN). Double‑check drive time the day you land; traffic swings a lot.",
      ],
      link: "directions.html",
      linkLabel: "Directions",
    },
    {
      triggers: [
        "closest airport",
        "what airport",
        "fly into where",
        "san airport distance",
      ],
      keywords: ["airport", "san", "fly", "flight"],
      replies: [
        "Most guests fly into San Diego International (SAN). Drive time to Escondido is traffic‑dependent — plug it into maps from 2336 S. Escondido Blvd the day you travel.",
        "SAN is the usual gateway. If you’re comparing smaller fields, ask the desk (760‑743‑2300) after you know your exact arrival city — we’re not a flight agent, but we’ll be honest about drives.",
      ],
      link: "directions.html",
      linkLabel: "Directions",
    },
    {
      triggers: [
        "mail package",
        "ship to hotel",
        "amazon delivery",
        "receive a package",
      ],
      keywords: ["package", "mail", "delivery", "ship", "ups"],
      replies: [
        "Package acceptance rules vary and fraud is real — call 760‑743‑2300 before you ship anything so the desk can confirm how to address it and whether they can hold it.",
        "Don’t send valuables without speaking to the hotel first. 760‑743‑2300 will tell you what’s workable for your stay dates.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "ice machine",
        "vending machine",
        "snacks at motel",
        "soda machine",
      ],
      keywords: ["ice", "vending", "snacks", "soda", "machine"],
      replies: [
        "On‑site vending/ice details aren’t something I’ll invent — ask at check‑in or call 760‑743‑2300; they’ll point you to what we actually have on property.",
        "If you need ice late at night, the 24/7 desk (760‑743‑2300) is the right place to ask where to go in our layout.",
      ],
      link: "amenities.html",
      linkLabel: "Amenities",
    },
    {
      triggers: [
        "guest laundry",
        "coin laundry",
        "washer dryer guest",
        "wash clothes",
      ],
      keywords: ["laundry", "wash", "dryer", "clothes"],
      replies: [
        "Guest laundry availability is spelled out on the Amenities page; if you don’t see it, call 760‑743‑2300 — they’ll confirm what’s on site vs. nearby.",
        "Long‑stay guests with kitchen suites sometimes plan laundry runs — Amenities + a quick call to 760‑743‑2300 saves you a wasted trip.",
      ],
      link: "amenities.html",
      linkLabel: "Amenities",
    },
    {
      triggers: [
        "gym fitness",
        "workout room",
        "exercise room",
        "weights",
      ],
      keywords: ["gym", "fitness", "workout", "exercise"],
      replies: [
        "We highlight our pool and room types on the site — dedicated fitness centers aren’t our core pitch. For anything beyond a swim, ask 760‑743‑2300 or skim Amenities so we don’t overpromise.",
        "Serious gym folks usually plan a run/hike (Dixon Lake, Daley Ranch are close) or a day pass elsewhere — I’m not the source for a mystery weight room. Desk: 760‑743‑2300.",
      ],
      link: "amenities.html",
      linkLabel: "Amenities",
    },
    {
      triggers: [
        "group booking",
        "block of rooms",
        "wedding rooms",
        "family reunion hotel",
      ],
      keywords: ["group", "block", "wedding", "reunion", "team"],
      replies: [
        "Multi‑room blocks and events go through the front desk so rates line up — start at 760‑743‑2300 with dates, head count, and whether you need kitchen suites.",
        "Don’t try to stitch a big family trip together one reservation at a time without calling — 760‑743‑2300 can keep rooms near each other when inventory allows.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "aaa discount",
        "aarp discount",
        "military discount",
        "senior discount",
        "coupon code",
      ],
      keywords: ["discount", "aaa", "aarp", "military", "promo", "coupon"],
      replies: [
        "Public channel rates you see online already bake in what OTAs allow — loyalty/club discounts don’t always stack. For special cases, 760‑743‑2300 is the only place that can confirm.",
        "If someone promised you a rate in email or by phone, make sure it matches your confirmation screen. Otherwise 760‑743‑2300 is the fairness check.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "walk in",
        "without reservation",
        "show up tonight",
        "do you have vacancy",
      ],
      keywords: ["walk", "without", "tonight", "available", "vacancy"],
      replies: [
        "Walk‑ins depend on live inventory — call 760‑743‑2300 while you’re still on the road so nobody races here for a sold‑out night.",
        "Same‑day availability changes fast. Booking.com link for live dates + 760‑743‑2300 for human backup is the combo we recommend.",
      ],
      link: "index.html",
      linkLabel: "Home — book",
    },
    {
      triggers: [
        "pay cash",
        "cash only",
        "do you accept cash",
        "debit card ok",
      ],
      keywords: ["cash", "debit", "pay", "card", "billing"],
      replies: [
        "Payment types and incidental holds are spelled out in Hotel policies — chat can’t be your cashier. 760‑743‑2300 will tell you what methods work for *your* reservation.",
        "Don’t travel assuming cash‑only without calling — 760‑743‑2300 can prevent a miserable check‑in.",
      ],
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
    {
      triggers: [
        "wake up call",
        "alarm clock room",
        "can you call me morning",
      ],
      keywords: ["wake", "alarm", "call", "morning"],
      replies: [
        "Old‑school wake calls are a front‑desk question — ask at 760‑743‑2300 or when you check in. Phone alarms are still Plan A for most travelers.",
        "If you need a human backup alarm, mention it politely at the desk (760‑743‑2300); don’t rely on chat bots for punctuality 😊",
      ],
      link: "faqs.html",
      linkLabel: "FAQs",
    },
    {
      triggers: [
        "elevator or stairs",
        "is there an elevator",
        "no stairs",
        "mobility stairs",
      ],
      keywords: ["elevator", "lift", "stairs", "floors"],
      replies: [
        "Accessibility and floor layout matters for a lot of guests — Accessibility + FAQs cover what we publish, and 760‑743‑2300 can match you to a room that fits your mobility needs.",
        "If stairs are a dealbreaker, say so before arrival: 760‑743‑2300.",
      ],
      link: "accessibility.html",
      linkLabel: "Accessibility",
    },
    {
      triggers: [
        "safe in the room",
        "laptop safe",
        "lock up valuables",
      ],
      keywords: ["safe", "lock", "valuables", "security"],
      replies: [
        "If your room type lists an in‑room safe, it’ll be on the Rooms/Amenities detail you booked — otherwise assume you need the front desk’s guidance. Call 760‑743‑2300 if you’re unsure.",
        "Never leave prizes in plain sight; when in doubt ask 760‑743‑2300 what the property recommends for your specific suite.",
      ],
      link: "amenities.html",
      linkLabel: "Amenities",
    },
    {
      triggers: [
        "pay when",
        "credit card hold",
        "incidental hold",
        "how do you charge",
      ],
      keywords: ["pay", "payment", "card", "charge", "hold", "deposit"],
      reply:
        "Exact payment and card‑hold wording is on Hotel policies (rates vary by channel and stay length). The front desk can explain what to expect for your reservation — 760‑743‑2300.",
      link: "hotel-policies.html",
      linkLabel: "Hotel policies",
    },
  ],
};
