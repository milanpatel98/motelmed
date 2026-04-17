/**
 * Client-side “site memory”: fetch public pages, chunk text, rank by word overlap.
 * Built to fail softly: network/HTML issues never throw to the host page — chat falls back to rules.
 *
 * Owners can disable: window.MM_CHAT_DISABLE_KNOWLEDGE = true; (before or after this script)
 */
(function (global) {
  const SOURCES = [
    { url: "faqs.html", label: "FAQs" },
    { url: "hotel-policies.html", label: "Hotel policies" },
    { url: "amenities.html", label: "Amenities" },
    { url: "directions.html", label: "Directions" },
    { url: "accessibility.html", label: "Accessibility" },
    { url: "things-to-do.html", label: "Things to do" },
    { url: "rooms.html", label: "Rooms" },
    { url: "index.html", label: "Home" }
  ];

  const STOPWORDS = new Set(
    "a an the and or but if in on at to for of as is was are were be been being it its this that these those with from by not no yes we our you your they them their there can will would could should may might about into than then also just only very much such those any all each both each few more most other some so than too very when what which who whom whose why how where while about into through during before after above below under again further once here why how all both each few more most other some such".split(
      " "
    )
  );

  let chunks = [];
  let loadPromise = null;
  const MAX_CHUNKS_PER_PAGE = 90;

  /** BM25 (free, classic IR) — picks better passages than raw word overlap. */
  let bm25Ready = false;
  let avgDl = 1;
  let idfMap = {};
  const BM25_K1 = 1.2;
  const BM25_B = 0.75;

  function isDisabled() {
    return global.MM_CHAT_DISABLE_KNOWLEDGE === true;
  }

  /** Resolve relative to the current page URL (works on any domain/path). */
  function resolveUrl(path) {
    try {
      if (typeof global.location === "undefined" || !global.location.href) return path;
      return new URL(path, global.location.href).href;
    } catch (_) {
      return path;
    }
  }

  function canonTypoNames(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\bmediterians\b/g, "mediteran")
      .replace(/\bmediterian\b/g, "mediteran")
      .replace(/\bmediterrans\b/g, "mediteran")
      .replace(/\bmediterran\b/g, "mediteran")
      .replace(/\bmediterens?\b/g, "mediteran")
      .replace(/\bmotel\s+mediterranean\b/g, "motel mediteran")
      .replace(/\bmediterranean\s+motel\b/g, "motel mediteran");
  }

  function normalizeWords(s) {
    return canonTypoNames(s)
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Add typo variants so chunks still match guest misspellings. */
  function enrichTermSet(terms) {
    const out = new Set(terms);
    if (out.has("mediteran")) {
      out.add("mediterian");
      out.add("mediterran");
    }
    if (out.has("motel") && out.has("mediteran")) {
      out.add("hotel");
      out.add("escondido");
    }
    return out;
  }

  function termsFromString(text) {
    const raw = normalizeWords(text)
      .split(" ")
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));
    return enrichTermSet(new Set(raw));
  }

  function enrichTermFreq(freq) {
    const m = freq.mediteran;
    if (m) {
      if (!freq.mediterian) freq.mediterian = m;
      if (!freq.mediterran) freq.mediterran = m;
    }
  }

  function wordFreqFromText(t) {
    const words = normalizeWords(t)
      .split(" ")
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));
    const dl = words.length;
    const freq = {};
    words.forEach((w) => {
      freq[w] = (freq[w] || 0) + 1;
    });
    enrichTermFreq(freq);
    return { freq, dl: Math.max(dl, 1) };
  }

  function rebuildBm25Stats() {
    bm25Ready = false;
    idfMap = {};
    const N = chunks.length;
    if (!N) return;
    const df = {};
    let totalDl = 0;
    chunks.forEach((c) => {
      if (!c.termFreq) return;
      totalDl += c.dl;
      const seen = new Set();
      Object.keys(c.termFreq).forEach((term) => {
        if (!seen.has(term)) {
          seen.add(term);
          df[term] = (df[term] || 0) + 1;
        }
      });
    });
    avgDl = totalDl / N;
    Object.keys(df).forEach((term) => {
      const nq = df[term];
      idfMap[term] = Math.log(1 + (N - nq + 0.5) / (nq + 0.5));
    });
    bm25Ready = true;
  }

  function bm25Score(chunk, qTerms) {
    if (!chunk.termFreq || !bm25Ready) return 0;
    let s = 0;
    for (let i = 0; i < qTerms.length; i++) {
      const t = qTerms[i];
      const f = chunk.termFreq[t] || 0;
      if (!f) continue;
      const idf = idfMap[t] || 0;
      const denom = f + BM25_K1 * (1 - BM25_B + BM25_B * (chunk.dl / avgDl));
      s += idf * ((f * (BM25_K1 + 1)) / denom);
    }
    return s;
  }

  function tidy(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  /** Mirrors HTML filter chips so “eat / restaurant” queries rank food-drink cards in BM25. */
  function thingTodoCategorySearchLine(dataAttr) {
    const parts = String(dataAttr || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "";
    const bits = [];
    if (parts.includes("food-drink")) {
      bits.push(
        "food-drink eats drinks dining restaurants restaurant meals brunch lunch dinner cafe coffee brewery chef menu bistro"
      );
    }
    if (parts.includes("culture")) bits.push("culture arts theater museum music performances");
    if (parts.includes("wellness")) bits.push("wellness outdoors hiking lake nature trails");
    if (parts.includes("shopping")) bits.push("shopping mall retail stores");
    if (parts.includes("attractions")) bits.push("attractions safari zoo wildlife park sightseeing");
    if (parts.includes("escondido")) bits.push("escondido north county");
    if (!bits.length) return "";
    return "Dear and Near filter: " + bits.join(" · ");
  }

  function pushChunk(text, source) {
    try {
      const nHere = chunks.reduce((n, c) => n + (c.href === source.url ? 1 : 0), 0);
      if (nHere >= MAX_CHUNKS_PER_PAGE) return;
      let t = tidy(text).replace(/\bImage placeholder\b/gi, " ").replace(/\s+/g, " ").trim();
      if (/Discover more in less time/i.test(t) && /Filter by/i.test(t) && !/The experience/i.test(t)) return;
      if (t.length < 28) return;
      const { freq, dl } = wordFreqFromText(t);
      if (Object.keys(freq).length < 3) return;
      const terms = new Set(Object.keys(freq));
      chunks.push({
        text: t,
        href: source.url,
        label: source.label,
        terms,
        termFreq: freq,
        dl
      });
    } catch (_) {}
  }

  function chunkPlainText(raw, source) {
    let text = tidy(String(raw || "").replace(/\n+/g, "\n"));
    if (!text) return;
    const max = 480;
    let i = 0;
    let guard = 0;
    while (i < text.length && guard++ < 5000) {
      let end = Math.min(i + max, text.length);
      if (end < text.length) {
        const slice = text.slice(i, end);
        const brk = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
        if (brk > 100) end = i + brk + 1;
      }
      const piece = text.slice(i, end).trim();
      pushChunk(piece, source);
      i = end;
    }
  }

  function ingestMain(main, source) {
    if (!main) return;
    try {
      const urlTail = String(source.url || "")
        .split("?")[0]
        .split("/")
        .pop();
      if (urlTail === "things-to-do.html") {
        const cards = main.querySelectorAll("article.mm-td-card");
        let nCards = 0;
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const h3 = card.querySelector("h3");
          if (!h3) continue;
          const title = tidy(h3.textContent || "");
          const catLine = thingTodoCategorySearchLine(card.getAttribute("data-mm-td-categories") || "");
          const bits = [];
          if (catLine) bits.push(catLine);
          bits.push(title);
          card.querySelectorAll(".mm-td-card__addr-text, .mm-td-card__miles, .mm-td-card__text").forEach((el) => {
            const tx = tidy(el.textContent || "");
            if (tx && !/^image placeholder$/i.test(tx)) bits.push(tx);
          });
          const block = bits.join("\n");
          if (title.length >= 3 && block.length >= 40) {
            pushChunk(block, source);
            nCards++;
          }
        }
        if (nCards > 0) return;
        return;
      }
      const details = main.querySelectorAll("details");
      if (details.length >= 2) {
        details.forEach((d) => {
          try {
            const sum = d.querySelector("summary");
            const q = sum ? tidy(sum.textContent) : "";
            const inner = d.cloneNode(true);
            inner.querySelectorAll("summary").forEach((s) => s.remove());
            const a = tidy(inner.textContent || "");
            const block = [q && "Q: " + q, a && "A: " + a].filter(Boolean).join("\n");
            pushChunk(block, source);
          } catch (_) {}
        });
        return;
      }
      chunkPlainText(main.innerText || "", source);
    } catch (_) {}
  }

  async function ingestOne(source) {
    const target = resolveUrl(source.url);
    const res = await fetch(target, {
      credentials: "same-origin",
      cache: "default"
    });
    if (!res.ok) throw new Error(source.url + " HTTP " + res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("parsererror")) {
      console.warn("MM_KNOWLEDGE: HTML parser warning for", source.url, "— indexing may be partial.");
    }
    const main = doc.querySelector("main");
    ingestMain(main, source);
  }

  async function loadInternal() {
    if (isDisabled()) return;
    const results = await Promise.allSettled(SOURCES.map((source) => ingestOne(source)));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        try {
          console.warn("MM_KNOWLEDGE: could not index", SOURCES[i].url, r.reason && r.reason.message);
        } catch (_) {}
      }
    });
    rebuildBm25Stats();
  }

  /**
   * Safe to await from anywhere: never rejects. Retries if previous run left 0 chunks.
   */
  async function load() {
    if (isDisabled()) return;
    if (chunks.length > 0) return;
    if (!loadPromise) {
      loadPromise = loadInternal()
        .catch((e) => {
          try {
            console.warn("MM_KNOWLEDGE:", e);
          } catch (_) {}
        })
        .finally(() => {
          loadPromise = null;
        });
    }
    try {
      await loadPromise;
    } catch (_) {}
  }

  /** Widen query with related words (no API — feels smarter on property / Safari / pool topics). */
  function expandQueryForSearch(raw) {
    const low = String(raw || "").toLowerCase();
    const extra = [];
    if (/mediter|mediterr|motel\s*med|motelmed/.test(low)) {
      extra.push("motel mediteran escondido california 2336 safari");
    }
    if (/safari|wild\s*animal|zoo(\s|$)|zoo\s*san|san\s*diego\s*zoo/.test(low)) {
      extra.push("safari park zoo escondido miles wildlife");
    }
    if (/\bpool\b|swim|swimming|heated/.test(low)) {
      extra.push("pool swimming hours amenities");
    }
    if (/jacuzzi|hot\s*tub|jetted|whirlpool|spa\s*tub/.test(low)) {
      extra.push("jacuzzi suite patio deluxe amenities");
    }
    if (/cancel|refund|deposit|policy/.test(low)) {
      extra.push("cancellation payment deposit policies");
    }
    if (/pet|dog|cat/.test(low)) {
      extra.push("pets service animals policy");
    }
    if (
      /family|families|kids|children|sleeps\s*4|toddler|baby|little ones|young kids|teens|teenagers|grandparents|grandma|grandpa|parents|reunion|vacation with|traveling with family|stroller|crib|connecting rooms|rollaway/.test(low)
    ) {
      extra.push("suite queen kitchen sleeps family");
    }
    if (/jacuzzi|hot\s*tub|romantic|anniversary|honeymoon/.test(low)) {
      extra.push("deluxe king suite patio jetted");
    }
    if (/kitchen|cook|stovetop|extended\s*stay|long\s*stay/.test(low)) {
      extra.push("full kitchen refrigerator microwave utensils suite");
    }
    if (/accessible|ada|wheelchair|roll[\s-]?in|mobility|\ba11y\b/.test(low)) {
      extra.push("accessibility grab bars shower");
    }
    if (/wifi|wi[\s-]?fi|internet|wlan|\bwireless\b/.test(low)) {
      extra.push("wifi wireless internet password guest");
    }
    if (/laundry|washing clothes|washer/.test(low)) {
      extra.push("laundry washing clothes amenities");
    }
    if (/breakfast|morning coffee/.test(low)) {
      extra.push("breakfast coffee dining food");
    }
    if (/things to do|dear and near|near and dear/.test(low)) {
      extra.push("things to do escondido dining attractions");
    } else if (/\bnearby\b/.test(low)) {
      if (
        /\b(eat|eating|food|restaurant|restaurants|dining|hungry|brunch|lunch|dinner|breakfast|cafe|bistro)\b/.test(
          low
        )
      ) {
        extra.push(
          "food-drink dear near restaurants dining food escondido grand avenue stone brewing coffee brunch"
        );
      } else {
        extra.push("things to do escondido dining attractions");
      }
    } else if (/restaurant|brewery|winery/.test(low)) {
      extra.push("food-drink things to do escondido dining attractions");
    }
    if (
      /\b(eat|eating|food|restaurant|restaurants|dining|hungry|brunch|lunch|dinner|cafe|bistro)\b/.test(low)
    ) {
      extra.push("food-drink eats drinks");
    }
    if (/trolley|sprinter|nctd|coaster|transit center|light rail|breeze|\bbus\b|public transit/.test(low)) {
      extra.push("sprinter escondido transit center breeze coaster directions trolley");
    }
    if ((/\bparking\b|\bcar\b|vehicle|\brv\b/.test(low) || /\bpark\b/.test(low)) && !/safari|national park|zoo|trail|hike/.test(low)) {
      extra.push("parking complimentary vehicle lot");
    }
    if (/check[\s-]?in|arrival|get\s+(our|my)\s+room|front\s*desk|key\s*card/.test(low)) {
      extra.push("check in check out front desk id age policy");
    }
    if (/check[\s-]?out|departure|late\s*checkout|leave\s+(the\s*)?room|extend\s*stay/.test(low)) {
      extra.push("checkout departure late policy front desk");
    }
    if (/rate|price|cost|how\s+much|expensive|cheap|afford|nightly|per\s*night/.test(low)) {
      extra.push("rates booking reservation rooms");
    }
    if (/extra\s*bed|rollaway|cot|sleeper\s*sofa|more\s*bedding/.test(low)) {
      extra.push("suite queen rollaway family sleeps amenities");
    }
    if (!extra.length) return raw;
    return String(raw || "") + " " + extra.join(" ");
  }

  function looksLikeGibberishQuery(raw) {
    const core = normalizeWords(canonTypoNames(raw || "")).replace(/\?/g, "").trim();
    if (!core) return true;
    const tokens = core.split(" ").filter(Boolean);
    if (tokens.length === 1) {
      const w = tokens[0];
      if (w.length <= 2) return true;
      if (w.length <= 4 && !/[aeiouy]/i.test(w)) return true;
    }
    return false;
  }

  /**
   * @param {string} query
   * @param {{ relaxed?: boolean }} [opts] relaxed: lower score floor for paraphrases (still requires core term overlap)
   */
  function search(query, opts) {
    try {
      const relaxed = !!(opts && opts.relaxed);
      if (!chunks.length) return null;
      if (!bm25Ready) rebuildBm25Stats();

      if (looksLikeGibberishQuery(query)) return null;

      const boostedQuery = expandQueryForSearch(canonTypoNames(query));
      const qNorm = normalizeWords(boostedQuery);
      let qTerms = [...termsFromString(boostedQuery)];
      if (!qTerms.length && qNorm.length > 2) {
        const fallback = qNorm.split(" ").filter((w) => w.length > 1);
        if (fallback.length) qTerms.push(...fallback.slice(0, 12));
      }
      if (!qTerms.length) return null;

      const head = normalizeWords(query).slice(0, 72);
      const coreTerms = [...termsFromString(canonTypoNames(query))];
      let best = null;
      let bestScore = -1;

      for (const c of chunks) {
        if (!c || !c.text || !c.terms || !c.termFreq) continue;
        let hitAny = false;
        for (let i = 0; i < qTerms.length; i++) {
          if (c.terms.has(qTerms[i])) {
            hitAny = true;
            break;
          }
        }
        if (!hitAny) continue;

        let score = bm25Score(c, qTerms);
        const cNorm = normalizeWords(c.text);
        if (head.length >= 10 && cNorm.includes(head)) score += 2.2;
        for (let i = 0; i < qTerms.length; i++) {
          const t = qTerms[i];
          if (t.length >= 5 && cNorm.includes(t)) score += 0.2;
        }

        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }

      if (!best || bestScore < 0) return null;

      let coreHits = 0;
      for (let i = 0; i < coreTerms.length; i++) {
        if (best.terms.has(coreTerms[i])) coreHits++;
      }
      if (coreTerms.length > 0 && coreHits === 0) return null;

      const topicBoost = /mediter|safari|pool|pet|cancel|deposit|wifi|breakfast|shuttle|checkin|checkout|check\s*in|check\s*out|hour|policy|package|luggage|age|minor|accessible|parking/.test(
        String(query || "").toLowerCase()
      );
      /* Floor always on — short queries used to skip this and could quote unrelated passages */
      const minBm25 = topicBoost ? (relaxed ? 0.055 : 0.1) : relaxed ? 0.085 : 0.17;
      if (bestScore < minBm25) return null;

      return {
        text: best.text,
        href: best.href,
        label: best.label,
        score: bestScore,
        hits: coreHits || 1
      };
    } catch (_) {
      return null;
    }
  }

  global.MM_KNOWLEDGE = {
    load,
    search,
    get size() {
      return chunks.length;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
