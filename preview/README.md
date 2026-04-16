# Motel Mediteran — local preview site

This folder is a **static HTML preview** of the modernized motel site. Styling and homepage **section order** are aligned with your WordPress export **`site-export/`** (Assembler theme: `theme.json` colors, Inter typography, square buttons, cover hero, gray “section-1” amenities band, columns + reviews — see `site-export/templates/home.html`).

Use this to review layout, copy, and **your real room photos** before mirroring the same blocks in the WordPress Site Editor.

## View locally

From this folder:

```bash
cd preview
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

**Important:** `index.html` loads **WordPress core block CSS** from a CDN (same rules as the block editor front-end). You need an internet connection for the first load.

### True 1:1 home page (theme export)

The home page is **generated from your export**, not hand-written:

```bash
python3 preview/scripts/build-home-1to1.py
```

That merges `site-export/templates/home.html` + `parts/header.html` + `parts/footer.html`, expands blocks that have no static HTML (`site-title`, `navigation` ref, `social-link`), strips block comments, and writes `preview/index.html`. Image URLs stay exactly as saved in the export (WordPress.com media).

(You can also double-click `index.html`, but a local server avoids some browser restrictions for maps/fonts.)

### “What people are saying” → Google reviews (5★ only, rotating)

Google **does not allow** embedding your API key in the browser, so the site **cannot** read reviews directly from Google on every page load. The preview uses:

1. **`preview/data/google-reviews.json`** — list of reviews (text, author, rating, photo URL). You can keep **hundreds** of curated 5★ quotes; the Places API only returns a few, so merge or paste more rows as needed.
2. **`preview/google-reviews.js`** — loads that file, **keeps only 5-star** reviews, shuffles them, shows **three** at a time with a **new random trio on each full page refresh**, and **rotates** every **1 minute** while the tab stays open (change `data-rotate-ms` on `#google-reviews-root`; values **below 4000** disable timed rotation).

**Refresh the JSON from Google (run on your computer or on a schedule):**

1. Create a local `.env` file in the repo root (next to `scripts/`), based on `.env.example`.
   - Put your real `GOOGLE_PLACES_API_KEY`
   - Put your real `GOOGLE_PLACE_ID`
2. Then run:
```bash
cd ..   # repo root "motel med"
python3 scripts/fetch_google_reviews.py
```

Requirements: Google Cloud project, **Places API** enabled, billing on. The Place Details response usually includes **at most five** reviews; the script overwrites the JSON with that fetch—**copy or merge** into a larger curated `reviews` array if you want more than five quotes on the site.

**WordPress (motel54.wordpress.com):** you’ll need either a **reviews plugin/widget**, a **scheduled job + hosted JSON** that you paste or load via custom HTML, or a small **serverless function** that calls the API with a secret key—same rule: **never put the API key in public theme JavaScript.**

## What’s included

- `index.html` — **Home built from** `../site-export/templates/home.html` (real `wp-block-*` markup) + **WordPress 6.6 block library CSS** + your photos in `assets/motel-pics/`
- `global-styles.css` — CSS variables & global rules from `../site-export/theme.json`
- `wp-compat.css` — small fixes (nav, Jetpack stars, cover contrast)
- `index-wp-body.html` — regenerated body only (for debugging; can be deleted)
- `rooms.html` — All room categories matching your `MOTEL PICS` folders
- `amenities.html` — Services list + office/laundry photos
- `directions.html` — Map + address
- `accessibility.html` — Collapsible sections (accordion-style) with legacy accessibility text
- `assets/motel-pics/` — Copy of your **Downloads/MOTEL PICS** images (52 files)

## Booking link

Reservation buttons use the legacy clean Booking URL:

`http://www.booking.com/hotel/us/motel-mediteran.html?aid=330843&lang=en&pb=1`

## Next step

After you approve this preview, replicate sections in **WordPress Site Editor** (Cover hero, columns, image grids, accordion for Accessibility) and upload the same photos to the Media Library.
