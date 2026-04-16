(() => {
  // ── Pull live data from mm-data.js ───────────────────────
  const _data   = window.MM_DATA || {};
  const _motel  = _data.motel  || {};
  const _rooms  = _data.rooms  || {};

  const BOOKING_URL =
    _motel.bookingUrl || "https://www.booking.com/hotel/us/motel-mediteran.html?aid=330843;lang=en;pb=1";
  const PHONE       = _motel.phone       || "760-743-2300";
  const CHECKIN     = _motel.checkIn     || "3:00 PM";
  const CHECKOUT    = _motel.checkOut    || "11:00 AM";
  const POOL_OPEN   = (_motel.poolHours || {}).open  ?? 8;
  const POOL_CLOSE  = (_motel.poolHours || {}).close ?? 22;

  // ── Build room response from live data ───────────────────
  function roomResponse(id) {
    const r = _rooms[id];
    if (!r) return null;
    const name = r.name.replace("\n", " ");
    const bullets = r.bullets.map(b => "• " + b).join("\n");
    return name + "\n\n" + bullets + "\n\n" + r.desc;
  }

  // ── Conversation memory ──────────────────────────────────
  const memory = {
    hasKids: false,
    wantsKitchen: false,
    wantsJacuzzi: false,
    groupSize: null,
    mentionedSafariPark: false,
    lastIntentId: null,
    /** Previous user line — used to merge “turn around” / follow-up questions into one search query. */
    lastUserUtterance: null,
    /** Stops the page-index from echoing the same chunk when the guest clearly changed topics. */
    lastKnowledgeFingerprint: null,
    /** Last NLU retrieval tail — helps short follow-ups (“same for Saturday?”) stay on topic. */
    lastNluRetrievalTail: "",
    exchangeCount: 0,
  };

  // ── Intents ──────────────────────────────────────────────
  const INTENTS = [
    // ── Property name / spelling (typos like “Mediterian”) ──
    {
      id: "place_about_name",
      keywords: [
        "motel mediterian",
        "motel mediterran",
        "motel mediteren",
        "mediterian",
        "mediterian motel",
        "mediterran motel",
        "mediteren",
        "is it mediterranean",
        "mediterranean motel",
        "spell the name",
        "how do you spell",
        "what is the name of the hotel",
        "what is the name of this place",
        "what's this place called",
        "whats this place called",
        "who is motel",
        "what is motel med",
        "motel med ",
        "about motel mediteran",
        "tell me about motel mediteran",
        "correct spelling motel"
      ],
      responses: [
        "You found us — it’s Motel Mediteran, spelled M-e-d-i-t-e-r-a-n (not “Mediterranean”). We’re at 2336 South Escondido Boulevard in Escondido, California. Many guests spell it differently, and that’s perfectly fine!",
        "Motel Mediteran is the name — one word, Mediteran — a friendly, family-welcome motel near I-15 and the Safari Park. If you were looking for us, you’re in the right place.",
        "That’s us! Our official name is Motel Mediteran in Escondido. I’m Marcos — please feel free to ask about rooms, the pool, directions, or anything that would help your stay."
      ],
      quickReplies: ["Where are you located?", "What rooms do you have?", "How do I book?"],
      pageLink: "index.html",
      pageLinkLabel: "Homepage"
    },
    // ── Casual / social ──
    {
      id: "how_are_you",
      keywords: ["how are you", "how are u", "how r u", "how do you do", "you good", "u good", "are you good", "hows it going", "how's it going", "how you doing", "how u doing"],
      responses: [
        "I’m doing well, thank you for asking — I’m here whenever you need anything about the motel.",
        "I’m well, thank you! How may I help you today with your visit or booking?",
        "All good here — please let me know what I can help you with: rooms, location, or amenities."
      ],
      quickReplies: ["What rooms do you have?", "Is there a pool?", "Where are you located?"]
    },
    {
      id: "who_are_you",
      keywords: [
        "who are you",
        "what are you",
        "your name",
        "whats your name",
        "what's your name",
        "ur name",
        "whats ur name",
        "what is ur name",
        "what's ur name",
        "what is your name",
        "who r u",
        "who are u",
        "whos marcos",
        "who is marcos",
        "tell me about yourself",
        "are you a bot",
        "are you ai",
        "are you human",
        "are you real"
      ],
      responses: [
        "I’m Marcos — the friendly assistant for Motel Mediteran. I’m not at the physical front desk, but I’m here to share what we publish about rooms, policies, and the area.",
        "I’m Marcos, the digital concierge for Motel Mediteran. Please ask me anything about our rooms, location, or amenities — I’ll do my best to help.",
        "I’m Marcos, Motel Mediteran’s chat assistant. Think of me as extra help alongside our team; for urgent needs you can always call the front desk."
      ],
      quickReplies: ["What rooms do you have?", "Where are you located?", "How do I book?"]
    },
    {
      id: "whats_up",
      keywords: ["what's up", "whats up", "sup", "wassup", "what up"],
      responses: [
        "Not much, just here helping guests find their perfect room! What's up with you?",
        "Just hanging at the virtual front desk! Anything I can help with?",
        "All good! Got a trip coming up? I can help with rooms, directions, anything."
      ],
      quickReplies: ["What rooms do you have?", "Where are you located?"]
    },
    {
      id: "joke",
      keywords: ["tell me a joke", "joke", "funny", "make me laugh", "say something funny"],
      responses: [
        "Why did the hotel guest bring a ladder? Because he heard the rates were going up! 😄 Anyway — can I help you find a room?",
        "What do you call a sleeping hotel? An inn-somnia! 😄 On a more helpful note — got any questions about the motel?",
        "Why don't hotels ever lose? Because they always have a suite deal! 😄 Alright, enough of that — how can I actually help you?"
      ],
      quickReplies: ["What rooms do you have?", "How do I book?"]
    },
    {
      id: "bored",
      keywords: ["bored", "nothing to do", "entertain me", "talk to me", "chat"],
      responses: [
        "Ha, I feel you. Maybe a little getaway is exactly what you need? We've got a pool, suites with jacuzzis, and we're close to the Safari Park.",
        "Sounds like it's time for a trip! Motel Mediteran has great rooms and you're minutes from the San Diego Zoo Safari Park. Just saying.",
        "I mean… I could talk about room types all day if that helps? 😄 Or maybe just come stay with us and cure that boredom."
      ],
      quickReplies: ["What rooms do you have?", "How far is the Safari Park?", "How do I book?"]
    },
    {
      id: "lets_get_back",
      keywords: ["lets get back", "let's get back", "back to topic", "get back on track", "back on track", "lets focus", "let's focus", "back to the point", "anyway", "so anyway", "moving on", "back to business", "lets talk about", "let's talk about", "tell me about the motel", "about the motel", "about the hotel"],
      responses: [
        "Sure, back to it! What would you like to know about Motel Mediteran?",
        "Of course! Rooms, amenities, location, booking — what are you curious about?",
        "Right, let's do it! I can help with rooms, directions, check-in, the pool, nearby attractions — where do you want to start?"
      ],
      quickReplies: ["What rooms do you have?", "Is there a pool?", "Where are you located?", "How do I book?"]
    },
    {
      id: "help",
      keywords: ["help", "help me", "i need help", "can you help", "what can you do", "what do you know", "how can you help", "what can i ask"],
      responses: [
        "Of course — I’m happy to help with rooms and suites, check-in and check-out, the pool, parking, Wi‑Fi, dining nearby, things to do, directions, booking links, weather, and what’s on our FAQs and policies pages. What would you like to know?",
        "I can share what we publish about Motel Mediteran — rooms, amenities, location, nearby distances, and policies. Please ask in your own words.",
        "Happy to help! You might try asking about rooms, the pool, check-in times, how far we are from the Safari Park, or say “FAQs page” or “directions” for more detail on the website."
      ],
      quickReplies: ["What rooms do you have?", "What's nearby?", "How do I book?"]
    },
    {
      id: "not_sure",
      keywords: ["not sure", "i don't know", "i dont know", "no idea", "unsure", "maybe", "not really", "just browsing", "just looking", "just checking"],
      responses: [
        "No worries, take your time! I'm here whenever you're ready. Want me to give you a quick overview?",
        "That's totally fine — just browsing is good too. If anything catches your eye, I'm right here.",
        "No rush at all! I can walk you through what we offer if that helps — rooms, location, amenities, all of it."
      ],
      quickReplies: ["Give me an overview", "What rooms do you have?", "What's nearby?"]
    },
    {
      id: "overview",
      keywords: ["overview", "give me an overview", "summary", "summarize", "tell me everything", "what do you have overall", "quick rundown", "rundown"],
      responses: [
        "Sure! Motel Mediteran is in Escondido, CA — close to I-15 and about 10 minutes from the Safari Park. We have standard rooms (king, queen, double queen), suites with full kitchens, a private jacuzzi suite, and ADA accessible rooms. All rooms have free Wi-Fi, free parking, TV, microwave, and fridge. Pool on-site too. Want details on anything specific?",
        "Quick version: we're in Escondido near I-15, 10 min from the Safari Park. Rooms range from standard kings and queens to full kitchen suites with jacuzzis and fireplaces. Free Wi-Fi, free parking, pool for all guests. What would you like to dig into?"
      ],
      quickReplies: ["Tell me about the suites", "How far is the Safari Park?", "How do I book?"]
    },
    {
      id: "what_else",
      keywords: ["what else", "what else you got", "what else do you have", "anything else", "tell me more", "what more", "more options", "other options", "what other", "show me more", "what can you tell me", "give me more", "go on", "keep going", "and then what", "what about that", "elaborate", "anything more"],
      responses: [
        "Plenty more! We've got a pool, free parking, free Wi-Fi, suites with jacuzzis and fireplaces, kitchen suites for longer stays, and we're super close to the Safari Park. What sounds interesting?",
        "Lots! Kitchen suites, private jacuzzis, a pool, ADA accessible rooms, free parking — and a great location near I-15 in Escondido. Want details on any of that?"
      ],
      quickReplies: ["Tell me about the suites", "What's nearby to eat?", "Things to do", "How do I book?"]
    },
    {
      id: "nice",
      keywords: ["nice", "cool", "awesome", "amazing", "wow", "sounds good", "love it", "fantastic", "excellent", "not bad"],
      responses: [
        "Right? We think so too 😄 Anything else you'd like to know?",
        "Glad you think so! Anything else I can help with?",
        "Happy to hear it! Any other questions?"
      ],
      quickReplies: ["How do I book?", "What rooms do you have?", "What's the phone number?"]
    },
    {
      id: "okay",
      keywords: ["ok", "okay", "got it", "i see", "understood", "alright", "makes sense", "ok cool", "ok great", "ok perfect", "ok thanks", "ok thank you", "alright cool", "fair enough", "okie dokie", "okie"],
      responses: [
        "Thank you — please let us know if anything else comes to mind.",
        "Absolutely. May I help with anything else?",
        "You’re welcome — we’re here if you have more questions."
      ],
      quickReplies: ["How do I book?", "What rooms do you have?"]
    },
    {
      id: "yeah_sure",
      keywords: ["yeah", "yea", "yep", "yup", "sure", "sure thing", "absolutely", "definitely", "for sure", "you bet", "right on"],
      responses: [
        "Wonderful — what would you like to know next: rooms, directions, or amenities?",
        "Great! What may I help you with next — booking, the pool, the Safari Park, or something else?",
        "Sounds good — please share your next question whenever you’re ready."
      ],
      quickReplies: ["What rooms do you have?", "How do I book?", "Where are you located?"]
    },
    {
      id: "nah_nope",
      keywords: ["nah", "nope", "no thanks", "no thank you", "not interested", "maybe later"],
      responses: [
        "All good! If anything changes, I'm right here.",
        "No worries at all. Anything else I can help with?",
        "Totally fine! Let me know if another question pops up."
      ],
      quickReplies: ["How do I book?", "What's on the FAQs page?", "Where are you located?"]
    },
    {
      id: "lol_react",
      keywords: ["lol", "lmao", "haha", "ha ha", "that's funny", "thats funny", "too funny"],
      responses: [
        "Glad that gave you a smile — may I help with anything about the motel?",
        "Happy to hear that! Would you like to hear about rooms, rates, or directions next?",
        "That’s kind of you! I’m here for any questions about your stay."
      ],
      quickReplies: ["What rooms do you have?", "How do I book?", "Things to do nearby"]
    },
    {
      id: "meta_chat_pace",
      keywords: ["too fast", "youre too fast", "you're too fast", "slow down", "go slower", "one at a time", "that was fast"],
      responses: [
        "Fair point — I’ll take it a bit slower. What would you like to go through first: rooms, directions, or policies?",
        "Got it, I’ll keep answers shorter and clearer. What should we tackle — rooms, getting here, or the pool?",
        "Thanks for saying so — tell me the one thing you care about most right now and I’ll focus there.",
      ],
      quickReplies: ["What rooms do you have?", "Directions", "Check-in times", "Is there a pool?"],
    },
    // ── Spanish ──
    {
      id: "spanish_greeting",
      responsesLang: "es",
      keywords: ["hola", "buenos dias", "buenas tardes", "buenas noches", "buenas", "que tal", "qué tal", "como estas", "cómo estás", "como estan", "saludos"],
      responses: [
        "¡Hola! Soy Marcos, el asistente de Motel Mediteran. Puedo ayudarte con información sobre habitaciones, amenidades, ubicación y reservas. ¿En qué te puedo ayudar? (I also speak English — just ask!)",
        "¡Buenas! Soy Marcos. Estoy aquí para ayudarte con todo lo del Motel Mediteran — habitaciones, piscina, precios, cómo llegar. ¿Qué necesitas?"
      ],
      quickReplies: ["¿Qué habitaciones tienen?", "¿Hay piscina?", "¿Cómo reservo?", "Switch to English"]
    },
    {
      id: "spanish_rooms",
      responsesLang: "es",
      keywords: ["qué habitaciones tienen", "que habitaciones tienen", "tipos de habitaciones", "habitaciones disponibles", "que cuartos tienen", "qué cuartos tienen", "tipos de cuartos"],
      responses: [
        "Tenemos habitaciones estándar (King, Queen, Doble Queen) y suites con cocina completa, jacuzzi privado y chimenea. También tenemos habitaciones accesibles ADA. ¿Quieres más detalles de alguna en particular?",
        "Opciones de habitaciones: King Estándar, Queen Estándar, Doble Queen, Suite Deluxe con Jacuzzi, Suite Deluxe con Cocina, Suite de 2 Cuartos con Cocina, y habitaciones accesibles. ¿Cuál te interesa?"
      ],
      quickReplies: ["Suite con jacuzzi", "Suite con cocina", "¿Cómo reservo?"]
    },
    {
      id: "spanish_pool",
      responsesLang: "es",
      keywords: ["hay piscina", "¿hay piscina?", "tienen piscina", "alberca", "piscina horario", "horario piscina", "esta abierta la piscina"],
      responses: [
        "¡Sí! Tenemos piscina al aire libre, abierta de 8:30 AM a 9:00 PM todos los días. Es gratuita para todos los huéspedes. Nota: la piscina no está climatizada.",
        "Sí, hay piscina — abierta de 8:30 AM a 9:00 PM diariamente, sin costo adicional. No está calefaccionada, pero el clima de Escondido es agradable la mayor parte del año."
      ],
      quickReplies: ["¿Cómo reservo?", "¿Qué habitaciones tienen?"]
    },
    {
      id: "spanish_booking",
      responsesLang: "es",
      keywords: ["cómo reservo", "como reservo", "hacer una reserva", "hacer reservación", "reservar habitación", "reservar cuarto", "cómo book", "precio de las habitaciones", "cuánto cuesta", "cuanto cuesta"],
      responses: [
        "Puedes reservar en línea desde nuestra página de Booking.com — ahí verás disponibilidad y precios actualizados para tus fechas. También puedes llamarnos al " + PHONE + " (atención 24 horas).",
        "La manera más fácil es reservar en línea en Booking.com, o llamar directamente al " + PHONE + " — el personal está disponible las 24 horas."
      ],
      quickReplies: ["¿Cuál es el teléfono?", "¿A qué hora es el check-in?"]
    },
    {
      id: "spanish_checkin",
      responsesLang: "es",
      keywords: ["a qué hora es el check in", "a que hora es el check in", "hora de entrada", "hora de llegada", "check in hora", "hora check out", "hora de salida"],
      responses: [
        "El check-in es a partir de las 3:00 PM y el check-out es antes de las 11:00 AM. Si necesitas llegar más temprano, llámanos al " + PHONE + " y haremos lo posible.",
        "Entrada: 3:00 PM. Salida: 11:00 AM. Para early check-in o late check-out, comunícate con nosotros al " + PHONE + "."
      ],
      quickReplies: ["¿Cómo reservo?", "¿Cuál es el teléfono?"]
    },
    {
      id: "spanish_location",
      responsesLang: "es",
      keywords: ["dónde están", "donde estan", "dirección", "direccion", "cómo llego", "como llego", "ubicación", "ubicacion", "dónde queda", "donde queda"],
      responses: [
        "Estamos en 2336 S. Escondido Blvd, Escondido, CA 92025 — muy cerca de la autopista I-15, en el Norte del Condado de San Diego. A solo 10-15 minutos del Safari Park.",
        "Nuestra dirección es 2336 S. Escondido Blvd, Escondido, CA. Fácil acceso desde la I-15. Estamos a 10 minutos del San Diego Zoo Safari Park."
      ],
      quickReplies: ["¿Cómo reservo?", "¿Hay estacionamiento?"]
    },
    {
      id: "spanish_parking",
      responsesLang: "es",
      keywords: ["hay estacionamiento", "estacionamiento gratis", "donde aparco", "dónde aparco", "parking gratis", "hay parking"],
      responses: [
        "Sí, estacionamiento gratuito en el hotel para todos los huéspedes. Sin costo adicional.",
        "¡Sí! Estacionamiento gratis en las instalaciones — sin costo para huéspedes registrados."
      ],
      quickReplies: ["¿Cómo reservo?", "¿Qué habitaciones tienen?"]
    },
    {
      id: "switch_english",
      forceEnReply: true,
      keywords: ["switch to english", "in english", "speak english", "english please", "habla ingles", "en inglés", "en ingles"],
      responses: [
        "Of course! I'm Marcos, Motel Mediteran's assistant. Happy to help in English — what would you like to know?",
        "Sure! Switching to English. What can I help you with — rooms, directions, amenities, booking?"
      ],
      quickReplies: ["What rooms do you have?", "Is there a pool?", "How do I book?"]
    },

    {
      id: "greeting",
      keywords: ["hello", "hi", "hey", "hie", "hei", "hai", "heya", "heyy", "hiii", "hii", "good morning", "good evening", "good afternoon", "howdy", "yo", "oi", "sup", "hiya"],
      responses: [
        "Hello — welcome to Motel Mediteran. I’m Marcos; take a breath and ask me anything when you’re ready.",
        "Hi there, it’s nice to meet you. I’m happy to help with rooms, the pool, directions, or anything on your mind.",
        "Good to see you! I’m Marcos — no rush at all. What would feel helpful to know about your stay?",
        "Hey — Marcos here. Would rooms, pool hours, or directions be a good place to start?",
        "Welcome in. I’m here quietly in the background — booking, amenities, or what’s around Escondido, whatever you need."
      ],
      quickReplies: ["What rooms do you have?", "Is there a pool?", "Where are you located?", "Check-in times"]
    },

    // ── Emotional / human reactive ──
    {
      id: "hmm_filler",
      keywords: ["hmm", "hm", "huh", "hub", "uh huh", "mhm", "mmm", "umm", "ummm", "uhh", "ahh", "ohhh", "oh okay", "oh right", "oh interesting", "oh cool", "oh nice", "oh wow", "ah i see", "uh oh"],
      responses: [
        "Something catch your eye? I'm right here 😊",
        "Take your time — when you're ready, try Rooms, Pool, or Directions.",
        "Got it — ask me anything about the motel when you're ready.",
        "Sounds good — need rooms, amenities, or how to book?",
        "All good — I can pull up rates, hours, or what’s nearby anytime."
      ],
      quickReplies: ["Tell me about the rooms", "What's nearby?", "How do I book?"]
    },
    {
      id: "tired_need_break",
      keywords: ["tired", "exhausted", "burnt out", "worn out", "need a break", "need rest", "need a rest", "need vacation", "need a vacation", "need a holiday", "need a getaway", "need to recharge", "rough day", "long day", "rough week", "long week", "so tired", "so stressed", "stressed out", "need to relax", "need to unwind"],
      responses: [
        "Sounds like you really need this trip! 😌 A quiet room, the pool, maybe a jacuzzi suite — that's exactly what we're here for. Want help finding the right room?",
        "That's exactly why getaways exist. Come rest, unwind, and let us take care of the rest. Want me to show you our most relaxing options?",
        "Nothing better than a proper break when you're worn out. We've got a pool, in-room jacuzzi suites, and really comfortable rooms. Want to see what's available?"
      ],
      quickReplies: ["Tell me about the jacuzzi suite", "Is there a pool?", "What rooms do you have?"]
    },
    {
      id: "excited_trip",
      keywords: ["so excited", "really excited", "can't wait", "cant wait", "pumped", "thrilled", "stoked", "looking forward to it", "counting down", "excited for my trip", "excited about my stay"],
      responses: [
        "Love the energy! 🙌 What's the occasion — Safari Park, a family trip, something special?",
        "That's the spirit! Can't wait to have you. What are you most looking forward to?",
        "Love to hear it! What's bringing you to Escondido — the Safari Park, exploring the area, or just some well-deserved downtime?"
      ],
      quickReplies: ["How far is the Safari Park?", "What rooms do you have?", "Things to do nearby"]
    },
    {
      id: "nervous_unsure",
      keywords: ["nervous", "anxious", "a bit worried", "hope it's good", "hope it's nice", "first time staying", "first time there", "never been there", "not sure what to expect"],
      responses: [
        "Completely understandable — first stays always feel uncertain! I'm here for any question, big or small.",
        "No worries at all. Ask me whatever's on your mind — rooms, what to expect, policies, anything.",
        "I get it! That's what I'm here for. What would help — room details, location info, what to bring?"
      ],
      quickReplies: ["What's included in the rooms?", "What are check-in times?", "Where are you located?"]
    },
    {
      id: "sad_down",
      keywords: ["sad", "feeling down", "not feeling great", "not great", "having a rough time", "not the best day", "going through a tough time", "feeling low"],
      responses: [
        "Sorry to hear that 💙 Sometimes a change of scenery is exactly what helps. Hope we can make things a little better.",
        "I hope things look up soon. If a little getaway would help, we're here — sometimes a different view for a few days does wonders.",
        "Hope you're doing okay. If you need anything at all, just ask."
      ],
      quickReplies: ["Tell me about the rooms", "Is there a pool?", "How do I book?"]
    },
    {
      id: "happy_mood",
      keywords: ["feeling great", "feeling good", "in a good mood", "great day", "best day", "having a great day", "wonderful day", "life is good"],
      responses: [
        "That’s wonderful to hear! May we help you plan a visit to Escondido?",
        "So glad you’re in a good mood — perhaps we can help with a future getaway?",
        "That’s great — we’d love to welcome you whenever you’re ready to plan a trip."
      ],
      quickReplies: ["What rooms do you have?", "Things to do nearby", "How do I book?"]
    },
    {
      id: "frustrated",
      keywords: ["ugh", "this is frustrating", "not helpful", "useless", "annoying", "come on", "this is ridiculous", "not what i asked", "that's wrong", "wrong answer"],
      responses: [
        "I’m sorry that wasn’t helpful — thank you for your patience. Could you tell me in a few words what you’re looking for?",
        "I hear you, and I’d like to do better. What may I help you with next?",
        "Please accept my apologies for the mix-up. Let me know what you need and I’ll try my best."
      ],
      quickReplies: ["What rooms do you have?", "How do I book?", "What's your phone number?"]
    },
    {
      id: "recommend_room",
      keywords: ["what do you recommend", "which room is best", "best room for me", "help me choose", "help me decide", "can't decide which room", "cant decide", "what would you suggest", "suggest a room", "recommend a room", "which room should i get", "which room should i book", "what room is right for me"],
      responses: [
        "Happy to help! Tell me a bit more — how many people are staying, and is there anything you'd love to have: jacuzzi, kitchen, extra space, or just a comfortable night's sleep?",
        "Let me help narrow it down! How many guests? Any must-haves — kitchen, jacuzzi, separate living area? I'll point you to the right fit.",
        "Good question — there's a room for every type of trip. Are you coming as a couple, family, or solo? And anything specific: kitchen, jacuzzi, budget-friendly?"
      ],
      quickReplies: ["Just the two of us", "Family of 4", "Want a jacuzzi", "Need a kitchen"]
    },
    {
      id: "solo_trip",
      keywords: ["solo", "solo trip", "traveling alone", "just me", "by myself", "one person", "just myself", "single traveler"],
      responses: [
        "Solo trips can be wonderful. For one guest, our Standard Queen or Standard King rooms are comfortable and offer great value.",
        "Traveling solo? The Standard Queen or King are perfect — clean, comfortable, all the essentials. Simple and great value.",
        "For a solo stay, the Standard Queen or Standard King are the way to go — practical, comfortable, and right off I-15."
      ],
      quickReplies: ["Tell me about the Standard Queen", "Tell me about the Standard King", "How do I book?"]
    },
    {
      id: "romantic_trip",
      keywords: ["romantic", "honeymoon", "anniversary", "valentine", "date night", "special occasion", "surprise my partner", "proposal", "romantic getaway"],
      responses: [
        "For a romantic stay, the Deluxe King Suite is a lovely choice — king bed, private outdoor patio, and an in-room jacuzzi.",
        "Romantic getaway? The Deluxe King Suite with Kitchen takes it to another level — jacuzzi, fireplace, full kitchen, king + queen bed. Very memorable.",
        "For a special occasion, the Deluxe King Suite (private patio + in-room jacuzzi) is hard to beat. The Kitchen Suite adds a fireplace if you really want to go all out."
      ],
      quickReplies: ["Tell me about the Deluxe Suite", "How do I book?", "Is there a pool?"]
    },

    // ── Rooms ──
    {
      id: "rooms_overview",
      keywords: [
        "what rooms",
        "which rooms",
        "types of rooms",
        "kind of rooms",
        "room types",
        "list of rooms",
        "room options",
        "available rooms",
        "do you have rooms",
        "tell me about rooms",
        "about the rooms",
        "what kind of rooms",
        "how many rooms",
        "suite",
        "suites",
        "accommodation options",
        "places to stay",
        "any rooms",
        "i need a room",
        "looking for a room",
        "need a place to stay"
      ],
      responses: [
        "We’d be glad to host you! We offer Standard King, Standard Queen, Double Queen, a 2-Room Suite with Kitchen, a Deluxe King Suite with in-room jacuzzi, and a Deluxe King Suite with Kitchen with fireplace — plus ADA-accessible options. Is there a style you’re curious about?",
        "From cozy standard rooms to full suites with kitchens, jacuzzis, and fireplaces, we hope to have a fit for your trip. How may I help you choose?",
        "Our rooms range from comfortable Standard Kings and Queens up to spacious kitchen suites with private jacuzzis. All are non-smoking with free Wi‑Fi. Would you like details on a particular type?"
      ],
      quickReplies: ["Suites with kitchen", "Room with jacuzzi", "Rooms for 4 people", "ADA accessible rooms"],
      memoryUpdate: () => {}
    },
    {
      id: "suite_kitchen",
      keywords: ["kitchen", "cook", "cooking", "stove", "stovetop", "refrigerator", "fridge", "utensils", "suite with kitchen", "kitchen suite", "full kitchen", "kitchen suites"],
      responses: [
        "Our kitchen suites are a popular pick for families and longer stays. The Deluxe King Suite with Kitchen has a king + queen bed (sleeps 4), 2 stovetops, full-size fridge, microwave, utensils, a fireplace, and an in-room jacuzzi. The 2-Room Suite with Kitchen has 2 queens, a separate living room, and the same kitchen setup.",
        "Two great options — the Deluxe King Suite with Kitchen (fireplace, jacuzzi, king + queen, sleeps 4) and the 2-Room Suite with Kitchen (2 queens, separate living room, sleeps 4). Both have full kitchens so you can really settle in.",
        "If you want the home-away-from-home feel, our kitchen suites are perfect. Fully equipped with 2 stovetops, full fridge, microwave, and utensils. One also has a jacuzzi and fireplace."
      ],
      pageLink: "room-detail.html?room=suite-kitchen",
      pageLinkLabel: "Room details",
      quickReplies: ["Does it have a jacuzzi?", "Sleeps how many?", "How do I book?"],
      memoryUpdate: () => { memory.wantsKitchen = true; }
    },
    {
      id: "jacuzzi",
      keywords: ["jacuzzi", "hot tub", "tub", "spa", "whirlpool", "jetted bath", "jetted tub"],
      responses: [
        "Yes — private in-room jacuzzis in two suites: the Deluxe King Suite and the Deluxe King Suite with Kitchen. Nothing better than a soak after a long day.",
        "We have private in-room jacuzzis in our Deluxe King Suite and Deluxe King Suite with Kitchen. Totally private — just for your room.",
        "Our jacuzzi suites are a guest favorite. Both the Deluxe King Suite and Deluxe King Suite with Kitchen come with a private in-room jacuzzi."
      ],
      pageLink: "room-detail.html?room=suite-jacuzzi",
      pageLinkLabel: "Room details",
      quickReplies: ["Tell me about the Deluxe Suite", "Tell me about the kitchen suite", "How do I book?"],
      memoryUpdate: () => { memory.wantsJacuzzi = true; }
    },
    {
      id: "family",
      keywords: ["family", "families", "kids", "children", "4 people", "four people", "sleeps 4", "group", "two couples"],
      responses: [
        "For families, our best bets are the Deluxe King Suite with Kitchen (king + queen, sleeps 4, jacuzzi, fireplace) or the 2-Room Suite with Kitchen (2 queens, sleeps 4, separate living room). Both have full kitchens so you're not eating out every meal.",
        "Great family options — the 2-Room Suite with Kitchen gives you a proper separate living room and two queen beds, really handy with kids. Or the Deluxe King Suite with Kitchen for a more luxurious vibe. Both sleep 4.",
        "Families tend to love our kitchen suites — space to spread out, cook your own meals, both sleep up to 4."
      ],
      quickReplies: ["Is there a pool?", "Is parking free?", "How do I book?"],
      memoryUpdate: () => { memory.hasKids = true; memory.groupSize = 4; }
    },

    // ── Room type details ──
    {
      id: "room_deluxe_king_kitchen",
      keywords: ["deluxe king suite with kitchen", "king suite with kitchen", "suite with fireplace", "suite with jacuzzi and kitchen", "deluxe king kitchen", "tell me about the kitchen suite", "more about the kitchen suite", "kitchen suite details", "suite with kitchen details"],
      responses: ["__room:suite-kitchen__"],
      pageLink: "room-detail.html?room=suite-kitchen",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "What's the price?", "Sleeps how many?"],
      memoryUpdate: () => { memory.wantsKitchen = true; memory.wantsJacuzzi = true; }
    },
    {
      id: "room_deluxe_king_jacuzzi",
      keywords: ["deluxe king suite", "king suite", "king with jacuzzi", "jacuzzi suite", "king jacuzzi", "deluxe suite", "suite with patio", "tell me about the deluxe suite", "more about the deluxe suite", "deluxe suite details", "jacuzzi room details", "tell me about jacuzzi room"],
      responses: ["__room:suite-jacuzzi__"],
      pageLink: "room-detail.html?room=suite-jacuzzi",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "What's the price?", "Tell me about the kitchen suite"],
      memoryUpdate: () => { memory.wantsJacuzzi = true; }
    },
    {
      id: "room_2room_suite",
      keywords: ["2 room suite", "two room suite", "2-room suite", "suite with living room", "separate living room", "two bedroom suite", "2 bedroom"],
      responses: ["__room:suite-2room__"],
      pageLink: "room-detail.html?room=suite-2room",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "What's the price?", "Is there a pool?"],
      memoryUpdate: () => { memory.wantsKitchen = true; memory.groupSize = 4; }
    },
    {
      id: "room_standard_king",
      keywords: ["standard king", "king room", "king size room", "king bed room", "king size bed", "king bed", "regular king", "tell me about the king", "more about king room", "king room details", "do you have king", "got a king"],
      responses: ["__room:king__"],
      pageLink: "room-detail.html?room=king",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "What's the price?", "Tell me about the suites"]
    },
    {
      id: "room_standard_queen",
      keywords: ["standard queen", "queen room", "queen size room", "queen bed room", "queen size bed", "queen bed", "single queen", "regular queen", "tell me about the queen", "queen room details", "do you have queen", "got a queen"],
      responses: ["__room:queen__"],
      pageLink: "room-detail.html?room=queen",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "What's the price?", "Tell me about the suites"]
    },
    {
      id: "room_double_queen",
      keywords: ["double queen", "2 queens", "two queens", "twin queen", "two beds", "double bed room", "two double beds", "tell me about double queen", "double queen details"],
      responses: ["__room:queen-double__"],
      pageLink: "room-detail.html?room=queen-double",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "Is there a pool?", "Tell me about the suites"],
      memoryUpdate: () => { memory.groupSize = 4; }
    },
    {
      id: "room_ada",
      keywords: ["ada room", "accessible room", "wheelchair accessible", "handicap room", "disability room", "accessible suite", "mobility room", "tell me about the ada", "ada room details"],
      responses: ["__room:ada__"],
      pageLink: "room-detail.html?room=ada",
      pageLinkLabel: "Room details",
      quickReplies: ["How do I book?", "What's your phone number?"]
    },

    // ── Room suggestions by group / budget ──
    {
      id: "room_for_couple",
      keywords: ["room for 2", "room for two", "for 2 people", "two people", "2 people", "just the two of us", "for a couple", "couples room", "romantic room", "honeymoon", "anniversary", "me and my partner", "just us two"],
      responses: [
        "Great options for two:\n\n• Standard Queen — comfortable and affordable\n• Standard King — a bit more bed space\n• Deluxe King Suite — king bed, private patio, in-room jacuzzi\n• Deluxe King Suite with Kitchen — adds a fireplace and full kitchen\n\nFor something romantic, the Deluxe King Suite is a real favorite.",
        "For two people we have a few good fits:\n\n• Standard Queen or King — clean, practical, great value\n• Deluxe King Suite — upgraded room with jacuzzi and private patio\n• Deluxe King Suite with Kitchen — fireplace, jacuzzi, full kitchen\n\nWant more details on any of these?"
      ],
      quickReplies: ["Tell me about the Deluxe Suite", "Tell me about the Standard King", "How do I book?"]
    },
    {
      id: "room_for_group",
      keywords: ["room for 3", "room for 4", "room for four", "room for three", "3 people", "4 people", "three people", "four people", "family room", "for the family", "with kids", "with children", "family trip", "family vacation", "group of 4", "group of four"],
      responses: [
        "For families or groups of 3–4, here are your best fits:\n\n• Double Queen — 2 queen beds, sleeps 4, great value\n• 2-Room Suite with Kitchen — separate living room, 2 queens, full kitchen, sleeps 4\n• Deluxe King Suite with Kitchen — king + queen, fireplace, jacuzzi, sleeps 4\n\nThe 2-Room Suite is a favorite for families — the separate living room makes a big difference.",
        "If you need space for 3–4 people:\n\n• Double Queen — two beds, sleeps 4, practical choice\n• 2-Room Suite with Kitchen — two-room layout, kitchen, great for longer stays\n• Deluxe King Suite with Kitchen — king + queen bed, jacuzzi, fireplace, full kitchen\n\nWhat matters most — extra space, a kitchen, or budget?"
      ],
      quickReplies: ["Tell me about the 2-Room Suite", "Tell me about Double Queen", "Is there a pool?"],
      memoryUpdate: () => { memory.hasKids = true; memory.groupSize = 4; }
    },
    {
      id: "room_cheap",
      keywords: ["cheapest room", "cheapest option", "most affordable", "budget room", "budget option", "cheap room", "inexpensive", "on a budget", "best value room", "affordable room", "value room", "save money on room", "low cost room"],
      responses: [
        "Our most affordable options:\n\n• Standard Queen — great value for solo travelers or couples\n• Standard King — same price range, bigger bed\n• Double Queen — best value if you need space for 3–4\n\nAll include free Wi-Fi, parking, flat screen TV, microwave, and fridge.",
        "Looking for value? The standard rooms are your best bet:\n\n• Standard Queen — comfortable, all the essentials\n• Standard King — a bit more space with a king bed\n• Double Queen — fits up to 4, solid deal for groups\n\nCheck availability for exact rates on your dates."
      ],
      quickReplies: ["Tell me about the Standard Queen", "Tell me about the Standard King", "How do I book?"]
    },
    {
      id: "room_premium",
      keywords: ["best room", "nicest room", "most luxurious", "luxury room", "premium room", "top room", "most expensive room", "special room", "upgrade room", "fancy room", "suite options", "most exclusive room", "treat myself"],
      responses: [
        "Our best rooms are the suites:\n\n• Deluxe King Suite — king bed, private patio, in-room jacuzzi\n• Deluxe King Suite with Kitchen — adds a fireplace, full kitchen, sleeps 4\n• 2-Room Suite with Kitchen — separate living room, 2 queens, full kitchen\n\nThe Deluxe King Suite with Kitchen is our flagship — absolutely worth it for a special stay.",
        "Top of the range — the suites:\n\n• Deluxe King Suite — jacuzzi, private patio, upgraded finishes\n• Deluxe King Suite with Kitchen — fireplace, jacuzzi, full kitchen, sleeps 4\n• 2-Room Suite — two-room layout, kitchen, great for longer stays\n\nWant details on any of these?"
      ],
      quickReplies: ["Tell me about the Deluxe Suite", "Tell me about the Kitchen Suite", "How do I book?"]
    },

    // ── Amenities ──
    {
      id: "pool",
      keywords: [
        "pool", "swimming", "swim", "outdoor pool", "swimming pool", "pool open",
        "is there a pool", "do you have a pool", "got a pool", "pool available",
        "can we swim", "can i swim", "pool hours", "when does the pool open",
        "when does pool close", "pool closed", "use the pool", "pool access",
        "swimming facility", "any pool", "pool on site", "pool onsite",
        "pool at the motel", "pool at the hotel"
      ],
      responses: ["__pool__"],
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities & facilities",
      quickReplies: ["Is parking free?", "What are check-in times?"]
    },
    {
      id: "pool_heated",
      keywords: ["heated pool", "is the pool heated", "is pool heated", "does the pool have heat", "warm pool", "pool warm", "heated swimming"],
      responses: [
        "The outdoor pool isn't heated — it's still a great dip on warm North County days. Hours are typically 8:30 AM – 9:00 PM daily (see FAQs for the official wording).",
        "No heater on the pool — it's a classic outdoor setup. Open daily 8:30 AM – 9:00 PM. Perfect after a Safari Park run when the sun's out!",
        "Not heated, just refreshing 😊 Daily hours 8:30 AM – 9:00 PM. Want the full amenities rundown?"
      ],
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs — pool & facilities",
      quickReplies: ["Is there a pool right now?", "What else is on-site?", "How do I book?"]
    },
    {
      id: "parking",
      keywords: [
        "parking", "park my car", "car park", "vehicle", "free parking",
        "where to park", "can i park", "parking lot", "parking space",
        "is parking free", "do you have parking", "got parking",
        "park outside", "park on site", "park at the hotel", "park there",
        "is there parking", "parking included", "parking available",
        "bring my car", "drive there", "park my truck", "park my van"
      ],
      responses: [
        "Parking is completely free — on-site, no charge, no hassle.",
        "Yep, free parking right on the property. No need to worry about that.",
        "Free on-site parking for all guests. Just pull straight in."
      ],
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities & facilities",
      quickReplies: ["Is Wi-Fi free?", "What are check-in times?"]
    },
    {
      id: "wifi",
      keywords: [
        "wifi", "wi-fi", "internet", "wireless", "connection", "online", "network",
        "is there wifi", "do you have wifi", "got wifi", "wifi available",
        "is wifi free", "free wifi", "wifi password", "wifi code",
        "is internet free", "free internet", "internet access",
        "is there internet", "get online", "work from room", "stream",
        "fast internet", "good wifi", "wifi speed", "wifi here"
      ],
      responses: [
        "Free Wi-Fi in all rooms — fast enough for streaming, working, or video calls.",
        "Yes, free Wi-Fi throughout. It's included in every room, no codes or extra charges.",
        "Wi-Fi is free and included for all guests. Works well in every room."
      ],
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities & facilities",
      quickReplies: ["Is parking free?", "Is there a pool?"]
    },
    {
      id: "transit_escondido",
      keywords: [
        "trolley",
        "sprinter",
        "nctd",
        "coaster",
        "breeze bus",
        "escondido transit",
        "transit center",
        "bus",
        "buses",
        "light rail",
        "public transit",
        "public transportation",
        "get there by train",
        "without a car",
        "bus to escondido",
        "bus from",
        "local bus",
        "by trolley",
        "take the train",
      ],
      responses: [
        "The Sprinter (NCTD light rail) runs between Oceanside and Escondido — get off at Escondido Transit Center. From there, hop a Breeze bus toward South Escondido Boulevard or use a quick rideshare/taxi. From the coast, Coaster to Oceanside then transfer to the Sprinter works well. Full step-by-step is on our Directions page.",
        "From transit: ride the Sprinter to the Escondido Transit Center, then Breeze bus or rideshare south toward S. Escondido Blvd. Coastal riders often take the Coaster to Oceanside, then the Sprinter east — see Directions for detail.",
      ],
      pageLink: "directions.html",
      pageLinkLabel: "Directions — trolley & buses",
      quickReplies: ["Where are you located?", "From San Diego airport?", "Is parking free?", "How do I book?"],
    },
    {
      id: "amenities",
      keywords: [
        "amenity",
        "amenities",
        "on-site facilities",
        "on site facilities",
        "hotel facilities",
        "what's included",
        "what s included",
        "whats included",
        "included",
        "features",
        "what do you have",
        "what do rooms include",
      ],
      responses: [
        "Every room: free Wi-Fi, free parking, flat screen TV, microwave, and fridge. Plus a pool for all guests. Suites add full kitchens, jacuzzis, fireplaces, and more.",
        "Standard in every room: free Wi-Fi, free parking, TV, microwave, refrigerator. Plus a pool on-site. Upgrade to a suite for kitchens, jacuzzis, and extra space.",
        "The basics: Wi-Fi, parking, TV, microwave, fridge. Our suites take it further with full kitchens, jacuzzis, fireplaces, and private patios."
      ],
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities & facilities",
      quickReplies: ["Is there a pool?", "Tell me about the suites", "What's the pricing?"]
    },
    {
      id: "tv",
      keywords: ["tv", "television", "netflix", "streaming", "cable", "channels", "hulu", "watch"],
      responses: [
        "Every room has a flat screen TV with standard cable. You can also log into your own Netflix, Hulu, etc.",
        "Flat screen TVs in all rooms — cable included, and use your own streaming accounts.",
        "All rooms have flat screen TVs. Good cable lineup and smart TV for your streaming apps."
      ],
      quickReplies: ["Is Wi-Fi free?", "What else is included?"]
    },
    {
      id: "fireplace",
      keywords: ["fireplace", "fire place", "cozy", "warm"],
      responses: [
        "The fireplace is in our Deluxe King Suite with Kitchen — a really nice touch, especially on cooler evenings.",
        "Only the Deluxe King Suite with Kitchen has a fireplace. Makes the room feel really cozy.",
        "The fireplace is one of the highlights of our Deluxe King Suite with Kitchen. Great for a romantic stay."
      ],
      quickReplies: ["Tell me about that suite", "How do I book?"]
    },
    {
      id: "patio",
      keywords: ["patio", "outdoor", "outside", "balcony", "terrace", "garden"],
      responses: [
        "The Deluxe King Suite has a private outdoor patio — great for fresh air without leaving your room.",
        "Private outdoor patio is a feature of our Deluxe King Suite. Nice spot to sit out morning or evening.",
        "If you want outdoor space, the Deluxe King Suite has a private patio. A quiet spot all to yourself."
      ],
      quickReplies: ["Tell me about that suite", "How do I book?"]
    },

    // ── Check-in / out ──
    {
      id: "checkin",
      keywords: [
        "check in", "check-in", "checkin", "arrive", "arrival", "early check in", "early checkin",
        "what time is check in", "when can i arrive", "when do you open for check in",
        "what time can i get in", "what time can i check in", "what time i can check in",
        "until what time i can check in", "until what time can i check in", "until what time",
        "how late can i check in", "latest check in", "latest check-in", "how late check in",
        "what time check in",
        "earliest check in", "time of check in", "when is check in",
        "can i arrive early", "early arrival", "get my room early", "room ready time"
      ],
      responses: [
        "Check-in starts at " + CHECKIN + ". Arriving earlier? Give us a call at " + PHONE + " and we'll see what we can do.",
        "Standard check-in is " + CHECKIN + ". Early check-in depends on availability — worth calling ahead at " + PHONE + " if needed.",
        "You can check in from " + CHECKIN + ". Need to get in earlier? Call us at " + PHONE + " and we'll try our best."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["What time is check-out?", "What's your phone number?"]
    },
    {
      id: "checkout",
      keywords: [
        "check out", "check-out", "checkout", "leave", "departure", "late check out", "late checkout",
        "what time is check out", "when do i leave", "when do i check out",
        "what time to leave", "when to leave", "time to leave",
        "what time checkout", "late checkout", "can i stay later",
        "extend my stay", "leave later", "what time must i leave"
      ],
      responses: [
        "Check-out is at " + CHECKOUT + ". Late check-out may be possible — just ask at the front desk.",
        CHECKOUT + " is standard check-out. Need a bit more time? Let us know the evening before.",
        "We ask guests to check out by " + CHECKOUT + ". Late check-out requests are handled case by case."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["What time is check-in?", "How do I contact you?"]
    },

    // ── Location & directions ──
    {
      id: "local_time",
      keywords: [
        "what time is it",
        "what time is it now",
        "current time",
        "local time",
        "time there",
        "time in escondido",
        "time now",
        "do you know what time"
      ],
      responses: ["__time__"],
      quickReplies: ["Is the pool open now?", "Check-in times", "Where are you located?"]
    },
    {
      id: "location",
      keywords: ["location", "where are you", "address", "directions", "find you", "located", "escondido", "near i-15", "i-15", "freeway", "how to get there"],
      responses: [
        "We're at 2336 S. Escondido Blvd, Escondido, CA 92025 — right off I-15, easy to reach from anywhere in San Diego County.",
        "Our address is 2336 S. Escondido Blvd, Escondido, CA. Very convenient near I-15 in North County San Diego.",
        "Find us at 2336 S. Escondido Blvd, Escondido, CA 92025. Close to I-15 — great base for exploring the county."
      ],
      quickReplies: ["Directions from LA", "Directions from San Diego", "How far is the Safari Park?"]
    },
    {
      id: "directions_la",
      keywords: ["from los angeles", "from la", "from los angeles", "coming from la", "coming from los angeles", "driving from la", "from l.a"],
      responses: [
        "From LA it's about 90 miles — roughly 1.5 hours depending on traffic. Take I-15 South toward San Diego, exit at El Norte Parkway or Valley Pkwy in Escondido, then follow to S. Escondido Blvd. Easy drive!",
        "From Los Angeles, take I-15 South all the way to Escondido — about 90 miles, roughly 1.5 hrs. Exit at Valley Pkwy and head south to 2336 S. Escondido Blvd."
      ],
      quickReplies: ["Where are you located?", "Is parking free?", "How do I book?"]
    },
    {
      id: "directions_sd",
      keywords: ["from san diego", "coming from san diego", "driving from san diego", "from downtown san diego"],
      responses: [
        "From downtown San Diego, take I-15 North about 30 miles — roughly 30–35 minutes. Exit at Valley Pkwy in Escondido and head south to 2336 S. Escondido Blvd. Very straightforward.",
        "Heading up from San Diego? I-15 North, about 30 minutes. Exit Valley Pkwy in Escondido, head south to S. Escondido Blvd. You'll be here in no time."
      ],
      quickReplies: ["Is parking free?", "What are check-in times?", "How do I book?"]
    },
    {
      id: "directions_san_airport",
      keywords: ["from san diego airport", "from san diego international", "from san airport", "flying into san diego", "landing in san diego", "san airport to hotel", "san airport to escondido", "san to escondido", "from terminal san diego"],
      responses: [
        "From San Diego International (SAN), take CA-163 North to I-15 North toward Escondido — usually about 40–45 minutes depending on traffic. In Escondido, exit at 9th Avenue, Centre City Parkway, or Valley Parkway, then head south on South Escondido Boulevard to 2336. Tap our Directions page for a map view.",
        "Flying into SAN? Grab a rideshare or rental, then I-15 North roughly 35–45 minutes to Escondido. Near town, use 9th Ave / Centre City Pkwy / Valley Pkwy exits, then south on S. Escondido Blvd. No shuttle here, so rideshare or car is easiest."
      ],
      pageLink: "directions.html",
      pageLinkLabel: "Directions & map",
      quickReplies: ["Nearest airport?", "Is parking free?", "How do I book?"]
    },
    {
      id: "directions_temecula",
      keywords: ["from temecula", "from riverside", "from orange county", "from oc", "from irvine", "from anaheim"],
      responses: [
        "From Temecula or the Inland Empire, take I-15 South — we're about 30–40 minutes south. Exit at Valley Pkwy or El Norte Pkwy in Escondido, follow to S. Escondido Blvd. Easy drive.",
        "From Orange County or Riverside, head south on I-15 — Escondido is about 45–60 minutes depending on where you're coming from. Exit Valley Pkwy."
      ],
      quickReplies: ["Where are you located?", "Is parking free?", "How do I book?"]
    },

    // ── Nearby attractions ──
    {
      id: "safari_park",
      keywords: ["safari park", "safari", "zoo", "san diego zoo", "wild animal park", "wildlife", "animals"],
      responses: [
        "The San Diego Zoo Safari Park is about 10–15 minutes from us. One of the closest hotels to it — super convenient if that's why you're visiting.",
        "We're really close to the Safari Park — roughly 10 minutes by car. A lot of guests stay with us specifically for that.",
        "Safari Park is about 10–15 minutes away. It's one of the main reasons guests choose us — great location and great value."
      ],
      quickReplies: ["How far is the beach?", "How far is downtown San Diego?", "How do I book?"],
      memoryUpdate: () => { memory.mentionedSafariPark = true; }
    },
    {
      id: "san_diego",
      keywords: ["san diego", "downtown san diego", "downtown", "city center", "gaslamp"],
      responses: [
        "Downtown San Diego is about 30–35 minutes south on I-15. Easy highway drive.",
        "We're in North County so downtown is around 30 minutes away — close enough for a great day trip.",
        "About a 30-minute drive down I-15 to downtown San Diego. Straightforward highway access."
      ],
      quickReplies: ["How far is the beach?", "How far is the Safari Park?"]
    },
    {
      id: "beach",
      keywords: ["beach", "ocean", "sea", "coast", "coastal", "oceanside", "carlsbad", "encinitas", "waves", "sand"],
      responses: [
        "We're inland in Escondido, so nearest beaches are about 40–50 minutes west. Oceanside is closest, around 40 minutes. Great for a day trip.",
        "Closest beaches are about 40 minutes away — Oceanside and Carlsbad are the popular ones. Very doable as a day trip.",
        "About 40–45 minutes to the coast. Oceanside Beach is your nearest option. Worth the drive."
      ],
      quickReplies: ["How far is the Safari Park?", "How far is downtown San Diego?"]
    },
    {
      id: "seaworld",
      keywords: ["seaworld", "sea world", "legoland", "aquarium", "theme park", "amusement park"],
      responses: [
        "SeaWorld San Diego is about 40 minutes south on I-15. Legoland in Carlsbad is around 35 minutes west. Both easy day trips.",
        "SeaWorld is roughly 40 minutes from us. Legoland Carlsbad is about 35 minutes if you've got kids."
      ],
      quickReplies: ["How far is the Safari Park?", "How far is San Diego?"]
    },
    {
      id: "old_town",
      keywords: ["old town", "old town san diego", "historic", "history", "mission"],
      responses: [
        "Old Town San Diego is about 30 minutes south — just off I-15. Worth a visit for history and local culture.",
        "Old Town is about 30 minutes away. Easy drive and a great stop for history, food, and culture."
      ],
      quickReplies: ["How far is downtown San Diego?", "How far is the beach?"]
    },
    {
      id: "stone_brewing",
      keywords: ["stone brewing", "stone brewery", "stone bistro", "craft beer", "brewery", "breweries nearby"],
      responses: [
        "Stone Brewing World Bistro & Gardens is 5.4 miles away — great food, incredible craft beer, and a beautiful outdoor space. Highly recommended.",
        "Stone Brewing is about 5.4 miles from us — one of the best craft beer spots in SoCal. Food is excellent too.",
        "Stone Brewing World Bistro is a must if you like craft beer. About 5 miles away, gorgeous setting."
      ],
      quickReplies: ["What's nearby to eat?", "Things to do nearby", "How do I book?"]
    },
    {
      id: "dixon_lake",
      keywords: ["dixon lake", "dixon lake park", "lake nearby", "fishing", "hiking escondido", "trails nearby", "outdoor escondido"],
      responses: [
        "Dixon Lake is 6.5 miles away — scenic trails, fishing, and a really peaceful spot. Great for an easy outdoor morning.",
        "Dixon Lake Recreation Area is about 6.5 miles from us. Nice trails and fishing — a local favorite for an outdoor break.",
        "For outdoor time, Dixon Lake (6.5 mi) is a great easy option — trails, lake, fishing. Daley Ranch is also close at 8 miles for more serious hiking."
      ],
      quickReplies: ["How far is the Safari Park?", "Things to do nearby"]
    },
    {
      id: "daley_ranch",
      keywords: ["daley ranch", "mountain biking", "hiking", "trails", "nature", "outdoors", "outdoor activities"],
      responses: [
        "Daley Ranch is 8 miles away — one of the best spots for hiking and mountain biking in North County. Over 3,000 acres of open space.",
        "For hiking and biking, Daley Ranch (8 mi) is fantastic — lots of trails and great views. Dixon Lake (6.5 mi) is another solid option for a lighter hike.",
        "Daley Ranch is 8 miles from us — great hiking and mountain biking trails in a big open space preserve."
      ],
      quickReplies: ["How far is the Safari Park?", "Things to do nearby"]
    },
    {
      id: "downtown_escondido",
      keywords: ["downtown escondido", "grand avenue", "escondido downtown", "escondido shops", "escondido restaurants", "arts center", "california center for the arts", "escondido nightlife"],
      responses: [
        "Downtown Escondido is just 2.7 miles away — Grand Avenue has restaurants, shops, coffee, and nightlife. The California Center for the Arts is 3.7 miles away for shows and events.",
        "Grand Avenue in downtown Escondido is about 2.7 miles — walkable area with dining, bars, and local shops. Great for an evening out. The Arts Center hosts concerts and events too.",
        "Downtown Escondido (Grand Ave) is 2.7 mi — solid dining and bar scene, local shops. California Center for the Arts is nearby if you want a show or event."
      ],
      quickReplies: ["What's nearby to eat?", "Things to do nearby", "How do I book?"]
    },
    {
      id: "farmers_market",
      keywords: ["farmers market", "farmers market escondido", "local market", "fresh produce", "saturday market", "market"],
      responses: [
        "The Escondido Farmers Market is 2.8 miles away — fresh local produce, food vendors, and a great Saturday morning vibe.",
        "Escondido Farmers Market is about 2.8 miles from us. Great spot for fresh local food and a taste of the community."
      ],
      quickReplies: ["What else is nearby?", "Things to do nearby"]
    },
    {
      id: "winery",
      keywords: ["winery", "wine", "vineyard", "temecula wine", "wine tasting", "bernardo winery"],
      responses: [
        "Temecula wine country is 30–40 minutes north on I-15 — great half-day trip. Bernardo Winery is closer at 11.5 miles if you want something quicker.",
        "Temecula Valley wine country is 30–35 minutes north — lots of excellent wineries. Bernardo Winery (11.5 mi) is a closer option if you don't want to drive as far.",
        "Two good options: Bernardo Winery is 11.5 miles away, or drive 30–40 min north to Temecula wine country for a full wine-tasting experience."
      ],
      quickReplies: ["How far is the Safari Park?", "Things to do nearby", "How do I book?"]
    },

    // ── Things to do ──
    {
      id: "things_to_do",
      keywords: ["things to do", "what to do", "activities", "attractions", "places to visit", "sightseeing", "explore", "what's nearby", "whats nearby", "what's around", "nearby places", "what's there to do"],
      responses: ["__things_to_do__"],
      quickReplies: ["How far is the Safari Park?", "What's nearby to eat?", "How do I book?"]
    },
    {
      id: "how_long",
      keywords: ["how long should i stay", "how many nights", "how long to stay", "how many days", "worth staying", "enough time", "recommend stay"],
      responses: [
        "Depends on what you want to do! For just the Safari Park, a night or two is perfect. If you want to do the Safari Park, a beach day, and some downtown San Diego — 3 nights is a great sweet spot. Want to do it all? 4–5 nights.",
        "For Safari Park only — 1–2 nights. If you're exploring North County, beaches, and maybe some wine tasting in Temecula — 3–4 nights is ideal. We're a great central base for all of it.",
        "If you're packing in the Safari Park, beach, downtown San Diego, and some Escondido dining — I'd say 3 nights minimum. Enough to explore without rushing."
      ],
      quickReplies: ["How far is the Safari Park?", "What's nearby to eat?", "How do I book?"]
    },
    {
      id: "best_time",
      keywords: ["best time to visit", "best time to come", "when to visit", "when to come", "best season", "when is best", "good time to visit"],
      responses: [
        "Escondido has great weather pretty much year-round — Southern California sunshine most days. Spring (March–May) and fall (Sept–Nov) are the sweet spots: mild temps, smaller crowds at the Safari Park, and beautiful scenery. Summers are warm and busy. Winter is mild — rarely below 50°F.",
        "Honestly anytime is good here — it's San Diego County. But if you want the best combo of weather + fewer crowds, April–May or September–October are ideal. The Safari Park is stunning in spring.",
        "Spring and fall are the best. Temps in the 70s, less crowded, beautiful. Summers are warm and popular but busier. Winter is mild and quiet — sometimes a good deal too."
      ],
      quickReplies: ["What's the weather like?", "How do I book?", "Things to do nearby"]
    },

    // ── Food nearby ──
    {
      id: "food_nearby",
      keywords: [
        "food",
        "eat",
        "restaurant",
        "restaurants",
        "dining",
        "nearby food",
        "nearby to eat",
        "what to eat",
        "where to eat",
        "places to eat",
        "good food",
        "breakfast nearby",
        "lunch nearby",
        "dinner nearby",
        "coffee nearby",
        "cafe",
        "somewhere to eat",
        "hungry",
        "grab a bite"
      ],
      responses: [
        "Escondido has a solid food scene! Some popular spots near us: Stone Brewing World Bistro (great craft beer + food), Cocina del Charro (classic Mexican — a local favorite), The Crack Shack (chicken sandwiches, super popular), and Bear on the Square for brunch. Anything specific you're in the mood for?",
        "Plenty of options nearby! For Mexican food, Cocina del Charro is a local institution. For craft beer and great food, Stone Brewing is just a short drive. For something casual, The Crack Shack. Coffee? Mostra Coffee is a local gem.",
        "Great food options around us — Stone Brewing World Bistro for beer and a solid menu, Cocina del Charro for authentic Mexican, Farmer's Table for a farm-to-table vibe, or just explore downtown Escondido's growing food scene. About a 5–10 min drive from the motel.",
        "The full curated list — addresses, miles, and short write-ups — is on our Things to do page. Open the Eats & drinks filter to see food-focused picks first; that’s the same list I’m summarizing from."
      ],
      quickReplies: ["Tell me about kitchen suites", "Food near motel", "How do I book?"],
      pageLink: "things-to-do.html?td-filter=food-drink",
      pageLinkLabel: "Things to do — Eats & drinks"
    },
    {
      id: "breakfast",
      keywords: ["breakfast", "meal", "lunch", "dinner", "on-site food", "room service", "on site dining", "restaurant", "food at hotel", "eat at the hotel", "eat at motel"],
      responses: [
        "We don't have on-site dining, but Escondido has great spots nearby. And our kitchen suites let you cook your own meals if you prefer.",
        "No on-site restaurant, but you're in a good area for food — plenty of restaurants a short drive away. Our kitchen suites are also a great option for cooking in.",
        "There's no breakfast service, but lots of options nearby. If you want to cook in, our suite kitchens are fully stocked."
      ],
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs",
      quickReplies: ["What's nearby to eat?", "Tell me about kitchen suites"]
    },

    // ── Policies ──
    {
      id: "price",
      keywords: [
        "price", "cost", "how much", "rate", "rates", "pricing", "fee", "per night", "nightly", "what does it cost", "how much is a room",
        "room price", "room cost", "room rate", "room fee", "nightly rate",
        "how much to stay", "what do rooms cost", "how much does it cost",
        "what's the price", "whats the price", "cheapest price", "starting price",
        "price range", "cost per night", "how much a night", "how much per night",
        "what are the rates", "what is the rate", "how much for a room",
        "what does a room cost", "price check"
      ],
      responses: [
        "Rates vary by room type and date — best way to see current pricing is on our booking page where you'll get live availability too.",
        "Pricing depends on dates and which room you're looking at. I'd recommend checking our booking page for the most accurate rates.",
        "Room rates change with availability and season. The booking page will show you exactly what's available for your dates."
      ],
      quickReplies: ["Take me to booking", "What rooms do you have?"]
    },
    {
      id: "booking_mistake",
      keywords: [
        "error while booking",
        "mistake while booking",
        "mistake with booking",
        "problem with my booking",
        "problem with my reservation",
        "problem with booking",
        "problem with reservation",
        "wrong booking",
        "wrong reservation",
        "booked the wrong",
        "booked wrong",
        "wrong dates",
        "wrong room booked",
        "accidentally booked",
        "accidental booking",
        "double booking",
        "duplicate reservation",
        "need to fix my booking",
        "fix my booking",
        "fix my reservation",
        "change my booking",
        "change my reservation",
        "modify my booking",
        "modify my reservation",
        "cancel my booking",
        "cancel my reservation",
        "made a mistake",
        "made an error",
        "made error",
        "made mistake",
        "i made a mistake",
        "i made mistake",
        "i made an error",
        "my mistake booking",
        "messed up my booking",
        "messed up booking",
        "booking mistake",
        "reservation mistake",
        "while booking the",
        "while booking a"
      ],
      responses: [
        "If something’s off with a reservation, the fastest help is our front desk — call " +
          PHONE +
          " anytime (24 hours). If you booked through Booking.com or another travel site, you can often change or cancel from your confirmation email when your rate rules allow it; our deposit and cancellation details are on the policies page below.",
        "Sounds frustrating — we can help sort it out. Please call us at " +
          PHONE +
          " so we can look it up with you. For third‑party bookings, changes usually go through the site you used, but we’re still happy to guide you.",
        "For a wrong date, room type, or a booking that doesn’t look right, calling " +
          PHONE +
          " is the surest path — we’re here around the clock. You’ll also find cancellation and deposit rules on our hotel policies page."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["What's your phone number?", "What are check-in times?", "How do I book?"]
    },
    {
      id: "booking",
      keywords: [
        "book",
        "booking",
        "reserve",
        "availability",
        "available",
        "check availability",
        "how to book",
        "make a booking",
        "make a reservation",
        "book a room",
        "book a night",
        "want to book",
        "want to reserve",
        "how do i book",
        "how do i reserve",
        "rooms available",
        "any availability",
        "any rooms available",
        "are there rooms",
        "is there availability",
        "check rooms",
        "can i book",
        "can i reserve",
        "book online",
        "reserve online",
        "room available",
        "take a booking",
        "i want to book",
        "i want to stay"
      ],
      responses: [
        "You can check availability and book directly here: " + BOOKING_URL,
        "To reserve a room, head to our booking page — live availability and rates for your dates: " + BOOKING_URL,
        "Booking is easy — just select your dates and room: " + BOOKING_URL
      ],
      quickReplies: ["What rooms do you have?", "What are check-in times?"]
    },
    {
      id: "special_offer",
      keywords: ["special offer", "discount", "deal", "promo", "promotion", "coupon", "best rate", "best price", "any deals"],
      responses: [
        "Best rates are always on our booking page — that's where you'll see current availability and any seasonal pricing: " + BOOKING_URL,
        "Check our booking page for the latest availability and pricing — booking direct usually gets you the best rate: " + BOOKING_URL
      ],
      quickReplies: ["Take me to booking", "What rooms do you have?"]
    },
    {
      id: "pets",
      keywords: ["pet", "pets", "dog", "cat", "animal", "bring my dog", "pet friendly", "pet policy", "furry", "service animal", "service dog"],
      responses: [
        "We don't allow pets at the property. However, service animals are always welcome — just let us know when you book.",
        "No pets, unfortunately — but service animals are completely welcome. Call us at " + PHONE + " if you have any questions.",
        "Pets aren't permitted, but service animals are always allowed. Any questions, give us a call at " + PHONE + "."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["What's your phone number?", "How do I book?"]
    },
    {
      id: "accessibility",
      keywords: ["accessible", "accessibility", "wheelchair", "disability", "disabled", "ada", "handicap", "roll-in shower", "grab bars", "mobility"],
      responses: [
        "We have ADA accessible rooms in king, queen, and double-queen configurations — grab bars, lowered vanity, lowered light switches, and roll-in showers in select rooms. They’re subject to availability, so mention your needs when you book.",
        "Our accessible rooms are designed with real convenience in mind — grab bars, lowered vanity and switches, roll-in shower options, and your choice of bed configuration — subject to availability.",
        "Yes — dedicated ADA rooms with full accessibility features (king, queen, or double-queen), subject to availability."
      ],
      pageLink: "accessibility.html",
      pageLinkLabel: "Accessibility specs",
      quickReplies: ["How do I book?", "What's your phone number?"]
    },
    {
      id: "smoking",
      keywords: ["smoking", "smoke", "cigarette", "non-smoking", "nonsmoking", "can i smoke"],
      responses: [
        "All our rooms are non-smoking — we keep everything fresh and clean for every guest.",
        "We're a fully non-smoking property throughout.",
        "No smoking in any of the rooms. All rooms are non-smoking."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["What rooms do you have?", "How do I book?"]
    },
    {
      id: "complaint",
      keywords: ["complaint", "complain", "issue", "problem", "not happy", "disappointed", "unhappy", "bad experience", "not satisfied", "dissatisfied"],
      responses: [
        "I'm sorry to hear that — your experience matters to us. The best thing to do is call us directly at " + PHONE + " so our team can address it right away.",
        "That's not the experience we want you to have. Please call us at " + PHONE + " and we'll do our best to make it right.",
        "I'm sorry about that. For anything we can fix, please reach out directly at " + PHONE + " — our team will take care of you."
      ],
      quickReplies: ["What's your phone number?", "How do I contact you?"]
    },
    {
      id: "contact",
      keywords: [
        "contact", "phone", "call", "number", "reach you", "email", "talk to someone", "speak to someone",
        "phone number", "telephone", "call you", "how to contact", "get in touch",
        "talk to a person", "speak to a person", "talk to staff", "speak to staff",
        "real person", "human", "staff contact", "reach the motel",
        "motel phone", "hotel phone", "ring you",
        "whats the number", "what is the number", "your number", "ur number"
      ],
      responses: [
        "You can reach us at " + PHONE + ". Our front desk team is happy to help with anything.",
        "Give us a call at " + PHONE + " — we're here to help.",
        "Phone number: " + PHONE + ". Best way to reach us directly."
      ],
      quickReplies: ["How do I book?", "What are check-in times?"]
    },

    {
      id: "air_conditioning",
      keywords: ["air conditioning", "ac", "a/c", "air con", "heating", "heat", "climate control", "temperature control", "is it air conditioned", "hot in room", "cold in room", "thermostat"],
      responses: [
        "Yes — every room has individual climate control. Set the AC or heat exactly how you like it.",
        "All rooms have their own AC and heating. Full climate control, totally up to you.",
        "Individual climate control in every room — so you're comfortable whether it's summer or winter."
      ],
      quickReplies: ["What else is included?", "What rooms do you have?"]
    },
    {
      id: "hbo_showtime",
      keywords: ["hbo", "showtime", "premium channels", "movie channels", "what channels", "cable tv", "tv channels", "movies on tv", "max", "streaming channels"],
      responses: [
        "All rooms have flat screen TVs with HBO, Showtime, and standard cable included. You can also log into Netflix, Hulu, or any streaming app.",
        "HBO and Showtime are included in every room — plus cable and smart TV so you can use your own streaming accounts.",
        "Premium TV in all rooms: HBO, Showtime, cable, and smart TV access for Netflix/Hulu/etc."
      ],
      quickReplies: ["Is Wi-Fi free?", "What else is included?"]
    },
    {
      id: "front_desk_hours",
      keywords: ["front desk", "reception", "24 hour", "24/7", "always open", "someone there", "is anyone available", "open all night", "staff hours", "late arrival", "early arrival"],
      responses: [
        "Our front desk is staffed 24 hours — someone is always there, day or night. Late arrivals are no problem.",
        "Yes, 24/7 front desk. Arrive whenever — we'll be here.",
        "The front desk never closes. Come in at midnight or 5 AM — someone will be there to help."
      ],
      quickReplies: ["What time is check-in?", "What's your phone number?"]
    },
    {
      id: "ev_charging",
      keywords: ["ev charging", "electric car", "electric vehicle", "tesla charging", "charging station", "ev station", "charge my car", "ev plug", "plug in my car"],
      responses: [
        "We don’t have EV chargers on-site, but there’s public fast charging about 10 minutes away at 110 W El Norte Pkwy in Escondido — check your car’s app for live stalls and plug type. Parking at the motel is free.",
        "No on-property EV charging. Guests often use the public fast chargers at 110 W El Norte Pkwy, Escondido (a short drive). Confirm availability in PlugShare or your EV network app before you head over.",
      ],
      quickReplies: ["Is parking free?", "How do I book?"]
    },
    {
      id: "packages_mail",
      keywords: ["package", "parcel", "mail delivery", "delivery", "package delivery", "receive a package", "can i get mail", "amazon delivery", "package to hotel", "ship to the hotel"],
      responses: [
        "Package handling may be available for registered guests — call us at " + PHONE + " *before* you ship and share the tracking details so the front desk can plan for it.",
        "We can sometimes accept deliveries for guests, but it's not guaranteed for every situation. Call " + PHONE + " ahead of time with your shipping info — that's the safest route.",
        "If you need something sent to the motel, ring " + PHONE + " first with your reservation and delivery details. Our team will tell you exactly how to label it."
      ],
      quickReplies: ["What's your phone number?", "How do I book?"]
    },
    {
      id: "cancellation",
      keywords: [
        "how do i cancel",
        "how to cancel",
        "how can i cancel",
        "i need to cancel",
        "i want to cancel",
        "need to cancel",
        "cancel the reservation",
        "cancel a reservation",
        "cancel this reservation",
        "cancel my stay",
        "void my reservation",
        "cancel",
        "cancellation",
        "cancel booking",
        "cancel reservation",
        "cancel my booking",
        "cancel my reservation",
        "refund",
        "cancellation policy",
        "if i cancel",
        "can i cancel",
        "cancellation fee",
        "get a refund",
        "non refundable",
        "free cancellation"
      ],
      responses: [
        "Cancellation depends on how you booked — rate rules are shown at booking time. Call us at " +
          PHONE +
          " anytime (24/7) and we’ll walk you through it. If you used Booking.com or another site, you can often cancel or change from your confirmation email when the rate allows — deposit and cancellation details are on our hotel policies page.",
        "For canceling or changing a stay, the fastest help is the front desk at " +
          PHONE +
          " (24 hours). Third‑party bookings usually need to be changed in that app or email first; our policies page spells out deposits and cancellation.",
        "Our team can look up your reservation and explain your options — call " +
          PHONE +
          ". You’ll also find the official cancellation and deposit wording on the hotel policies page."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["What's your phone number?", "What are check-in times?", "How do I book?"]
    },
    {
      id: "payment",
      keywords: ["payment", "pay", "how to pay", "credit card", "cash", "debit", "accepted payment", "payment method", "do you take cash", "do you take card", "amex", "american express", "visa", "mastercard"],
      responses: [
        "We accept Visa, Mastercard, American Express, Discover, and cash. A refundable $100 security deposit is required at check-in.",
        "Payment options: Visa, Mastercard, Amex, Discover, and cash. Just note there's a $100 refundable security deposit at check-in.",
        "All major cards accepted — Visa, MC, Amex, Discover — plus cash. There's a $100 security deposit collected at check-in, fully refundable."
      ],
      quickReplies: ["What's the security deposit?", "How do I book?"]
    },
    {
      id: "airport",
      keywords: ["airport", "san diego airport", "palomar airport", "mcclellan", "fly in", "flying in", "from the airport", "nearest airport", "how far from airport", "airport shuttle", "shuttle"],
      responses: [
        "The closest airport is McClellan-Palomar Airport (CLD) in Carlsbad — about 30 minutes west. San Diego International (SAN) is about 40 minutes south on I-15. We don't have an airport shuttle, but rideshare and rental cars are easy options.",
        "Nearest airport: McClellan-Palomar (CLD), about 30 minutes away. San Diego International (SAN) is roughly 40 minutes south. No shuttle service, but Uber/Lyft work well from both.",
        "Two airport options: Palomar Airport (CLD) is closest at 30 min, SAN is 40 min south. No airport shuttle — most guests use rideshare or rent a car."
      ],
      quickReplies: ["Is parking free?", "How do I book?", "Where are you located?"]
    },
    {
      id: "deposit",
      keywords: ["deposit", "security deposit", "how much deposit", "refundable deposit", "hold on card", "card hold"],
      responses: [
        "There's a $100 refundable security deposit collected at check-in. It's returned at checkout assuming no damages.",
        "We collect a $100 security deposit at check-in — fully refundable when you check out.",
        "$100 refundable deposit at check-in. Returned at checkout. Standard for all stays."
      ],
      quickReplies: ["What payment do you accept?", "What time is check-in?"]
    },
    {
      id: "age_requirement",
      keywords: ["age requirement", "minimum age", "how old", "do you need id", "id required", "age to check in", "can i check in", "age policy", "18"],
      responses: [
        "Guests must be 18 or older to check in, and a valid photo ID is required at the front desk.",
        "The minimum age to check in is 18. You'll need a valid photo ID — just bring it with you.",
        "18+ to check in, valid photo ID required. Standard policy across all room types."
      ],
      quickReplies: ["What time is check-in?", "How do I book?"]
    },
    {
      id: "gym_fitness",
      keywords: [
        "gym", "fitness", "fitness center", "workout", "exercise", "weights",
        "treadmill", "fitness room", "hotel gym", "is there a gym", "do you have a gym",
        "got a gym", "exercise room", "work out", "running"
      ],
      responses: [
        "We don't have an on-site gym, but Escondido has several fitness centers nearby — just a short drive. The pool is a great way to stay active during your stay!",
        "No fitness center on the property, but you're close to local gyms in Escondido. The pool is available daily 8:30 AM – 9:00 PM if you'd like to move around.",
        "No gym on-site — our focus is on comfortable rooms, the pool, and a relaxed stay. If you need a full workout, there are gyms nearby in Escondido."
      ],
      quickReplies: ["Is there a pool?", "What amenities do you have?", "Things to do nearby"]
    },
    {
      id: "elevator",
      keywords: [
        "elevator", "lift", "stairs", "is there an elevator", "do you have an elevator",
        "got an elevator", "elevator access", "no stairs", "step free", "step-free",
        "floor access", "which floor", "ground floor", "upper floor"
      ],
      responses: [
        "The property doesn't have an elevator — it's a low-rise layout. If you have mobility needs, let us know when you book and we'll place you in a ground-floor room.",
        "No elevator on the property, but we can arrange a ground-floor room if needed. Just mention it when you reserve or call us at " + PHONE + ".",
        "No lift here — it's a single-story or low-rise setup. We're happy to accommodate ground-floor requests. Give us a call at " + PHONE + " and we'll take care of it."
      ],
      quickReplies: ["ADA accessible rooms", "What's your phone number?", "How do I book?"]
    },
    {
      id: "housekeeping",
      keywords: [
        "housekeeping", "cleaning", "clean my room", "room cleaned", "daily cleaning",
        "maid service", "maid", "turndown", "do you clean rooms", "how often cleaned",
        "fresh towels", "change sheets", "linens", "room service cleaning",
        "is housekeeping daily", "do not disturb", "dnd", "trash pickup"
      ],
      responses: [
        "Yes — housekeeping service is available. For daily cleaning, just leave the door hanger out or let the front desk know. If you prefer privacy, we fully respect do-not-disturb.",
        "We offer housekeeping — if you'd like your room freshened up, just let the front desk know and we'll arrange it. We also respect any do-not-disturb preferences.",
        "Housekeeping is available during your stay. Speak to the front desk about your preference — daily service or do-not-disturb, we'll follow your lead."
      ],
      quickReplies: ["What amenities do you have?", "What's your phone number?", "Check-in times"]
    },
    {
      id: "extra_towels",
      keywords: [
        "extra towels", "more towels", "towels", "need towels", "can i get towels",
        "towel", "bath towel", "pool towel", "extra pillows", "extra blanket",
        "more pillows", "more blankets", "pillow", "blanket", "bedding",
        "can i get extra", "need extra"
      ],
      responses: [
        "Absolutely — just call or stop by the front desk and we'll bring extra towels, pillows, or blankets to your room right away.",
        "No problem at all! Extra towels and pillows are available — just ask at the front desk or give us a call at " + PHONE + ".",
        "Of course — extra towels, pillows, or blankets are available on request. Ring the front desk at " + PHONE + " and we'll sort it out."
      ],
      quickReplies: ["What's your phone number?", "What amenities do you have?"]
    },
    {
      id: "room_safe",
      keywords: [
        "safe", "room safe", "in-room safe", "secure valuables", "lock up valuables",
        "safe box", "safety deposit box", "lock my passport", "store valuables",
        "is there a safe", "do you have a safe", "laptop safe", "valuables"
      ],
      responses: [
        "There's no in-room safe on the property. For valuables, the front desk can assist — give us a call at " + PHONE + " and we'll let you know the best options.",
        "We don't have in-room safes, but the front desk team is happy to help secure important items. Reach us at " + PHONE + ".",
        "No room safe available — for important items like passports or laptops, please speak with the front desk at " + PHONE + " and we'll advise."
      ],
      quickReplies: ["What's your phone number?", "Hotel policies", "How do I book?"]
    },
    {
      id: "laundry",
      keywords: ["laundry", "washing machine", "washer", "dryer", "laundry room", "wash clothes", "self service laundry", "coin laundry", "do laundry"],
      responses: [
        "Yes, we have self-service laundry on-site — a convenient option if you're staying a few nights.",
        "We have a self-service laundry facility on the property. Great for longer stays.",
        "On-site self-service laundry is available for all guests."
      ],
      quickReplies: ["Is there a pool?", "What amenities do you have?"]
    },
    {
      id: "hairdryer_iron",
      keywords: ["hairdryer", "hair dryer", "hair drier", "iron", "ironing board", "iron and ironing board", "do you have iron", "do you have hairdryer"],
      responses: [
        "Yes — every room has a hairdryer and an iron with ironing board. All the everyday essentials are covered.",
        "Hairdryers and irons with ironing boards are standard in all rooms.",
        "All rooms come with a hairdryer and iron/ironing board included."
      ],
      quickReplies: ["What else is included?", "What amenities do you have?"]
    },
    {
      id: "coffee",
      keywords: [
        "coffee", "complimentary coffee", "free coffee", "morning coffee", "coffee in office", "where is coffee",
        "is there coffee", "do you have coffee", "got coffee", "grab a coffee",
        "coffee available", "coffee 24 hours", "late night coffee", "lobby coffee"
      ],
      responses: [
        "Yes — complimentary coffee is available 24 hours in the lobby. Grab a cup on your way out or when you roll in late.",
        "Free coffee in the lobby, available around the clock. Whether you're heading out early or checking in late, it's always there.",
        "We have complimentary 24-hour coffee in the lobby — no waiting until morning, it's there whenever you need it."
      ],
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities",
      quickReplies: ["What time is check-in?", "What amenities do you have?"]
    },
    {
      id: "business_travel",
      keywords: ["business trip", "work trip", "business travel", "business center", "fax", "copy", "print", "working remotely", "work from hotel"],
      responses: [
        "We're well set up for business travelers — free Wi-Fi in all rooms, a business center with copy and fax services, HBO and Showtime, and easy I-15 access. Quiet, comfortable rooms to come back to after a long day.",
        "Business-friendly amenities: free Wi-Fi, copy and fax service, HBO/Showtime in all rooms, free parking, and 24-hour front desk. Right off I-15 for easy access around the county.",
        "For work trips: fast Wi-Fi, business center (copy/fax), HBO and Showtime, free parking, and 24/7 front desk. Convenient I-15 location for getting around San Diego County."
      ],
      quickReplies: ["Is Wi-Fi fast?", "Where are you located?", "How do I book?"]
    },
    {
      id: "transit",
      keywords: ["public transit", "bus", "train", "light rail", "sprinter", "how to get there without car", "no car", "public transport", "uber", "lyft", "rideshare", "taxi"],
      responses: [
        "By public transit: take the NCTD Sprinter light rail to Escondido Transit Center, then a Breeze bus or rideshare south to the motel. Rideshare (Uber/Lyft) works great too.",
        "The NCTD Sprinter connects to Escondido Transit Center — from there it's a short bus or rideshare to us. Most guests without a car use Uber or Lyft.",
        "Transit option: Sprinter light rail to Escondido, then Breeze bus or rideshare. Or just Uber/Lyft directly — it's easy from most of San Diego County."
      ],
      quickReplies: ["Where are you located?", "Is parking free?", "How do I book?"]
    },
    {
      id: "connecting_rooms",
      keywords: ["connecting rooms", "adjoining rooms", "rooms next to each other", "rooms together", "side by side rooms", "two rooms connected"],
      responses: [
        "Connecting rooms depend on availability and can't be guaranteed — call " + PHONE + " ASAP with your dates so the front desk can note the request on your reservation.",
        "We're happy to *try* to place you in connecting rooms when the layout allows it, but it's never promised. Reach out to " + PHONE + " before you arrive.",
        "Think of connecting rooms as a request, not a guarantee. The team at " + PHONE + " will walk you through what's possible for your stay dates."
      ],
      quickReplies: ["What's your phone number?", "What rooms do you have?"]
    },
    {
      id: "wake_up",
      keywords: ["wake up call", "wake-up call", "alarm", "wake up service", "morning wake up"],
      responses: [
        "Yes, we offer wake-up calls — just request one at the front desk when you check in.",
        "Wake-up calls are available. Let the front desk know your preferred time at check-in.",
        "No problem — wake-up calls are available. Just ask at the front desk."
      ],
      quickReplies: ["What time is check-in?", "What amenities do you have?"]
    },
    {
      id: "pillowtop",
      keywords: ["mattress", "bed quality", "pillowtop", "pillow top", "comfortable bed", "how comfortable", "soft bed", "firm bed", "premium bedding"],
      responses: [
        "All our beds have pillowtop mattresses — premium bedding for a proper night's sleep.",
        "We use pillowtop mattresses throughout — guests consistently mention how comfortable the beds are.",
        "Pillowtop mattresses in every room. Good sleep is part of the deal."
      ],
      quickReplies: ["What rooms do you have?", "How do I book?"]
    },
    {
      id: "quiet_hours",
      keywords: ["quiet hours", "noise", "quiet time", "how noisy", "is it quiet", "noisy area", "how loud"],
      responses: [
        "We keep things calm and comfortable for all guests. If anything's bothering you during your stay, just let the front desk know at " + PHONE + ".",
        "The property is generally quiet — we aim to keep it that way for everyone. Any noise concerns, give us a call at " + PHONE + "."
      ],
      quickReplies: ["What's your phone number?", "How do I book?"]
    },
    {
      id: "guest_love",
      keywords: ["what do guests love", "what people love", "why stay here", "why do guests stay", "reviews say", "what is the motel known for", "is it good"],
      responses: [
        "Guests usually rave about spotless, comfy rooms, genuinely friendly service, and a relaxed vibe — we're an easy launch point for the Safari Park and I-15 trips.",
        "Top mentions: clean rooms, welcoming staff, quiet nights, and killer North County access. Check the FAQs for the exact wording we publish.",
        "Expect friendly front-desk energy, comfortable beds (pillow tops!), and none of the big-chain noise — just a mellow Escondido base camp."
      ],
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs — guest experience",
      quickReplies: ["What rooms do you have?", "How do I book?", "Things to do nearby"]
    },
    {
      id: "family_friendly",
      keywords: ["family friendly", "kid friendly", "good for families", "traveling with kids", "children welcome", "babies welcome"],
      responses: [
        "Families are absolutely welcome — children can stay using existing bedding, and our kitchen suites plus pool make longer visits easy.",
        "Kids love the pool after the Safari Park, and parents love the suites with full kitchens. Request the layout you need when you book.",
        "Totally family friendly. Double queens and two-room kitchen suites are especially popular — I can walk you through either."
      ],
      pageLink: "faqs.html",
      pageLinkLabel: "FAQs — families",
      quickReplies: ["Room for 4 people", "Is there a pool?", "Things to do nearby"]
    },

    // ── Site pages (deep knowledge / same copy as live pages) ──
    {
      id: "site_faqs",
      keywords: ["faq page", "faqs page", "faqs", "read the faq", "read the faqs", "list of questions", "common guest questions", "frequently asked questions page", "your faqs"],
      responses: [
        "Our FAQs spell out check-in/out times, 24/7 desk, ID requirements, downtown distance (~2 miles), Safari Park timing, heated pool (nope!), EV charging (nearest public stations nearby), airport shuttles (not available), packages, deposits, and more.",
        "Everything 'officially short-answer' lives on the FAQs page — it's the quickest way to verify housekeeping, laundry, Wi-Fi, pool hours, pet rules, and payments before you arrive."
      ],
      pageLink: "faqs.html",
      pageLinkLabel: "Open FAQs",
      quickReplies: ["Hotel policies", "Accessibility", "How do I book?"]
    },
    {
      id: "site_policies",
      keywords: ["hotel policies page", "hotel policies", "policy page", "house rules", "motel policies", "fine print", "rules of the hotel", "property policies"],
      responses: [
        "Hotel policies on the site cover arrivals, payments, conduct, lost & found, damage, wildlife reminders — basically the grown-up stuff in plain English.",
        "Need the official policies (deposits, cancellations, property rules)? That's all centralized on the Hotel policies page for easy sharing with travel buddies."
      ],
      pageLink: "hotel-policies.html",
      pageLinkLabel: "Hotel policies",
      quickReplies: ["FAQs", "Pet policy", "How do I book?"]
    },
    {
      id: "site_amenities",
      keywords: ["amenities page", "list of amenities", "what amenities on the website", "facilities page", "pool page", "see amenities"],
      responses: [
        "The Amenities page walks through the pool, laundry, Wi-Fi, parking, in-room comforts, and the overall vibe — great to send folks who want visuals plus words.",
        "If you want the marketing story + photos of our amenities (pool, laundry, room comforts), the dedicated Amenities page is what you're after."
      ],
      pageLink: "amenities.html",
      pageLinkLabel: "Amenities",
      quickReplies: ["Is the pool heated?", "FAQs", "Directions"]
    },
    {
      id: "site_directions",
      keywords: ["directions page", "driving directions page", "how to get there page", "property map", "map page"],
      responses: [
        "The Directions page has hero imagery, narrative routes (by car + Sprinter), a property map, and an embedded Google map — perfect if you're sending a pin to friends.",
        "Car, trolley, or hybrid trip? Directions lays out Escondido routing plus the map embed so you can hand off a link."
      ],
      pageLink: "directions.html",
      pageLinkLabel: "Directions",
      quickReplies: ["From San Diego airport", "Nearest airport?", "Book a room"]
    },
    {
      id: "site_things",
      keywords: ["things to do page", "attractions page", "explore page", "what to do page", "activities page"],
      responses: [
        "The Things to do page curates Escondido + North County picks — Safari Park, breweries, trails, arts, and shopping filters to match your mood.",
        "If you want printable-worthy ideas with distances, start on Things to do — it's built for trip planners."
      ],
      pageLink: "things-to-do.html",
      pageLinkLabel: "Things to do",
      quickReplies: ["How far is Safari Park?", "Stone Brewing", "Book a room"]
    },

    // ── Social wrap-ups ──
    {
      id: "thankyou",
      keywords: ["thank you", "thanks marcos", "thanks so much", "ty", "thx", "much appreciated", "really appreciate", "you're helpful", "you are helpful", "that helped", "perfect thanks", "thanks", "thank", "appreciate", "helpful", "wonderful", "great job", "you rock", "love this", "you're the best", "you are the best"],
      responses: [
        "You’re very welcome! Is there anything else I can help you with?",
        "It’s our pleasure. Please reach out anytime if more questions come up.",
        "Glad to help — I’m here if you think of anything else.",
        "Thank you for your kind words — I’m happy to assist further whenever you need."
      ],
      quickReplies: ["How do I book?", "What's your phone number?"]
    },
    {
      id: "weather",
      keywords: ["weather", "forecast", "temperature", "how hot", "how cold", "raining", "is it raining", "sunny", "climate", "what's the weather", "whats the weather", "weather like", "how is the weather", "weather today", "weather this week"],
      responses: ["__weather__"],
      quickReplies: ["Is the pool open now?", "Things to do nearby", "How do I book?"]
    },
    {
      id: "bye",
      keywords: ["bye", "goodbye", "see you", "later", "take care", "that's all", "thats all", "nothing else", "good night"],
      responses: [
        "Thanks for stopping by! Hope to welcome you at Motel Mediteran soon.",
        "Have a great day! Come back anytime if you have more questions.",
        "Take care! We'd love to have you stay with us — feel free to reach out anytime."
      ]
    }
  ];

  // ── Weather ──────────────────────────────────────────────
  const WEATHER_URL =
    "https://api.open-meteo.com/v1/forecast?latitude=33.1192&longitude=-117.0864" +
    "&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m" +
    "&daily=weathercode,temperature_2m_max,temperature_2m_min" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=4";

  const WX_CODES = {
    0: "Clear skies ☀️", 1: "Mostly clear ☀️", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
    45: "Foggy 🌫️", 48: "Foggy 🌫️",
    51: "Light drizzle 🌦️", 53: "Drizzle 🌦️", 55: "Heavy drizzle 🌦️",
    61: "Light rain 🌧️", 63: "Rain 🌧️", 65: "Heavy rain 🌧️",
    71: "Light snow 🌨️", 73: "Snow 🌨️", 75: "Heavy snow 🌨️",
    80: "Light showers 🌦️", 81: "Showers 🌦️", 82: "Heavy showers 🌦️",
    95: "Thunderstorms ⛈️", 96: "Thunderstorms ⛈️", 99: "Thunderstorms ⛈️"
  };
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function wxDesc(code) { return WX_CODES[code] || "Variable conditions"; }

  async function fetchWeather() {
    const res = await fetch(WEATHER_URL);
    const d = await res.json();
    const c = d.current;
    const daily = d.daily;
    const temp = Math.round(c.temperature_2m);
    const desc = wxDesc(c.weathercode);
    const humidity = c.relative_humidity_2m;
    const wind = Math.round(c.windspeed_10m);
    let forecast = "";
    for (let i = 1; i <= 3; i++) {
      const date = new Date(daily.time[i] + "T12:00:00");
      const day = DAYS[date.getDay()];
      const hi = Math.round(daily.temperature_2m_max[i]);
      const lo = Math.round(daily.temperature_2m_min[i]);
      const wx = wxDesc(daily.weathercode[i]);
      forecast += `\n  ${day}: ${wx} ${hi}°↑ ${lo}°↓`;
    }
    return `Right now in Escondido it's ${temp}°F — ${desc}. Humidity ${humidity}%, wind ${wind} mph.\n\nNext 3 days:${forecast}\n\nGreat weather for a visit — we're just minutes from the Safari Park! 🌴`;
  }

  // ── Local time ───────────────────────────────────────────
  function getLocalTime() {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    const day = now.toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "long",
      month: "long",
      day: "numeric"
    });
    return `It's currently ${time} here in Escondido — ${day}. Anything I can help you plan?`;
  }

  // ── Pool hours ───────────────────────────────────────────
  function fmtHour(h) {
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = Math.floor(h) % 12 || 12;
    const mm = h % 1 === 0.5 ? ":30" : ":00";
    return hh + mm + " " + ampm;
  }

  function getPoolStatus() {
    const now = new Date();
    const rawHour = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", hour12: false });
    const [hStr, mStr] = rawHour.split(":");
    const hourDecimal = parseInt(hStr) + parseInt(mStr) / 60;
    const openLabel  = fmtHour(POOL_OPEN);
    const closeLabel = fmtHour(POOL_CLOSE);
    const isOpen = hourDecimal >= POOL_OPEN && hourDecimal < POOL_CLOSE;
    if (isOpen) {
      const hoursLeft = Math.floor(POOL_CLOSE - hourDecimal);
      return `The pool is open right now! 🏊 Hours are ${openLabel} – ${closeLabel} daily. Note: the pool is not heated. Free for all guests.${hoursLeft <= 1 ? " Heads up — closing soon." : ""}`;
    } else {
      return `The pool is currently closed — open daily from ${openLabel} to ${closeLabel}. Note: it's not heated. Free for all guests!`;
    }
  }

  // ── Things to do ─────────────────────────────────────────
  function getThingsToDo() {
    if (memory.hasKids) {
      return "Great picks for families:\n\n• San Diego Zoo Safari Park — 6.2 mi, about 10 min away — incredible for kids\n• Legoland California — ~35 min west in Carlsbad\n• SeaWorld San Diego — ~40 min south\n• Kit Carson Park — right in Escondido, great outdoor space\n• Escondido Children's Museum — 2.9 mi away\n\nNeed directions or more info on any of these?";
    }
    return "Lots to explore nearby!\n\n🦁 Safari Park — San Diego Zoo Safari Park is 6.2 mi away (~10 min)\n🍺 Stone Brewing World Bistro — 5.4 mi, great food + craft beer\n🎭 California Center for the Arts — 3.7 mi\n🥾 Dixon Lake — 6.5 mi, scenic trails and fishing\n🌿 Daley Ranch — 8 mi, hiking and mountain biking\n🍷 Vintana Wine + Dine — 3.1 mi\n🛍 Mershops North County — 3.5 mi (formerly Westfield)\n🌿 Grand Avenue Downtown — 2.7 mi, dining, shops, nightlife\n🌄 Elfin Forest Reserve — peaceful hiking nearby\n🏖 Oceanside Beach — ~40 min west\n🌆 Downtown San Diego — ~30 min south\n\nAnything you'd like to know more about?";
  }

  // ── Sound ping ───────────────────────────────────────────
  function playPing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }

  // ── Matching ─────────────────────────────────────────────
  /** Fix common misspellings so “Mediterian” still matches Mediteran intents & search. */
  function canonTypoNames(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/\bmediterians\b/g, "mediteran")
      .replace(/\bmediterian\b/g, "mediteran")
      .replace(/\bmediterrans\b/g, "mediteran")
      .replace(/\bmediterran\b/g, "mediteran")
      .replace(/\bmediterens?\b/g, "mediteran")
      .replace(/\bmotel\s+mediterranean\b/g, "motel mediteran")
      .replace(/\bmediterranean\s+motel\b/g, "motel mediteran");
  }

  function foldAccents(str) {
    try {
      return String(str || "")
        .normalize("NFD")
        .replace(/\p{M}+/gu, "");
    } catch (_) {
      return String(str || "");
    }
  }

  function normalize(str) {
    return canonTypoNames(foldAccents(String(str || "")).toLowerCase())
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * True when the guest is probably continuing the same topic (short reply, “what about…”, etc.).
   * Keyword rules stay on the raw line; BM25 + dataset get a richer query: prev + current.
   */
  function isLikelyFollowUp(raw, prev) {
    if (!prev || !raw) return false;
    const n = normalize(raw);
    if (!n) return false;
    if (/^(thanks|thank you|thx|ty|bye|cool|great|perfect|nice one)\b/.test(n)) return false;
    if (/^(gracias|muchas gracias|adios|hasta luego|ok gracias)\b/.test(n)) return false;
    /* Standalone policy / logistics questions — do not merge with last quick-reply */
    if (
      /\b(visitors?|visitor policy|guest policy|overnight|extra people|house rules|cancellation|deposit|pets?|service animal|smoking|non smoking|late checkout|early checkin|lost and found|packages?|visitor parking)\b/i.test(
        n
      )
    )
      return false;
    /*
     * Amenity / logistics in THIS message → own turn. Else “and do u have parking” glues to
     * “need a room for 2 people” and the room intent wins forever.
     */
    if (
      /\b(parking|park my|car park|wifi|wi[\s-]?fi|internet|pool|swimming|pet|pets|dog|cat|breakfast|coffee|checkout|check out|checkin|check in|elevator|ada|accessible|wheelchair|directions?|address|safari|zoo|jacuzzi|hot tub|smoking|rate|rates|price|prices|fee|fees|how much is|how far|shuttle|laundry|weather|forecast|temperature|rain|rainy|raining|climate|humidity|humid|degrees|storm|tiempo|clima|ur\s+name|name|who are you|who are u|who r u|whos marcos|who is marcos|marcos|concierge|tell me about yourself|towels?|hair\s*dryer|\bdryer\b|\biron\b|ironing|shampoo|soap|complimentary|safe\s*deposit|room\s*safe|\bnoise\b|\bquiet\b|balcony|patio|microwave|fridge|refrigerator|kitchenette|gym|fitness|bbq|grill|extra\s*guest|additional\s*guest|occupancy|max\s*people|housekeeping|cleaning|lobby|vending|ice\s*machine|wake\s*up|alarm|cot|crib|baby|toddler|teen|older\s*child|bicycle|bike|storage|luggage|early|late|extend|upgrade|view|floor|ground\s*floor|upper|stairs|invoice|receipt|tax|deposit|security\s*hold|credit\s*card|payment\s*method)\b/i.test(
        n
      )
    )
      return false;
    if (
      /\b(que tal el|que tal la|y el |y la |cuanto cuesta|cuanta cuesta|a que hora|horario|tambien|ninos|ninas|mascotas|el deposito|la piscina|habitacion|habitaciones|como llegar|donde estan|precio|tarifa|politica|politicas|wifi|estacionamiento)\b/.test(
        n
      )
    )
      return true;
    /*
     * “How about …” often continues the last topic — but if this line also names a new topic
     * (weather, parking, name, …), that was handled by the guard above with return false.
     */
    if (/\b(what about|how about|how bout|about that|same thing|same for|and that|for that|the (hours?|times?|schedule|fee|cost|price|deposit|policy)|how much|how long|is it included|pets too|kids too|children too|what time|and when)\b/i.test(raw)) return true;
    const words = n.split(/\s+/).filter(Boolean);
    if (
      words.length <= 4 &&
      !/\b(book|reserve|suite|king|queen|double|room|rooms|direction|address|phone|location|safari|pool|wifi|parking|check[\s-]?in|check[\s-]?out|polic|faq|pet|pets|kids|family|deposit|cancel|breakfast|towels?|dryer|iron|safe|quiet|noise|kitchen|microwave|fridge|ada|elevator|late|early|housekeeping|luggage|zoo)\b/.test(
        n
      )
    )
      return true;
    /* Only treat “and …” as glue when no concrete topic word (parking etc. caught above) */
    if (/^(and|but|also|so)\b/.test(n) && words.length <= 6) return true;
    return false;
  }

  function retrievalQuery(currentRaw) {
    const prev = memory.lastUserUtterance;
    if (prev && isLikelyFollowUp(currentRaw, prev)) {
      return String(prev).trim() + " " + String(currentRaw).trim();
    }
    // New topic detected — clear stale NLU retrieval tail so it doesn't bias BM25
    memory.lastNluRetrievalTail = "";
    return currentRaw;
  }

  /**
   * Widen guest wording for curated + dataset matching (mirrors MM_KNOWLEDGE ideas, no API).
   * Lets “bring our dog”, “driving from LA”, “need wifi” hit the right rows without copying exact FAQ titles.
   */
  function expandGuestQueryForRetrieval(raw) {
    const low = String(canonTypoNames(raw || "")).toLowerCase();
    const extra = [];
    if (/mediter|mediterr|motel\s*med|motelmed/.test(low)) {
      extra.push("motel mediteran escondido california 2336 safari");
    }
    if (/safari|wild\s*animal|zoo(\s|$)|san\s*diego\s*zoo/.test(low)) {
      extra.push("safari park zoo escondido miles wildlife");
    }
    if (/\bpool\b|swim|swimming|heated/.test(low)) {
      extra.push("pool swimming hours amenities");
    }
    if (/jacuzzi|hot\s*tub|jetted|whirlpool|spa\s*tub/.test(low)) {
      extra.push("jacuzzi suite patio deluxe amenities");
    }
    if (/cancel|refund|deposit|policy|policies|house rules/.test(low)) {
      extra.push("cancellation payment deposit policies hotel");
    }
    if (/pet|dog|cat|puppy|pooch|\banimal\b/.test(low)) {
      extra.push("pets service animals policy");
    }
    if (
      /family|families|kids|children|sleeps\s*4|toddler|baby|little ones|young kids|teens|teenagers|grandparents|grandma|grandpa|parents|reunion|vacation with|traveling with family|stroller|crib|cot|connecting rooms|extra bed|rollaway/.test(low)
    ) {
      extra.push("suite queen kitchen sleeps family");
    }
    if (/kitchen|cook|stovetop|stove|extended\s*stay|long\s*stay|meal prep/.test(low)) {
      extra.push("full kitchen refrigerator microwave utensils suite");
    }
    if (/accessible|ada|wheelchair|roll[\s-]?in|mobility|disability|\ba11y\b/.test(low)) {
      extra.push("accessibility grab bars shower");
    }
    if (/wifi|wi[\s-]?fi|internet|wlan|\bwireless\b/.test(low)) {
      extra.push("wifi wireless internet password guest");
    }
    if (/laundry|washing clothes|washer/.test(low)) {
      extra.push("laundry washing clothes amenities");
    }
    if (/breakfast|morning coffee|\bcoffee\b/.test(low)) {
      extra.push("breakfast coffee dining food");
    }
    if (/\bbook\b|reservation|reserve|availability|vacancy/.test(low)) {
      extra.push("booking reservation check availability");
    }
    if (/driv|gps|highway|freeway|i[\s-]?15|directions|how to get|where are you|en route/.test(low)) {
      extra.push("directions escondido boulevard interstate");
    }
    if ((/\bparking\b|\bcar\b|vehicle|\brv\b|truck/.test(low) || /\bpark\b/.test(low)) && !/safari|national park|zoo|trail|hike/.test(low)) {
      extra.push("parking complimentary vehicle lot");
    }
    if (/price|rate|cost|how much|nightly/.test(low)) {
      extra.push("rates pricing booking reservation");
    }
    if (/smoke|smoking|vape|cigarette/.test(low)) {
      extra.push("non smoking smoke free property");
    }
    if (/elevator|lift|\bstairs\b/.test(low)) {
      extra.push("accessibility property amenities");
    }
    if (/valid id|photo id|government id|check\s*in|checkin|checkout|check\s*out|late arrival|minimum age/.test(low)) {
      extra.push("check in check out front desk id age");
    }
    /* Word boundaries — bare “eat” matches inside “allowed”, “great”, etc. */
    const foodSeek =
      /\b(eat|eating|food|restaurant|restaurants|dining|hungry|brunch|lunch|dinner|breakfast|cafe|bistro)\b/.test(
        low
      );
    if (/things to do|dear and near|near and dear/.test(low)) {
      extra.push("things to do escondido dining attractions");
    } else if (/\bnearby\b/.test(low)) {
      if (foodSeek || /\brestaurants?\b|\beat\b/.test(low)) {
        extra.push(
          "food-drink dear near restaurants dining food escondido grand avenue stone brewing brunch coffee"
        );
      } else {
        extra.push("things to do escondido dining attractions");
      }
    } else if (
      /\brestaurants?\b|\beat\b|\bbrewery\b|\bbreweries\b|\bbrewpub\b|\bwinery\b|\battractions?\b/.test(low)
    ) {
      extra.push("food-drink things to do escondido dining attractions");
    }
    if (
      /\b(eat|eating|food|restaurant|restaurants|dining|hungry|brunch|lunch|dinner|cafe|bistro)\b/.test(low)
    ) {
      extra.push("food-drink eats drinks");
    }
    if (/trolley|sprinter|nctd|coaster|transit center|light rail|breeze bus|\bbus\b|public transit/.test(low)) {
      extra.push("sprinter escondido transit center breeze coaster directions trolley");
    }
    const rawTrim = String(raw || "").trim();
    if (
      rawTrim.length >= 10 &&
      (/\?/.test(rawTrim) || /\b(why|when|where|how|what|which|who|tell me|do you|are you|is there|can i)\b/.test(low))
    ) {
      extra.push("motel mediteran guest hotel policies faq amenities directions");
    }
    if (!extra.length) return String(raw || "");
    return String(raw || "").trim() + " " + extra.join(" ");
  }

  /** Fuses mm-chat-nlu.js topic hints into retrieval text (BM25 + dataset). */
  function fullExpandForRetrieval(enLine, rawUserLine) {
    const base = expandGuestQueryForRetrieval(enLine);
    let nluBoost = "";
    try {
      if (typeof window !== "undefined" && window.MM_NLU && window.MM_NLU.analyze) {
        const a = window.MM_NLU.analyze(enLine, rawUserLine != null ? rawUserLine : enLine);
        if (a.retrievalBoost && a.confidence >= 0.22) nluBoost = a.retrievalBoost;
      }
    } catch (_) {}
    const raw = String(rawUserLine != null ? rawUserLine : enLine || "").trim();
    const wc = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
    if (
      !nluBoost &&
      wc > 0 &&
      wc <= 6 &&
      memory.lastNluRetrievalTail
    ) {
      const n = normalize(raw);
      if (
        !/^(thanks|thank you|thx|ty|ok|okay|cool|great|perfect|nice|bye|goodbye|no thanks|sounds good|got it)\b/.test(
          n
        ) &&
        !/^nope\b|^nah\b/.test(n) &&
        !/^ha(ha)*$/.test(n)
      ) {
        nluBoost = memory.lastNluRetrievalTail;
      }
    }
    if (nluBoost) return base.trim() + " " + nluBoost;
    return base;
  }

  function chatWantsSpanish() {
    try {
      if (typeof window !== "undefined" && typeof window.mmCurrentLang === "function") {
        return window.mmCurrentLang() === "es";
      }
    } catch (_) {}
    return false;
  }

  function looksSpanish(s) {
    const t = String(s || "");
    if (/[áéíóúñü¿¡]/i.test(t)) return true;
    const n = normalize(t);
    return /\b(hola|que|donde|cuando|gracias|habitacion|habitaciones|precio|reserva|piscina|por favor|cuanto|como|tienen|hay|quiero|informacion|habla|necesito|ubicacion|llegar|cuesta|estacionamiento)\b/.test(
      n
    );
  }

  async function mmGtxTranslate(text, sl, tl) {
    const raw = String(text || "");
    if (!raw.trim()) return raw;
    const chunks = [];
    let rest = raw;
    while (rest.length > 4200) {
      const cut = rest.lastIndexOf("\n", 4200);
      const at = cut > 80 ? cut : 4200;
      chunks.push(rest.slice(0, at));
      rest = rest.slice(at);
    }
    chunks.push(rest);
    const out = [];
    for (let c = 0; c < chunks.length; c++) {
      const part = chunks[c];
      if (!part) continue;
      const url =
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
        encodeURIComponent(sl) +
        "&tl=" +
        encodeURIComponent(tl) +
        "&dt=t&q=" +
        encodeURIComponent(part);
      const res = await fetch(url);
      if (!res.ok) throw new Error("translate http " + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data[0])) throw new Error("translate shape");
      const piece = data[0].map((seg) => (Array.isArray(seg) && seg[0] ? seg[0] : "")).join("");
      out.push(piece);
    }
    return out.join("");
  }

  function escapeRegExp(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildPreservePhrases() {
    const seen = new Set();
    const list = [];
    function add(plain) {
      const p = String(plain || "").trim();
      if (p.length < 2) return;
      const key = p.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const spaced = escapeRegExp(p).replace(/\s+/g, "\\s+");
      list.push({ plain: p, re: new RegExp(spaced, "gi") });
    }
    add(_motel.name || "Motel Mediteran");
    add("Marcos");
    add(String(PHONE || ""));
    add("San Diego Zoo Safari Park");
    for (const id of Object.keys(_rooms)) {
      const r = _rooms[id];
      const name = (r.name || "").replace(/\s*\n\s*/g, " ").trim();
      add(name);
    }
    list.sort((a, b) => b.plain.length - a.plain.length);
    return list;
  }

  let preservePhraseCache = null;
  function getPreservePhraseList() {
    if (!preservePhraseCache) preservePhraseCache = buildPreservePhrases();
    return preservePhraseCache;
  }

  function shieldPreservePhrases(text) {
    const items = getPreservePhraseList();
    let out = String(text || "");
    const tokens = [];
    for (let i = 0; i < items.length; i++) {
      const { plain, re } = items[i];
      out = out.replace(re, () => {
        const tok = "MMXPH" + tokens.length;
        const html =
          typeof window !== "undefined" && window.mmPreserveEn ? window.mmPreserveEn(plain) : plain;
        tokens.push({ tok, html });
        return tok;
      });
    }
    return { text: out, tokens };
  }

  function unshieldPreserved(translated, tokens) {
    let out = String(translated || "");
    for (let i = 0; i < tokens.length; i++) {
      const { tok, html } = tokens[i];
      const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.split(tok).join(html);
      out = out.replace(new RegExp(esc, "gi"), html);
    }
    return out;
  }

  async function translateReplyToEs(enText) {
    let s = String(enText || "");
    const extracted = [];
    let xi = 0;
    s = s.replace(
      /<span\b[^>]*\bclass="[^"]*notranslate[^"]*"[^>]*\btranslate\s*=\s*["']no["'][^>]*>([\s\S]*?)<\/span>/gi,
      (_, inner) => {
        const tok = "MMXTKE" + xi++;
        extracted.push(
          typeof window !== "undefined" && window.mmPreserveEn
            ? window.mmPreserveEn(inner.replace(/<br\s*\/?>/gi, " "))
            : inner
        );
        return tok;
      }
    );
    const sh = shieldPreservePhrases(s);
    let translated = await mmGtxTranslate(sh.text, "en", "es");
    translated = unshieldPreserved(translated, sh.tokens);
    for (let i = 0; i < extracted.length; i++) {
      const t = "MMXTKE" + i;
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      translated = translated.split(t).join(extracted[i]);
      translated = translated.replace(new RegExp(esc, "gi"), extracted[i]);
    }
    return translated;
  }

  async function addBotMessage(enText, opt) {
    let out = enText;
    if (
      chatWantsSpanish() &&
      !(opt && opt.alreadyEs) &&
      !(opt && opt.forceEn)
    ) {
      try {
        out = await translateReplyToEs(enText);
      } catch (_) {}
    }
    addMessage(out, "bot");
  }

  async function addQuickRepliesLocalized(labels) {
    if (!labels || !labels.length) return;
    let out = labels;
    if (chatWantsSpanish()) {
      try {
        out = await Promise.all(labels.map((l) => mmGtxTranslate(String(l), "en", "es")));
      } catch (_) {}
    }
    addQuickReplies(out);
  }

  async function addPageLinkLocalized(href, label) {
    let lab = label;
    if (chatWantsSpanish() && label) {
      try {
        lab = await mmGtxTranslate(String(label), "en", "es");
      } catch (_) {}
    }
    addPageLink(href, lab);
  }

  /**
   * Whole-word (or whole-phrase) match only — stops "yo" matching inside "you",
   * "hi" inside unrelated words, etc.
   */
  function scoreKeyword(kw, text) {
    if (!text) return 0;
    const kwNorm = normalize(String(kw || "").trim());
    if (!kwNorm) return 0;
    const parts = kwNorm.split(/\s+/).filter(Boolean);
    const pattern = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    let re;
    try {
      re = new RegExp("\\b(?:" + pattern + ")\\b", "i");
    } catch (_) {
      return 0;
    }
    if (!re.test(text)) return 0;
    const words = parts.length;
    return words * 100 + kwNorm.length;
  }

  /** Strong keyword match → scripted reply. Below this, try live page search first. */
  const INTENT_BEATS_KNOWLEDGE_SCORE = 88;
  /** For factual questions, ~2+ word intent phrases score ~200+; weaker single-token hits try BM25 first. */
  const INFO_Q_STRONG_INTENT_SCORE = 200;

  function findIntentDetailed(input) {
    const text = normalize(input);
    let best = null;
    let bestScore = 0;
    for (const intent of INTENTS) {
      for (const kw of intent.keywords) {
        const score = scoreKeyword(kw, text);
        if (score > bestScore) {
          best = intent;
          bestScore = score;
        }
      }
    }
    return { intent: best, score: bestScore };
  }

  /** True when the current line is clearly about eating out (not generic “what’s nearby”). */
  function guestAsksFoodNearby(n) {
    if (!n || !String(n).trim()) return false;
    return (
      /\b(eat|eating|eatery|restaurant|restaurants|dining|food|hungry|brunch|lunch|dinner|breakfast|cafe|bistros?|nearby to eat|what to eat|where to eat|places to eat|somewhere to eat|grab a bite|good food|spots to eat|out to eat)\b/.test(
        n
      ) ||
      /\b(nearby|close)\b.*\b(eat|food|restaurant|dining|brunch|lunch|dinner)\b/.test(n) ||
      /\b(eat|food|restaurant|dining|brunch|lunch|dinner)\b.*\b(nearby|close)\b/.test(n)
    );
  }

  /**
   * “What’s nearby” matches things_to_do and beats “eat” (1 word). Send food questions to food_nearby
   * so we don’t dump Safari/hiking list when they only asked where to eat.
   */
  function resolveIntentPreferFood(mergedText, enText, userLineText) {
    const detRaw = findIntentDetailed(mergedText);
    const detEn = findIntentDetailed(enText);
    let pick = detEn.score > detRaw.score ? detEn : detRaw;
    let { intent, score } = pick;
    const nUser = normalize(userLineText);
    if (!guestAsksFoodNearby(nUser)) return { intent, score };

    const misroute =
      intent &&
      [
        "things_to_do",
        "safari_park",
        "dixon_lake",
        "daley_ranch",
        "beach",
        "san_diego",
        "seaworld",
        "winery",
        "farmers_market",
        "how_long",
        "best_time"
      ].includes(intent.id);

    if (!misroute) return { intent, score };

    const fd = findIntentDetailed(userLineText);
    const foodFirstIds = [
      "food_nearby",
      "breakfast",
      "stone_brewing",
      "downtown_escondido",
      "farmers_market",
      "old_town"
    ];
    if (fd.intent && foodFirstIds.includes(fd.intent.id) && fd.score >= 88) {
      return { intent: fd.intent, score: fd.score };
    }
    const fb = INTENTS.find((it) => it.id === "food_nearby");
    if (fb) return { intent: fb, score: INTENT_BEATS_KNOWLEDGE_SCORE + 10 };
    return { intent, score };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripKnowledgeNoise(s) {
    let t = String(s || "")
      .replace(/\bImage placeholder\b/gi, " ")
      .replace(/\bDiscover more in less time\b/gi, " ")
      .replace(/\bDear & Near\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const idx = t.search(/\bThe experience\b/i);
    if (idx > 0 && idx < 220) t = t.slice(idx).trim();
    return t.replace(/\s+/g, " ").trim();
  }

  /** Pull query tokens for scoring sentences (skip very short / noisy). */
  function knowledgeQueryTokens(queryHint) {
    const n = normalize(String(queryHint || ""));
    const stop = new Set([
      "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use", "tell", "motel", "hotel", "about", "what", "when", "where", "your", "from", "that", "this", "with", "have", "does", "will", "they", "them", "want", "know", "need", "like", "just", "into", "over", "such", "take", "than", "then", "very", "also", "come", "here", "some", "could", "would", "should", "there", "their", "other", "after", "first", "well", "only", "even", "most", "much", "more", "been", "being", "both", "each", "made", "many", "must", "same", "those"
    ]);
    return n
      .split(" ")
      .filter((w) => w.length >= 3 && !stop.has(w));
  }

  function splitKnowledgeSentences(t) {
    const flat = String(t || "").replace(/\s+/g, " ").trim();
    if (!flat) return [];
    const parts = flat.split(/(?<=[.!?])\s+/).map((s) => s.trim());
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const s = parts[i];
      if (s.length >= 12) out.push(s);
    }
    if (!out.length && flat.length >= 12) out.push(flat);
    return out;
  }

  /**
   * Prefer sentences that overlap the guest’s wording so the “brain” answers the question,
   * not just the first paragraph of the matched page.
   */
  function pickBestKnowledgeExcerpt(body, queryHint, maxLen) {
    const cap = Math.min(Math.max(maxLen || 780, 200), 920);
    const words = knowledgeQueryTokens(queryHint);
    const sents = splitKnowledgeSentences(body);
    if (!sents.length) {
      const b = body.slice(0, cap).trim();
      return b.length < body.length ? b + "…" : b;
    }

    function scoreSentence(sn) {
      const snn = normalize(sn);
      let sc = 0;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (snn.includes(w)) sc += w.length >= 6 ? 5 : 3;
      }
      return sc;
    }

    const ranked = sents.map((s) => ({ s, sc: scoreSentence(s) }));
    ranked.sort((a, b) => b.sc - a.sc);

    if (ranked[0].sc >= 3) {
      let out = ranked[0].s;
      for (let j = 1; j < ranked.length && out.length < cap - 40; j++) {
        if (ranked[j].sc < Math.max(3, ranked[0].sc - 2)) break;
        const add = ranked[j].s;
        if (out.includes(add.slice(0, 24))) continue;
        if (out.length + add.length + 1 <= cap) out += " " + add;
      }
      if (out.length > cap) out = out.slice(0, cap - 1).trim() + "…";
      return out;
    }

    let acc = "";
    for (let i = 0; i < sents.length && acc.length < cap; i++) {
      const s = sents[i];
      acc = acc ? acc + " " + s : s;
    }
    if (acc.length > cap) acc = acc.slice(0, cap - 1).trim() + "…";
    return acc;
  }

  function formatKnowledgeAnswer(k, queryHint) {
    if (!k || typeof k.text !== "string" || !k.label) {
      return (
        "I couldn’t open that section just now — no worries. Have a peek at our FAQs when you can, or call " +
        PHONE +
        "; we’re happy to help."
      );
    }
    let body = stripKnowledgeNoise(k.text);
    if (body.length < 24) body = k.text.replace(/\bImage placeholder\b/gi, " ").replace(/\s+/g, " ").trim();
    const hint = [queryHint || "", memory.lastNluRetrievalTail || "", memory.lastUserUtterance || ""]
      .filter(Boolean)
      .join(" ");
    const excerpt = pickBestKnowledgeExcerpt(body, hint, 860);
    const safe = escapeHtml(excerpt);
    const isQuestion = looksLikeInformationalQuestion(String(queryHint || ""));
    const lead = isQuestion
      ? "I searched our live site pages — this bit from <strong>" + escapeHtml(k.label) + "</strong> lines up best with what you asked:"
      : "From our <strong>" + escapeHtml(k.label) + "</strong> page on the site:";
    return (
      lead +
      "\n\n" +
      safe +
      "\n\nIf that’s not quite it, try rephrasing or open the full page below. For anything personal to your stay, our front desk is happy to help at " +
      escapeHtml(PHONE) +
      " (24 hours)."
    );
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Plain text for scoring overlap — joins replies[] or uses reply. */
  function datasetReplyPlain(e) {
    if (!e) return "";
    if (Array.isArray(e.replies) && e.replies.length) {
      return e.replies
        .map((r) => String(r || "").trim())
        .filter(Boolean)
        .join(" ");
    }
    return String(e.reply || "");
  }

  /** One message to show: rotates through replies[] when present. */
  function pickDatasetReply(e) {
    if (!e) return "";
    if (Array.isArray(e.replies) && e.replies.length) {
      const arr = e.replies.map((r) => String(r || "").trim()).filter(Boolean);
      if (arr.length) return pick(arr);
    }
    return String(e.reply || "");
  }

  /** Owner-written answers in mm-data.js — free, no API; longest phrase match wins. */
  function findCuratedSnippet(raw, rawUser) {
    const list = _data.chatSnippets;
    if (!list || !Array.isArray(list) || !list.length) return null;
    const n = normalize(fullExpandForRetrieval(raw, rawUser != null ? rawUser : raw));
    let best = null;
    let bestLen = 0;
    for (let s = 0; s < list.length; s++) {
      const item = list[s];
      const phrases = item.whenContains || [];
      for (let p = 0; p < phrases.length; p++) {
        const pn = normalize(String(phrases[p] || ""));
        if (pn.length < 3) continue;
        if (n.includes(pn) && pn.length > bestLen) {
          bestLen = pn.length;
          best = item;
        }
      }
    }
    return best;
  }

  /** Whole-word keyword match so "visit" does not fire on "visitors", "eat" on "repeat", etc. */
  function datasetKeywordMatchesNormalizedQuery(kn, n) {
    if (!kn || kn.length < 2) return false;
    if (kn.length <= 2) return n.includes(kn);
    try {
      const esc = kn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("\\b" + esc + "\\b").test(n);
    } catch (_) {
      return n.includes(kn);
    }
  }

  /** Q&A from mm-chat-dataset.js (manual) + mm-chat-dataset.auto.js (built from your HTML on deploy). */
  function findDatasetAnswer(raw, rawUser) {
    const manual = (typeof window !== "undefined" && window.MM_CHAT_DATASET && window.MM_CHAT_DATASET.entries) || [];
    const auto =
      (typeof window !== "undefined" && window.MM_CHAT_DATASET_AUTO && window.MM_CHAT_DATASET_AUTO.entries) || [];
    const list = [
      ...manual.map((e) => ({ e, bonus: 35 })),
      ...auto.map((e) => ({ e, bonus: 0 }))
    ];
    if (!list.length) return null;
    const n = normalize(fullExpandForRetrieval(raw, rawUser != null ? rawUser : raw));
    const words = n.split(" ").filter((w) => w.length > 1);
    const userWordSet = new Set(words);
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < list.length; i++) {
      const { e, bonus } = list[i];
      let sc = bonus;
      const triggers = e.triggers || [];
      for (let t = 0; t < triggers.length; t++) {
        const tn = normalize(String(triggers[t]));
        if (tn.length >= 3 && n.includes(tn)) sc += tn.length * 6 + 40;
      }
      let triggerWordBonus = 0;
      for (let t = 0; t < triggers.length; t++) {
        const tw = normalize(String(triggers[t]))
          .split(" ")
          .filter((w) => w.length > 4);
        for (let w = 0; w < tw.length; w++) {
          if (n.includes(tw[w])) triggerWordBonus += 6;
        }
      }
      sc += Math.min(triggerWordBonus, 28);
      const kws = e.keywords || [];
      for (let k = 0; k < kws.length; k++) {
        const kn = normalize(String(kws[k]));
        if (kn.length >= 2 && datasetKeywordMatchesNormalizedQuery(kn, n)) sc += 18;
      }
      const rnorm = normalize(datasetReplyPlain(e));
      let replyMatchBonus = 0;
      userWordSet.forEach((w) => {
        if (w.length > 5 && rnorm.includes(w)) replyMatchBonus += 2;
      });
      sc += Math.min(replyMatchBonus, 10);
      if (sc > bestScore) {
        bestScore = sc;
        best = e;
      }
    }
    if (bestScore >= 40 && best) return { entry: best, score: bestScore };

    /** Word overlap when guest phrasing doesn’t contain full trigger strings (no Netlify / no API). */
    const longUserWords = [...userWordSet].filter((w) => w.length >= 4);
    const softMinHits = longUserWords.length >= 3 ? 3 : 2;
    let softBest = null;
    let softScore = 0;
    for (let i = 0; i < list.length; i++) {
      const { e, bonus } = list[i];
      const hay = normalize(
        [...(e.triggers || []), ...(e.keywords || []), datasetReplyPlain(e)].join(" ")
      );
      let hits = 0;
      userWordSet.forEach((w) => {
        if (w.length >= 4 && hay.includes(w)) hits++;
      });
      if (hits < softMinHits) continue;
      const sc = Math.floor(bonus * 0.55) + hits * 14 + (hits >= 4 ? 14 : 0);
      if (sc > softScore) {
        softScore = sc;
        softBest = e;
      }
    }
    /* Higher bar + adaptive overlap → fewer unrelated FAQ rows on vague questions */
    if (softBest && softScore >= 64) return { entry: softBest, score: softScore };
    return null;
  }

  /** Guest seems to be asking for a fact/policy → avoid weak intent/small-talk false positives. */
  function looksLikeInformationalQuestion(raw) {
    const t = String(raw || "").trim();
    if (!t) return false;
    const n = normalize(t);
    if (/\?/.test(t)) return true;
    if (
      /^(what|when|where|how|why|who|which|is |are |do |does |did |can |could |would |should |have you |do you |did you |are you |is there |are there )/.test(
        n
      )
    )
      return true;
    if (
      /\b(policy|policies|fee|fees|charge|charges|allow|allowed|permit|included|includes|available|availability|hours|check-in|checkout|check-out|parking|wifi|wi-fi|pet|pets|deposit|refund|cancel)\b/.test(
        n
      )
    )
      return true;
    return false;
  }

  /**
   * These intents often match single generic tokens (“phone”, “chat”, “ok”) inside longer factual questions.
   */
  const INTENT_IDS_SKIP_WHEN_INFO_AMBIGUOUS = new Set([
    "bored",
    "contact",
    "nice",
    "okay",
    "yeah_sure",
    "hmm_filler",
    "what_else",
    "help",
    "not_sure",
    "nah_nope",
    "greeting",
    "whats_up",
    "lets_get_back",
    "lol_react",
    "joke",
    "overview",
  ]);

  function shouldDeferIntentToDeskForClarity(intent, userLine) {
    if (!intent) return false;
    if (!looksLikeInformationalQuestion(userLine)) return false;
    return INTENT_IDS_SKIP_WHEN_INFO_AMBIGUOUS.has(intent.id);
  }

  // ── DOM ──────────────────────────────────────────────────
  const btn = document.querySelector(".mm-chat-btn");
  const panel = document.querySelector(".mm-chat-panel");
  const messagesEl = document.querySelector(".mm-chat-messages");
  const inputEl = document.querySelector(".mm-chat-input");
  const sendEl = document.querySelector(".mm-chat-send");
  const restartBtn = document.querySelector(".mm-chat-header__restart");
  if (!btn || !panel || !messagesEl || !inputEl || !sendEl) return;

  if (restartBtn) restartBtn.addEventListener("click", restartChat);

  function closePanel() {
    btn.classList.remove("is-open");
    panel.classList.add("is-hidden");
  }

  // Escape key closes panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.classList.contains("is-hidden")) closePanel();
  });

  // Click outside panel + button closes panel
  // Guard: e.target.isConnected — quick reply buttons remove themselves from the DOM
  // before the event bubbles to document, so panel.contains() returns false for them.
  document.addEventListener("click", (e) => {
    if (
      !panel.classList.contains("is-hidden") &&
      e.target.isConnected &&
      !panel.contains(e.target) &&
      !btn.contains(e.target)
    ) closePanel();
  });

  let opened = false;

  setTimeout(() => {
    if (!opened) btn.classList.remove("dot-hidden");
  }, 3000);

  btn.addEventListener("click", () => {
    opened = true;
    btn.classList.toggle("is-open");
    btn.classList.add("dot-hidden");
    panel.classList.toggle("is-hidden");
    if (!panel.classList.contains("is-hidden")) {
      if (messagesEl.children.length === 0) showWelcome();
      inputEl.focus();
      if (typeof window !== "undefined" && window.MM_KNOWLEDGE) window.MM_KNOWLEDGE.load().catch(() => {});
    }
  });

  // ── Messages ─────────────────────────────────────────────
  function timestamp() {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true
    });
  }

  function linkifyBotReply(html) {
    return String(html || "")
      .replace(/\n/g, "<br>")
      .replace(/(https?:\/\/[^\s<]+)/g, (_, url) => {
        const label = /booking\.com/i.test(url) ? "Book here" : "Open link";
        return (
          '<a href="' +
          url +
          '" style="color:inherit;text-decoration:underline;text-underline-offset:2px" target="_blank" rel="noopener noreferrer">' +
          label +
          "</a>"
        );
      });
  }

  function addMessage(text, role) {
    const wrap = document.createElement("div");
    wrap.className = "mm-chat-msg mm-chat-msg--" + role;
    const bubble = document.createElement("div");
    bubble.className = "mm-chat-bubble";
    if (role === "user") {
      const lines = String(text || "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (i) bubble.appendChild(document.createElement("br"));
        bubble.appendChild(document.createTextNode(lines[i]));
      }
    } else {
      bubble.innerHTML = linkifyBotReply(text);
    }
    const ts = document.createElement("div");
    ts.className = "mm-chat-ts";
    ts.textContent = timestamp();
    wrap.appendChild(bubble);
    wrap.appendChild(ts);
    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function addPageLink(href, label) {
    if (!href || typeof href !== "string") return;
    const wrap = document.createElement("div");
    wrap.className = "mm-chat-msg mm-chat-msg--bot";
    const a = document.createElement("a");
    a.className = "mm-chat-page-link";
    a.href = href;
    /* Same tab: guest stays in one window; include this chat widget on site pages so it’s available after navigation. */
    const text = (label || "View details") + " ";
    a.innerHTML =
      text +
      '<svg width="8" height="10" viewBox="0 0 8 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 1.5L5.5 5L2 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrap.appendChild(a);
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function addQuickReplies(replies) {
    if (!replies || !replies.length) return;
    const wrap = document.createElement("div");
    wrap.className = "mm-chat-msg mm-chat-msg--bot";
    const qr = document.createElement("div");
    qr.className = "mm-chat-quick";
    replies.forEach(label => {
      const b = document.createElement("button");
      b.className = "mm-chat-quick__btn";
      b.textContent = label;
      b.addEventListener("click", () => {
        qr.remove();
        handleMessage(label);
      });
      qr.appendChild(b);
    });
    wrap.appendChild(qr);
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "mm-chat-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    el.id = "mm-typing";
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function hideTyping() {
    const el = document.getElementById("mm-typing");
    if (el) el.remove();
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── Flow ─────────────────────────────────────────────────
  function getTimeGreeting() {
    const hour = parseInt(new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles", hour: "numeric", hour12: false
    }));
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Hi";
  }

  function showWelcome() {
    setTimeout(async () => {
      const greeting = getTimeGreeting();
      await addBotMessage(
        pick([
          greeting + "! I’m Marcos — welcome to Motel Mediteran. How can I help you today?",
          greeting + "! I’m Marcos. So glad you’re here — what would you like to know?",
          greeting + "! Hi, I’m Marcos at Motel Mediteran. Ask me anything about your stay."
        ])
      );
      await addQuickRepliesLocalized([
        "What rooms do you have?",
        "Is there a pool?",
        "Where are you located?",
        "Check-in times",
      ]);
    }, 300);
  }

  function restartChat() {
    messagesEl.innerHTML = "";
    Object.assign(memory, {
      hasKids: false, wantsKitchen: false, wantsJacuzzi: false,
      groupSize: null, mentionedSafariPark: false,
      lastIntentId: null,
      lastUserUtterance: null,
      lastKnowledgeFingerprint: null,
      lastNluRetrievalTail: "",
      exchangeCount: 0
    });
    showWelcome();
  }

  function getSmartResponse(intent) {
    if (!intent || !intent.responses || !intent.responses.length) {
      return (
        "I’d love to point you in the right direction — try rooms, directions, or policies here, or call us gently anytime at " +
        PHONE +
        " and a real person will take care of you."
      );
    }
    // Personalise based on memory
    if (intent.id === "rooms_overview" && memory.hasKids) {
      return "For families, we often suggest the 2-Room Suite with Kitchen (two queens, separate living room, sleeps four) or the Deluxe King Suite with Kitchen (king + queen, sleeps four, jacuzzi, fireplace). Both include full kitchens. I’d be glad to share more if you’d like!";
    }
    if (intent.id === "rooms_overview" && memory.wantsJacuzzi) {
      return "Since you asked about jacuzzis — our Deluxe King Suite and Deluxe King Suite with Kitchen both include a private in-room jacuzzi. Please let me know if you’d like more detail on either one.";
    }
    return pick(intent.responses);
  }

  function knowledgeFingerprint(hit) {
    if (!hit || !hit.href) return "";
    return hit.href + "::" + normalize(String(hit.text || "").slice(0, 200));
  }

  function handleMessage(text) {
    const priorUserLine = memory.lastUserUtterance;
    addMessage(text, "user");
    inputEl.value = "";
    sendEl.disabled = true;

    // Longer input → slightly longer "thinking" delay, capped at 1400ms
    const delay = Math.min(600 + text.length * 4 + Math.random() * 200, 1400);
    showTyping();

    setTimeout(async () => {
      try {
        hideTyping();
      } catch (_) {}

      try {
      const merged = retrievalQuery(text);
      let enForRetrieval = merged;
      try {
        if (merged.trim() && (chatWantsSpanish() || looksSpanish(merged))) {
          enForRetrieval = await mmGtxTranslate(
            merged,
            chatWantsSpanish() ? "es" : "auto",
            "en"
          );
        }
      } catch (_) {}
      let intentRes = resolveIntentPreferFood(merged, enForRetrieval, text);
      let intent = intentRes.intent;
      let score = intentRes.score;
      let nluEscalate = false;
      let nluSnapshot = null;
      try {
        if (typeof window !== "undefined" && window.MM_NLU && window.MM_NLU.analyze) {
          nluSnapshot = window.MM_NLU.analyze(enForRetrieval, text);
          if (nluSnapshot.suggestEscalate && nluSnapshot.confidence >= 0.38) nluEscalate = true;
          if (nluSnapshot.retrievalBoost && nluSnapshot.confidence >= 0.28) {
            memory.lastNluRetrievalTail = nluSnapshot.retrievalBoost;
          }
          if (nluSnapshot.mapIntentId && nluSnapshot.confidence >= 0.5) {
            const mapped = INTENTS.find((it) => it.id === nluSnapshot.mapIntentId);
            if (mapped && score <= INTENT_BEATS_KNOWLEDGE_SCORE) {
              if (!intent || nluSnapshot.confidence >= 0.62 || intent.id === nluSnapshot.mapIntentId) {
                intent = mapped;
                score = INTENT_BEATS_KNOWLEDGE_SCORE + 8;
              }
            }
          }
        }
      } catch (_) {}

      const runIntent = async (it) => {
        try {
          if (it.memoryUpdate) it.memoryUpdate();
          memory.lastIntentId = it.id;
          const alreadyEs = it.responsesLang === "es";
          const forceEn = it.forceEnReply === true;
          let response = it.responses[0];
          const replyOpts = { alreadyEs, forceEn };
          if (response === "__weather__") {
            try {
              response = await fetchWeather();
            } catch (_) {
              response =
                "I couldn’t refresh live weather from here — sorry about that. Escondido is usually mild and pleasant; any trusted weather site for Escondido, CA will be close enough for planning.";
            }
            await addBotMessage(response, replyOpts);
          } else if (response === "__time__") {
            await addBotMessage(getLocalTime(), replyOpts);
          } else if (response === "__pool__") {
            await addBotMessage(getPoolStatus(), replyOpts);
          } else if (response === "__things_to_do__") {
            await addBotMessage(getThingsToDo(), replyOpts);
          } else if (typeof response === "string" && response.startsWith("__room:")) {
            const rid = response.replace("__room:", "").replace("__", "");
            await addBotMessage(roomResponse(rid) || getSmartResponse(it), replyOpts);
          } else {
            await addBotMessage(getSmartResponse(it), replyOpts);
          }
          if (it.pageLink) await addPageLinkLocalized(it.pageLink, it.pageLinkLabel);
          if (it.quickReplies) await addQuickRepliesLocalized(it.quickReplies);
        } catch (_) {
          await addBotMessage(
            "Something hiccuped on my side — I’m sorry. Please try once more, or call " + PHONE + " whenever you like; the desk will take good care of you."
          );
          await addQuickRepliesLocalized(["What's your phone number?", "FAQs page"]);
        }
      };

      const tryKnowledge = async (queryText) => {
        if (typeof window === "undefined" || !window.MM_KNOWLEDGE) return null;
        try {
          await window.MM_KNOWLEDGE.load();
          const strict = window.MM_KNOWLEDGE.search(queryText);
          if (strict) return strict;
          return window.MM_KNOWLEDGE.search(queryText, { relaxed: true });
        } catch (_) {
          return null;
        }
      };

      /** Synonym-expanded query + NLU retrieval hints for BM25. */
      const tryKnowledgeExpanded = async (queryText, rawLine) => {
        let k = await tryKnowledge(queryText);
        if (k && k.href && k.label) return k;
        const expanded = fullExpandForRetrieval(queryText, rawLine != null ? rawLine : queryText);
        const q0 = String(queryText || "").trim();
        if (expanded.trim() !== q0) {
          k = await tryKnowledge(expanded);
          if (k && k.href && k.label) return k;
        }
        const core = normalize(q0);
        const siteWide =
          core && core.length >= 6
            ? q0.trim() + " motel mediteran escondido california guest information hotel policies faq amenities"
            : "";
        if (siteWide && normalize(siteWide) !== core) {
          k = await tryKnowledge(siteWide);
          if (k && k.href && k.label) return k;
        }
        return null;
      };

      const forRetrieval = enForRetrieval;
      const infoQ = looksLikeInformationalQuestion(text);
      const strongScriptedIntent =
        intent &&
        score > INTENT_BEATS_KNOWLEDGE_SCORE &&
        !nluEscalate &&
        (!infoQ || score >= INFO_Q_STRONG_INTENT_SCORE);

      if (strongScriptedIntent) {
        memory.lastKnowledgeFingerprint = null;
        memory.lastUserUtterance = text;
        await runIntent(intent);
      } else {
        const snip = findCuratedSnippet(forRetrieval, text);
        if (snip && snip.reply) {
          memory.lastKnowledgeFingerprint = null;
          memory.lastIntentId = "curated";
          memory.lastUserUtterance = text;
          await addBotMessage(snip.reply);
          if (snip.pageLink) await addPageLinkLocalized(snip.pageLink, snip.pageLinkLabel || "Open page");
          await addQuickRepliesLocalized(["How do I book?", "What's your phone number?", "What rooms do you have?"]);
        } else {
        let k = await tryKnowledgeExpanded(forRetrieval, text);
        if (k && k.href && k.label && memory.lastKnowledgeFingerprint) {
          const fpNow = knowledgeFingerprint(k);
          if (
            fpNow === memory.lastKnowledgeFingerprint &&
            normalize(String(text || "")) !== normalize(String(priorUserLine || ""))
          ) {
            const k2 = await tryKnowledgeExpanded(String(text || "").trim(), text);
            if (!k2 || knowledgeFingerprint(k2) === memory.lastKnowledgeFingerprint) k = null;
            else k = k2;
          }
        }
        if (k && k.href && k.label) {
          memory.lastIntentId = "knowledge";
          memory.lastUserUtterance = text;
          memory.lastKnowledgeFingerprint = knowledgeFingerprint(k);
          await addBotMessage(
            formatKnowledgeAnswer(k, [forRetrieval, text].filter(Boolean).join(" ").trim())
          );
          await addPageLinkLocalized(k.href, "Open " + k.label);
          await addQuickRepliesLocalized(["How do I book?", "What's your phone number?", "FAQs page"]);
        } else {
        const dsHit = findDatasetAnswer(forRetrieval, text);
        const dsText =
          dsHit && dsHit.entry
            ? pickDatasetReply(dsHit.entry)
            : "";
        if (dsHit && dsHit.entry && dsText) {
          memory.lastKnowledgeFingerprint = null;
          memory.lastIntentId = "dataset";
          memory.lastUserUtterance = text;
          await addBotMessage(dsText);
          if (dsHit.entry.link) await addPageLinkLocalized(dsHit.entry.link, dsHit.entry.linkLabel || "Open page");
          await addQuickRepliesLocalized(["How do I book?", "What rooms do you have?", "Directions"]);
        } else if (
          intent &&
          !shouldDeferIntentToDeskForClarity(intent, text) &&
          !nluEscalate
        ) {
          memory.lastKnowledgeFingerprint = null;
          memory.lastUserUtterance = text;
          await runIntent(intent);
        } else if (nluEscalate) {
          memory.lastIntentId = null;
          memory.lastKnowledgeFingerprint = null;
          memory.lastUserUtterance = text;
          await addBotMessage(
            pick([
              "That’s something our front desk should handle directly so you get an accurate answer — please call " +
                PHONE +
                " when you can (we’re on the line 24/7). If it’s a true emergency, dial 911 first.",
              "I don’t want to steer you wrong on that one. The team at " +
                PHONE +
                " can look at the details and help right away — they’re available around the clock.",
              "For that situation, you’ll get the best help from a person at the desk: " +
                PHONE +
                " anytime, day or night."
            ])
          );
          await addQuickRepliesLocalized(["FAQs page", "What's the phone number?", "Hotel policies"]);
        } else {
          const t = normalize(text);
          const followExact = ["more", "continue", "go on", "keep going", "and", "mas", "sigue"];
          const followPhrase = ["what about that", "tell me more", "say more", "anything else about that"];
          const isNudge =
            memory.lastIntentId &&
            (followExact.includes(t) || followPhrase.some((p) => t.includes(p)));
          if (isNudge) {
            memory.lastKnowledgeFingerprint = null;
            memory.lastUserUtterance = text;
            await addBotMessage(
              "Still right here with you. Would you like to browse a page on the site, or chat about rooms, policies, or the Safari Park?"
            );
            await addQuickRepliesLocalized(["FAQs page", "Hotel policies", "Things to do page", "What rooms do you have?"]);
          } else {
            memory.lastIntentId = null;
            memory.lastKnowledgeFingerprint = null;
            memory.lastUserUtterance = text;
            const nRaw = String(text || "").trim();
            const wc = nRaw ? nRaw.split(/\s+/).filter(Boolean).length : 0;
            const lowNlu =
              nluSnapshot &&
              nluSnapshot.confidence < 0.24 &&
              (!nluSnapshot.best || !nluSnapshot.best.id || (nluSnapshot.best.score || 0) < 14);
            const tryClarify =
              wc >= 2 &&
              wc <= 9 &&
              lowNlu &&
              !/\?/.test(nRaw) &&
              !looksLikeInformationalQuestion(text);
            if (tryClarify) {
              await addBotMessage(
                pick([
                  "I’m not quite sure which topic you mean — is it reservations, check-in or check-out, rates, pets, parking, or the pool?",
                  "Help me point you the right way: are you asking about booking, hotel policies, room amenities, or directions and the Safari Park area?",
                  "Say a bit more if you can — for example booking, check-in times, pets, parking, Wi‑Fi, or the pool — and I’ll pull what we have on the site."
                ])
              );
              await addQuickRepliesLocalized([
                "How do I book?",
                "Check-in times",
                "Pet policy",
                "Parking",
                "What rooms do you have?"
              ]);
            } else {
              await addBotMessage(
                pick([
                  "That’s a really fair question — I combed what I’m allowed to quote from the site and I’m not seeing a snug match, so I don’t want to wing it. Would you try a slightly different phrasing, or give our front desk a quick ring at " +
                    PHONE +
                    "? They’re on **24/7** and they’re wonderful with specifics.",
                  "I’d rather be honest than clever: I’m not finding that in our published pages from here. The sweetest path is a calm call to " +
                    PHONE +
                    " — anytime, day or night — or browse FAQs / policies below when you have a moment.",
                  "You deserve a sure answer, and I’m not confident from the snippets I have. Our team at " +
                    PHONE +
                    " lives for this stuff (really — **24 hours**) and they’ll take care of you.",
                  "Hmm, I’m not landing on text I can quote for that one. Instead of leaving you guessing, may I send you to the desk at " +
                    PHONE +
                    "? They’re kind, fast, and always up.",
                  "Thank you for trusting me with it. When the site copy doesn’t cover something, the right move is a human — " +
                    PHONE +
                    ", round the clock, no rush on your side."
                ])
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              );
              await addQuickRepliesLocalized(["FAQs page", "How do I book?", "What rooms do you have?", "What's the phone number?"]);
            }
          }
        }
        }
        }
      }

      try {
        playPing();
      } catch (_) {}

      // Review nudge — show after every ~5th helpful exchange
      try {
        memory.exchangeCount = (memory.exchangeCount || 0) + 1;
        const reviewTriggerIds = ["booking", "thankyou", "bye", "nice", "okay"];
        const isGoodMoment =
          reviewTriggerIds.includes(memory.lastIntentId) ||
          memory.lastIntentId === "curated" ||
          memory.lastIntentId === "dataset" ||
          memory.lastIntentId === "knowledge";
        if (isGoodMoment && memory.exchangeCount % 5 === 0) {
          setTimeout(async () => {
            await addBotMessage(
              pick([
                "One more thing — if you end up staying with us, we'd really appreciate a Google review. It means a lot to a small property like ours! 🙏",
                "Quick note: if you visit and enjoy your stay, a Google review goes a long way for us. Thank you! 🙏",
                "Hope we get to welcome you soon! If you do stay, a Google review would mean the world to the team. 😊"
              ])
            );
          }, 1200);
        }
      } catch (_) {}
      } catch (_) {
        try {
          await addBotMessage(
            "Something went wrong on my end — I’m sorry for the bump. You can still reach us softly at " + PHONE + " or browse the FAQs whenever you like."
          );
        } catch (__) {}
      } finally {
        try {
          sendEl.disabled = inputEl.value.trim().length === 0;
        } catch (_) {
          sendEl.disabled = false;
        }
      }
    }, delay);
  }

  // ── Input ────────────────────────────────────────────────
  sendEl.addEventListener("click", () => {
    const val = inputEl.value.trim();
    if (val) handleMessage(val);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const val = inputEl.value.trim();
      if (val) handleMessage(val);
    }
  });

  inputEl.addEventListener("input", () => {
    sendEl.disabled = inputEl.value.trim().length === 0;
  });

  sendEl.disabled = true;
})();
