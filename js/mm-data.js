// ── Motel Mediteran — Single source of truth ──────────────
// Edit here and both the room pages and chatbot update automatically.

window.MM_DATA = {

  motel: {
    name: "Motel Mediteran",
    address: "2336 S. Escondido Blvd, Escondido, CA 92025",
    phone: "760-743-2300",
    bookingUrl: "https://www.booking.com/hotel/us/motel-mediteran.html?aid=330843;lang=en;pb=1",
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    poolHours: { open: 8.5, close: 21 }, // 8:30 AM – 9:00 PM
  },

  rooms: {
    "suite-kitchen": {
      label: "Suite",
      name: "Deluxe King Suite\nwith Kitchen",
      specs: ["King Bed + Queen Bed", "Sleeps 4", "Full Kitchen"],
      desc: "Spacious two-room suite with a full kitchen, dining area, and living space — ideal for longer stays, families, or anyone who wants room to spread out. The kitchen comes fully equipped with two stovetops, a full-size refrigerator, microwave, and utensils, so you can cook and settle in like home.",
      bullets: [
        "Sleeps 4",
        "Living area",
        "Fireplace",
        "Dining area",
        "Kitchen with 2 stovetops",
        "Full size refrigerator",
        "Microwave",
        "Utensils provided",
        "King bed",
        "Queen bed",
        "In-room jacuzzi hot tub",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/deluxe%20king%20jacuzzi/1.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/2.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/3.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/4.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/5.png",
        "assets/motel-pics/deluxe%20king%20jacuzzi/6.png",
      ],
    },

    "suite-jacuzzi": {
      label: "Suite",
      name: "Deluxe King Suite",
      specs: ["King Bed", "Sleeps 2", "In-Room Jacuzzi"],
      desc: "Refined deluxe suite with in-room jacuzzi, upgraded finishes, and a private outdoor patio. A quiet retreat after full days exploring San Diego County — with extra space to unwind in privacy and comfort.",
      bullets: [
        "Sleeps 2",
        "King bed",
        "In-room jacuzzi",
        "Private outdoor patio",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/king%20room%20jacuzzi/1.png",
        "assets/motel-pics/king%20room%20jacuzzi/2.png",
        "assets/motel-pics/king%20room%20jacuzzi/3.png",
        "assets/motel-pics/king%20room%20jacuzzi/4.png",
        "assets/motel-pics/king%20room%20jacuzzi/5.png",
      ],
    },

    "suite-2room": {
      label: "Suite",
      name: "2-Room Suite\nwith Kitchen",
      specs: ["2 Queen Beds", "Sleeps 4", "Separate Living Room"],
      desc: "Two-room suite with separated living and sleeping zones — ideal for families, groups, and extended trips. The kitchen comes with two stovetops, a full-size refrigerator, microwave, and utensils. Practical space for relaxing or planning the day.",
      bullets: [
        "Sleeps 4",
        "Separate living room",
        "Kitchen with 2 stovetops",
        "Full size refrigerator",
        "Microwave",
        "Utensils provided",
        "2 Queen beds",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/2%20rooms%20kitchen%20suite/1.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/2.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/3.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/4.png",
        "assets/motel-pics/2%20rooms%20kitchen%20suite/5.png",
      ],
    },

    "king": {
      label: "Room",
      name: "Standard King",
      specs: ["King Bed", "Sleeps 2"],
      desc: "Clean, comfortable king room with the practical essentials you need for a restful stay near I-15 in Escondido. Fresh non-smoking environment, free Wi-Fi, and everything set up so you can get in, rest, and head out ready for the day.",
      bullets: [
        "Sleeps 2",
        "King size bed",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/std%20king/1.png",
        "assets/motel-pics/std%20king/2.png",
        "assets/motel-pics/std%20king/3.png",
        "assets/motel-pics/std%20king/4.png",
      ],
    },

    "queen": {
      label: "Room",
      name: "Standard Queen",
      specs: ["Queen Bed", "Sleeps 2"],
      desc: "Comfortable queen room designed for solo travelers and couples. A calm, non-smoking space with free Wi-Fi and the everyday essentials — fridge, microwave, and a flat-screen TV — so you can settle in with ease.",
      bullets: [
        "Sleeps 2",
        "Queen size bed",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/std%20queen/1.png",
        "assets/motel-pics/std%20queen/2.png",
        "assets/motel-pics/std%20queen/3.png",
      ],
    },

    "queen-double": {
      label: "Room",
      name: "Double Queen",
      specs: ["2 Queen Beds", "Sleeps 4"],
      desc: "Roomy double-queen setup with extra sleeping space — a practical choice for small families or friends traveling together. Non-smoking throughout, with free Wi-Fi and daily essentials already taken care of.",
      bullets: [
        "Sleeps 4",
        "2 Queen beds",
        "Microwave",
        "Refrigerator",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/std%202%20queen/1.png",
        "assets/motel-pics/std%202%20queen/2.png",
        "assets/motel-pics/std%202%20queen/3.png",
        "assets/motel-pics/std%202%20queen/4.png",
      ],
    },

    "ada": {
      label: "ADA Accessible",
      name: "Accessible Rooms",
      specs: ["King or Queen Bed", "Roll-In Shower Available"],
      desc: "Accessible accommodations designed for comfort and convenience, with mobility-friendly features for a smooth and restful stay. Available as king, queen, or double-queen configurations — all with practical accessibility features built in. Subject to availability; request when booking.",
      bullets: [
        "King, Queen, or 2-Queen bed",
        "Grab bars in bathroom",
        "Lowered vanity",
        "Roll-in shower (select rooms)",
        "Lowered light switches",
        "Refrigerator",
        "Microwave",
        "Flat screen TV",
        "Free Wi-Fi",
        "Non-smoking",
      ],
      photos: [
        "assets/motel-pics/King%20accessible/1.png",
        "assets/motel-pics/King%20accessible/2.png",
        "assets/motel-pics/King%20accessible/3.png",
        "assets/motel-pics/King%20accessible/4.jpeg",
        "assets/motel-pics/queen%20accessible/1.png",
        "assets/motel-pics/queen%20accessible/2.png",
        "assets/motel-pics/queen%20accessible/3.png",
        "assets/motel-pics/Double%20queen%20accesible/1.png",
        "assets/motel-pics/Double%20queen%20accesible/2.png",
        "assets/motel-pics/Double%20queen%20accesible/3.png",
        "assets/motel-pics/Double%20queen%20accesible/4.jpeg",
      ],
    },
  },

  /**
   * Curated chat replies (optional). Marcos checks these before page search.
   * Use natural phrases guests type; longest matching phrase wins.
   * No API — edit anytime to make answers feel “exactly right.”
   */
  chatSnippets: [
    {
      whenContains: [
        "wifi password",
        "wi-fi password",
        "internet password",
        "wireless password",
        "how do i connect to wifi",
        "how to connect wifi"
      ],
      reply:
        "Wi‑Fi is free in every room and common area. We don’t put the network name or password in this chat — you’ll see our guest network at check‑in (or call the front desk at 760‑743‑2300 and they’ll walk you through it).",
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs — Wi‑Fi"
    },
    {
      whenContains: [
        "luggage storage",
        "store luggage",
        "hold my bags",
        "hold our bags",
        "drop off bags",
        "drop off our bags",
        "leave bags before check",
        "bags before check in",
        "bags after checkout",
        "after checkout can you hold",
        "suitcases before room",
        "early arrival luggage",
        "bellhop",
        "bell desk",
        "stash luggage",
        "keep my bags at the desk"
      ],
      reply:
        "Short‑term bag hold (before check‑in or right after check‑out) depends on how busy the desk is that day — it’s not something I can guarantee from chat. Call 760‑743‑2300 (24/7) with your arrival time and how many bags; they’ll tell you what works.",
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies"
    },
    {
      whenContains: [
        "emotional support",
        "esa animal",
        " esa ",
        "therapy dog",
        "therapy animal",
        "psychiatric service",
        "service dog",
        "service animal",
        "bring my dog",
        "bring our dog",
        "bring my cat",
        "are pets allowed",
        "allow pets",
        "pet policy",
        "dog allowed",
        "cat allowed",
        "puppy",
        "travel with dog"
      ],
      reply:
        "We’re not a pet‑friendly property — pets aren’t allowed. Trained service animals that perform work or tasks for a guest with a disability are welcome. Share that when you book or call 760‑743‑2300 so the desk can note your stay correctly.",
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies — pets"
    },
    {
      whenContains: [
        "cancel reservation",
        "cancel my booking",
        "cancel my reservation",
        "cancellation policy",
        "can i cancel",
        "get a refund",
        "non refundable",
        "non-refundable",
        "change my dates",
        "modify my booking",
        "modify reservation",
        "booking.com change",
        "change booking.com"
      ],
      reply:
        "Cancellation, refunds, and date changes follow the rate plan and the site where you booked — your confirmation email is the authority. For how we generally handle payment and deposits at the motel, see Hotel policies; for your exact reservation, 760‑743‑2300 is the fastest help.",
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies — payment"
    },
    {
      whenContains: ["why should i stay", "why stay here", "what makes you special", "is it worth it"],
      reply:
        "Guests usually tell us the same things: clean comfortable rooms, friendly front desk, quiet nights, and a great spot near I‑15 and the Safari Park — without big‑chain prices. We’re a relaxed North County motel, not a resort, and we lean into that.",
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs — guest experience"
    },
    {
      whenContains: ["human", "real person", "speak to a person", "talk to human", "real agent"],
      reply:
        "I’m Marcos — a guide built for this site, not a person at the desk. For anything booking‑specific or urgent, our 24/7 front desk at 760‑743‑2300 is the right call. I’m here for quick questions anytime.",
      pageLink: null,
      pageLinkLabel: null
    },
    {
      whenContains: ["discount code", "promo code", "coupon", "cheaper rate", "negotiate price"],
      reply:
        "Rates come from live availability — the best snapshot is always on our booking link for your dates. We don’t run promo codes through this chat, but booking direct is usually your best bet.",
      pageLink: null,
      pageLinkLabel: null
    },
    {
      whenContains: ["do you hate", "worst hotel", "scam", "is this a scam"],
      reply:
        "We’re a real motel at 2336 S. Escondido Blvd in Escondido — family‑run, not a scam. If something looks off online, make sure you’re on our site or a trusted partner; when in doubt, call us direct at 760‑743‑2300.",
      pageLink: "directions.html",
      pageLinkLabel: "Directions"
    },
    {
      whenContains: [
        "need email",
        "your email",
        "email address",
        "e-mail",
        "send email",
        "contact email",
        "write an email",
        "i need email",
        "guest email",
      ],
      reply:
        "We don’t publish a general guest email in this chat — the fastest, reliable line is the front desk at 760‑743‑2300 (24/7). For reservations, the booking link on our site shows live availability.",
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs"
    },
    {
      whenContains: [
        "check in time",
        "check-in time",
        "checkin time",
        "what time check in",
        "what time can i check in",
        "when can i check in",
        "when check in",
        "arrival time",
        "get into the room",
        "time to arrive",
        "earliest check in",
        "early check in",
        "3 pm",
        "3pm check"
      ],
      reply:
        "Standard check‑in is 3:00 PM and check‑out is 11:00 AM. If you’ll arrive early, call 760‑743‑2300 — whether you can check in early depends on whether the room is ready.",
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies"
    },
    {
      whenContains: [
        "check out time",
        "checkout time",
        "check-out time",
        "what time checkout",
        "what time check out",
        "when checkout",
        "when do we leave",
        "when do we have to leave",
        "leave the room",
        "late checkout",
        "late check out",
        "extend checkout",
        "11 am",
        "11am checkout"
      ],
      reply:
        "Check‑out is 11:00 AM. Need a little more time? Ask the front desk at 760‑743‑2300 — late checkout is only when housekeeping and the day’s bookings allow it.",
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies"
    },
    {
      whenContains: [
        "phone number",
        "call you",
        "reach you",
        "front desk number",
        "telephone",
        "call the hotel",
        "desk phone",
        "760-743",
        "760743"
      ],
      reply:
        'You can reach <span class="notranslate" translate="no">Motel Mediteran</span> anytime at 760‑743‑2300 — our front desk is 24/7 for questions or help during your stay.',
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs"
    },
    {
      whenContains: [
        "address",
        "where are you located",
        "where is the motel",
        "where is motel mediteran",
        "physical address",
        "location map",
        "gps",
        "escondido blvd",
        "directions to you",
        "how to find you"
      ],
      reply:
        "We’re at 2336 S. Escondido Blvd, Escondido, CA 92025 — North County San Diego, close to I‑15 and the Safari Park.",
      pageLink: "directions.html",
      pageLinkLabel: "Directions"
    },
    {
      whenContains: [
        "book a room",
        "how do i book",
        "make a reservation",
        "reservation link",
        "availability",
        "vacancy",
        "reserve a room",
        "booking.com",
        "book online"
      ],
      reply:
        "For live availability and rates, use the Book link on our site (we partner with Booking.com for online reservations). You can also call 760‑743‑2300 if you’d rather talk to the desk.",
      pageLink: "index.html",
      pageLinkLabel: "Home — Book"
    },
    {
      whenContains: [
        "pool hours",
        "when is the pool open",
        "pool open",
        "swimming pool",
        "go swimming",
        "heated pool",
        "pool times"
      ],
      reply:
        "The outdoor pool is usually open 8:30 AM to 9:00 PM daily—see amenities on the site for the latest. At check‑in you can confirm, or call 760‑743‑2300 if you’re unsure.",
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities"
    }
  ],
};
