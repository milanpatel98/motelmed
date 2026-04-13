/**
 * Motel Mediteran — lightweight NLU (no API, no ML weights).
 *
 * Classifies guest text into coarse hotel “topics” using phrases, tokens, and
 * soft conflicts. Outputs:
 *   - retrievalBoost → fused into page + dataset search (BM25 / triggers)
 *   - mapIntentId     → optional tie-break to a scripted chatbot intent
 *   - suggestEscalate → billing/medical/safety: prefer front desk over guessing
 *
 * Tune by editing INTENTS below (add phrases from real chats). Rebuild nothing.
 * Disable: window.MM_CHAT_DISABLE_NLU = true;
 */
(function (global) {
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasWord(blob, w) {
    if (!w || w.length < 2) return false;
    try {
      return new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(blob);
    } catch (_) {
      return blob.includes(w);
    }
  }

  /**
   * @typedef {Object} NluIntentDef
   
   * @property {string} id
   * @property {string[]} [phrases]
   * @property {string[]} [tokens]
   * @property {string[]} [mustHaveAny]
   * @property {RegExp[]} [blockIf]
   * @property {string} [retrievalBoost]
   * @property {string} [mapIntentId]
   * @property {boolean} [suggestEscalate]
   * @property {number} [weight]
   */
  const INTENTS = [
    {
      id: "pets_animals",
      mapIntentId: "pets",
      retrievalBoost: "pet policy pets dogs cats service animals emotional support esa",
      phrases: [
        "emotional support",
        "esa letter",
        "therapy animal",
        "therapy dog",
        "bring my dog",
        "bring our dog",
        "travel with pet",
        "travel with dog",
        "cat allowed",
        "are dogs allowed",
        "can i bring a pet",
        "pet friendly",
        "pet policy",
        "dog allowed",
        "puppy",
        "pooch",
        "furry friend",
        "leash"
      ],
      tokens: ["pets", "pet", "dog", "dogs", "cat", "cats", "puppy", "puppies", "animal"],
      blockIf: [/safari\b/, /\bzoo\b/, /wild\s*life/, /park\s*pass/]
    },
    {
      id: "cancellation_refund",
      mapIntentId: "cancellation",
      retrievalBoost: "cancellation cancel refund deposit policy third party booking ota",
      phrases: [
        "cancel my",
        "how do i cancel",
        "how to cancel",
        "cancel the reservation",
        "cancel a reservation",
        "cancellation policy",
        "free cancellation",
        "get a refund",
        "refund policy",
        "non refundable",
        "nonrefundable",
        "change my dates",
        "modify reservation",
        "change reservation",
        "no show",
        "noshow"
      ],
      tokens: ["cancel", "cancellation", "refundable", "refund", "rebook"]
    },
    {
      id: "booking_mistake_help",
      mapIntentId: "booking_mistake",
      weight: 1.42,
      retrievalBoost:
        "cancellation modify reservation change dates booking mistake error wrong booking confirmation ota third party",
      phrases: [
        "made a mistake",
        "made mistake",
        "made an error",
        "made error",
        "my mistake",
        "booking mistake",
        "reservation mistake",
        "wrong booking",
        "wrong reservation",
        "accidentally booked",
        "booking error",
        "error while booking",
        "mistake while booking",
        "problem with my booking",
        "problem with booking",
        "fix my booking",
        "messed up booking",
        "i booked the wrong",
        "wrong dates",
        "need to change my booking"
      ],
      tokens: ["mistake", "messed"],
      mustHaveAny: [
        "book",
        "booking",
        "reservation",
        "reserve",
        "mistake",
        "error",
        "wrong",
        "fix",
        "cancel",
        "change",
        "problem",
        "accident"
      ]
    },
    {
      id: "deposits_payment_hold",
      retrievalBoost: "deposit card authorization incidental hold payment policy checkout",
      phrases: [
        "damage deposit",
        "security deposit",
        "hold on card",
        "authorization hold",
        "incidental hold",
        "when charged",
        "when will i be charged",
        "prepaid",
        "pay at hotel",
        "pay at property"
      ],
      tokens: ["deposit", "authorised", "authorized", "authorization", "incidentals"]
    },
    {
      id: "checkin_checkout_time",
      mapIntentId: "checkin",
      retrievalBoost: "check in check out time arrival departure early late front desk id age policy",
      phrases: [
        "check in time",
        "check-in time",
        "what time can i arrive",
        "what time i can check in",
        "until what time can i check",
        "until what time i can check in",
        "how late can i check in",
        "latest check in",
        "arrival time",
        "late arrival",
        "early check",
        "early arrival",
        "check out time",
        "checkout time",
        "late checkout",
        "late check out",
        "extend stay",
        "what time leave"
      ],
      tokens: ["checkin", "checkout", "arrival", "departure"]
    },
    {
      id: "rooms_inventory",
      mapIntentId: "rooms_overview",
      retrievalBoost: "room types king queen suite kitchen jacuzzi sleeps rates booking",
      phrases: [
        "what rooms",
        "room types",
        "types of rooms",
        "do you have suites",
        "smallest room",
        "largest room",
        "cheapest room",
        "quieter room",
        "adjoining room",
        "connecting room"
      ],
      tokens: ["suite", "suites", "standard", "deluxe"]
    },
    {
      id: "pricing_rates",
      mapIntentId: "price",
      retrievalBoost: "rates pricing nightly fee taxes resort booking availability",
      phrases: [
        "how much per night",
        "nightly rate",
        "best rate",
        "lowest price",
        "weekend rate",
        "extra person fee",
        "additional guest fee",
        "resort fee",
        "amenities fee",
        "tax included"
      ],
      tokens: ["price", "pricing", "rates", "expensive", "cheap"]
    },
    {
      id: "booking_reservations",
      mapIntentId: "booking",
      retrievalBoost: "booking reservation availability book online ota third party",
      phrases: [
        "how to book",
        "make a reservation",
        "book a room",
        "booking com",
        "booking.com",
        "third party",
        "walk in",
        "day use",
        "hourly room"
      ],
      tokens: ["reserve", "reservation", "booking", "booked", "vacancy"],
      blockIf: [
        /\bmistake\b/,
        /\bmessed\b/,
        /\berror\b/,
        /\baccident/,
        /\bwrong\s+(booking|reservation|dates|room)\b/,
        /\bproblem\s+with\s+(my\s+)?(booking|reservation)\b/,
        /\bfix\s+my\s+(booking|reservation)\b/
      ]
    },
    {
      id: "parking_transport",
      mapIntentId: "parking",
      retrievalBoost: "parking complimentary vehicle lot rv truck directions",
      phrases: [
        "where to park",
        "self parking",
        "valet",
        "trailer parking",
        "rv parking",
        "oversized vehicle"
      ],
      tokens: ["parking", "parked"]
    },
    {
      id: "wifi_tech",
      mapIntentId: "wifi",
      retrievalBoost: "wifi wireless internet password streaming roku",
      phrases: [
        "wifi password",
        "wi fi",
        "internet slow",
        "streaming",
        "smart tv",
        "netflix",
        "work from room"
      ],
      tokens: ["wifi", "internet", "bandwidth"]
    },
    {
      id: "pool_aquatics",
      mapIntentId: "pool",
      retrievalBoost: "pool swimming hours heated outdoor towels lifeguard",
      phrases: [
        "pool hours",
        "swimming pool",
        "is pool open",
        "pool closes",
        "towels at pool",
        "kids pool",
        "lap swim"
      ],
      tokens: ["swim", "swimming", "pool"]
    },
    {
      id: "pool_heated_followup",
      mapIntentId: "pool_heated",
      retrievalBoost: "pool heated warm heater temperature",
      phrases: ["heated pool", "is the pool heated", "warm pool", "pool temperature"],
      mustHaveAny: ["heated", "warm", "heat", "temperature"]
    },
    {
      id: "amenities_misc",
      retrievalBoost: "amenities microwave fridge iron hair dryer coffee towels soap shampoo",
      phrases: [
        "hair dryer",
        "blow dryer",
        "iron board",
        "coffee maker",
        "ice machine",
        "vending",
        "microwave",
        "mini fridge",
        "complimentary toiletries"
      ],
      tokens: ["amenities", "toothpaste"]
    },
    {
      id: "breakfast_food",
      mapIntentId: "breakfast",
      retrievalBoost: "breakfast morning coffee dining continental grab go",
      phrases: [
        "free breakfast",
        "continental breakfast",
        "morning meal",
        "coffee in lobby",
        "complimentary breakfast"
      ],
      tokens: ["breakfast", "brunch"]
    },
    {
      id: "smoking_vaping",
      mapIntentId: "smoking",
      retrievalBoost: "non smoking smoke free vaping cigarette marijuana",
      phrases: [
        "smoking room",
        "smoking allowed",
        "vape",
        "vaping",
        "marijuana",
        "cigarette",
        "cigar",
        "420"
      ],
      tokens: ["smoking", "smoke", "tobacco"]
    },
    {
      id: "accessibility_ada",
      mapIntentId: "accessibility",
      retrievalBoost: "accessibility ada wheelchair grab bars roll in shower elevator stairs",
      phrases: [
        "wheelchair accessible",
        "ada room",
        "roll in shower",
        "grab bars",
        "hearing impaired",
        "mobility scooter",
        "elevator"
      ],
      tokens: ["accessible", "disability", "handicap", "ada", "a11y"]
    },
    {
      id: "housekeeping",
      retrievalBoost: "housekeeping cleaning turndown towels sheets trash fresh linens",
      phrases: [
        "daily housekeeping",
        "room cleaned",
        "extra towels",
        "change sheets",
        "turndown",
        "trash pickup",
        "do not disturb"
      ],
      tokens: ["housekeeping", "maid", "cleaning", "dnd", "disturb"]
    },
    {
      id: "quiet_noise",
      retrievalBoost: "quiet room noise complaint party floor highway",
      phrases: ["quiet room", "away from highway", "top floor", "noise complaint", "loud neighbors"]
    },
    {
      id: "luggage_storage",
      retrievalBoost:
        "luggage storage bell closet hold bags suitcases after checkout before checkin early arrival drop off",
      phrases: [
        "store my bags",
        "hold luggage",
        "hold my suitcase",
        "before check in",
        "after check out",
        "before my room",
        "room not ready bags",
        "bell desk",
        "coat check",
        "drop off bags",
        "leave bags",
        "stash bags"
      ],
      tokens: ["luggage", "bags", "suitcases", "suitcase", "backpack", "backpacks"]
    },
    {
      id: "lost_found",
      retrievalBoost: "lost found left behind property security front desk",
      phrases: [
        "left something",
        "lost item",
        "forgot phone",
        "forgot charger",
        "lost in room",
        "did anyone find"
      ],
      tokens: ["lost", "forgot", "missing"]
    },
    {
      id: "packages_mail",
      retrievalBoost: "packages mail delivery ups fedex amazon front desk hold",
      phrases: ["ship a package", "mail hold", "deliver to hotel", "amazon delivery", "ups package"]
    },
    {
      id: "shuttle_airport",
      retrievalBoost: "airport shuttle closest airport pickup dropoff san diego uber",
      phrases: [
        "airport shuttle",
        "pick up from airport",
        "closest airport",
        "which airport",
        "fly into",
        "rental car return"
      ],
      tokens: ["airport", "shuttle", "uber", "lyft", "taxi"]
    },
    {
      id: "directions_location",
      mapIntentId: "location",
      retrievalBoost: "directions address escondido boulevard i 15 gps freeway",
      phrases: [
        "how to get there",
        "driving directions",
        "full address",
        "where located",
        "near highway",
        "off ramp",
        "where are you",
        "what is your address"
      ]
    },
    {
      id: "things_area",
      mapIntentId: "things_to_do",
      retrievalBoost: "things to do escondido dining attractions safari nearby",
      phrases: ["things to do", "what to visit", "attractions near", "kid friendly nearby", "date night"]
    },
    {
      id: "ev_charging",
      mapIntentId: "ev_charging",
      retrievalBoost: "ev charging electric vehicle tesla station plug",
      phrases: ["ev charging", "electric car", "tesla", "charge my car", "j1772"]
    },
    {
      id: "laundry_guest",
      retrievalBoost: "laundry washing machine dryer guest coin operated detergent",
      phrases: ["guest laundry", "coin laundry", "washer dryer", "dry cleaning"]
    },
    {
      id: "fitness_gym",
      retrievalBoost: "gym fitness exercise room workout weights treadmill",
      phrases: ["fitness center", "workout room", "hotel gym", "exercise equipment"]
    },
    {
      id: "group_wedding_block",
      retrievalBoost: "group rate wedding block corporate team rooms meeting",
      phrases: ["block of rooms", "group booking", "wedding party", "corporate rate", "discount code"]
    },
    {
      id: "discounts",
      mapIntentId: "special_offer",
      retrievalBoost: "discount aaa aarp military senior promo coupon code",
      phrases: ["aaa discount", "aarp", "military discount", "government rate", "senior discount", "promo code"]
    },
    {
      id: "complaint_service",
      mapIntentId: "complaint",
      retrievalBoost: "complaint service recovery unhappy experience manager",
      phrases: [
        "speak to manager",
        "not happy",
        "ruined my stay",
        "bad experience",
        "disappointed",
        "refund demand",
        "lawyer",
        "bbb",
        "review blackmail"
      ],
      suggestEscalate: true
    },
    {
      id: "billing_dispute",
      retrievalBoost: "billing charged twice statement invoice credit card dispute",
      phrases: [
        "charged twice",
        "wrong charge",
        "billing issue",
        "open a dispute",
        "fraud on card",
        "unauthorized charge"
      ],
      suggestEscalate: true
    },
    {
      id: "medical_emergency",
      phrases: ["chest pain", "cant breathe", "unconscious", "bleeding badly", "911", "ambulance", "overdose"],
      suggestEscalate: true,
      retrievalBoost: "emergency medical call 911",
      weight: 1.5
    },
    {
      id: "safety_security",
      phrases: ["feeling unsafe", "someone in my room", "theft", "stolen from car", "harassment", "police"],
      suggestEscalate: true,
      retrievalBoost: "security front desk safety police",
      weight: 1.4
    },
    {
      id: "minibar_minifridge",
      retrievalBoost: "minibar mini bar snacks fridge honor tray charges",
      phrases: ["mini bar", "minibar", "honor bar", "snack tray", "free snacks"]
    },
    {
      id: "wake_up_call",
      retrievalBoost: "wake up call alarm front desk morning call",
      phrases: ["wake up call", "wake-up call", "morning call", "alarm call"]
    },
    {
      id: "in_room_safe",
      retrievalBoost: "in room safe laptop valuables lock combination",
      phrases: ["room safe", "in room safe", "laptop safe", "lock up passport"]
    },
    {
      id: "cot_rollaway_crib",
      retrievalBoost: "rollaway crib cot pack play extra bed baby",
      phrases: ["rollaway bed", "extra bed", "pack n play", "pack and play", "baby crib", "portable crib"]
    },
    {
      id: "stay_extension",
      retrievalBoost: "extend stay extra night lengthen departure",
      phrases: ["stay an extra night", "extend my stay", "one more night", "longer stay"]
    },
    {
      id: "ota_vs_direct",
      retrievalBoost: "third party booking direct booking price match best rate guarantee",
      phrases: [
        "booking through expedia",
        "through hotels com",
        "price match",
        "cheaper on booking",
        "change ota reservation"
      ]
    }
  ];

  /** @returns {ReturnType<typeof analyze>} */
  function emptyResult() {
    return {
      best: { id: null, score: 0 },
      secondBestScore: 0,
      confidence: 0,
      retrievalBoost: "",
      mapIntentId: null,
      suggestEscalate: false,
      slots: {}
    };
  }

  function scoreIntent(def, blob) {
    let sc = 0;
    const phrases = def.phrases || [];
    for (let i = 0; i < phrases.length; i++) {
      const p = phrases[i];
      if (p.length >= 3 && blob.includes(p)) {
        sc += 22 + Math.min(p.length, 40) * 0.35;
      }
    }
    const tokens = def.tokens || [];
    for (let i = 0; i < tokens.length; i++) {
      if (hasWord(blob, tokens[i])) sc += 11;
    }
    const mh = def.mustHaveAny;
    if (mh && mh.length) {
      let ok = false;
      for (let i = 0; i < mh.length; i++) {
        if (blob.includes(mh[i]) || hasWord(blob, mh[i])) {
          ok = true;
          break;
        }
      }
      if (!ok) return 0;
    }
    const blocks = def.blockIf || [];
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].test(blob)) {
        sc *= 0.12;
        break;
      }
    }
    const w = def.weight != null ? def.weight : 1;
    return sc * w;
  }

  /**
   * @param {string} enText — English-ish line used for retrieval
   * @param {string} rawText — original user line (same language)
   */
  function analyze(enText, rawText) {
    if (global.MM_CHAT_DISABLE_NLU === true) return emptyResult();
    const blob = norm(String(enText || "") + " " + String(rawText || ""));
    if (!blob || blob.length < 2) return emptyResult();

    let bestId = null;
    let bestScore = 0;
    let second = 0;
    let bestDef = null;

    for (let i = 0; i < INTENTS.length; i++) {
      const def = INTENTS[i];
      const sc = scoreIntent(def, blob);
      if (sc > bestScore) {
        second = bestScore;
        bestScore = sc;
        bestId = def.id;
        bestDef = def;
      } else if (sc > second) {
        second = sc;
      }
    }

    if (!bestDef || bestScore < 9) return emptyResult();

    const confidence = Math.min(1, bestScore / (bestScore + second + 12));
    const retrievalBoost =
      confidence >= 0.26 && bestDef.retrievalBoost ? bestDef.retrievalBoost : "";

    const mapIntentId =
      bestDef.mapIntentId && bestScore >= 28 && confidence >= 0.34 ? bestDef.mapIntentId : null;

    return {
      best: { id: bestId, score: bestScore },
      secondBestScore: second,
      confidence,
      retrievalBoost,
      mapIntentId,
      suggestEscalate: !!(bestDef.suggestEscalate && confidence >= 0.36 && bestScore >= 18),
      slots: {}
    };
  }

  global.MM_NLU = {
    version: 6,
    analyze,
    /** For debugging / future tooling */
    intentCount: INTENTS.length
  };
})(typeof window !== "undefined" ? window : globalThis);
