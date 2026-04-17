#!/usr/bin/env python3
"""
Download public Google reviews for a Place (via Place Details) and write
preview/data/google-reviews.json for google-reviews.js.

Requirements
------------
1. Google Cloud project with billing enabled
2. Enable "Places API" (legacy Place Details endpoint used here)
3. Create an API key restricted to Places API

Environment variables
-----------------------
  GOOGLE_PLACES_API_KEY   (required) API key
  GOOGLE_PLACE_ID         (required) e.g. ChIJ... from Google Place ID finder

Optional:
  GOOGLE_MAPS_URL         Override link shown for "See all reviews"

Usage
-----
  export GOOGLE_PLACES_API_KEY="your_key"
  export GOOGLE_PLACE_ID="ChIJxxxxxxxx"
  python3 scripts/fetch_google_reviews.py

Cron (example, weekly):
  0 6 * * 1 cd /path/to/motel\ med && GOOGLE_PLACES_API_KEY=... GOOGLE_PLACE_ID=... python3 scripts/fetch_google_reviews.py

Note: Google typically returns at most 5 reviews in the Place Details response.
The site shows only 5-star reviews. For more quotes, edit preview/data/google-reviews.json
and add objects to "reviews" (hundreds are fine); each page refresh shows a random batch.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "preview" / "data" / "google-reviews.json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


def _load_dotenv(path: Path) -> None:
    """
    Minimal `.env` loader (no external dependencies).
    Supports lines like `KEY=VALUE` with optional surrounding quotes.
    """
    if not path.exists():
        return

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip()
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        if not k:
            continue

        current = os.environ.get(k, "").strip()
        placeholders = {"YOUR_KEY", "YOUR_GOOGLE_PLACES_API_KEY", "YOUR_PLACE_ID", "YOUR_GOOGLE_PLACE_ID", "CHANGE_ME", ""}
        if (not current) or (current in placeholders):
            os.environ[k] = v


def main() -> int:
    # Load local credentials from `.env` if present.
    _load_dotenv(ROOT / ".env")

    key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    place_id = os.environ.get("GOOGLE_PLACE_ID", "").strip()
    # Help users: don't proceed with placeholder values.
    if key in {"YOUR_KEY", "YOUR_GOOGLE_PLACES_API_KEY", "CHANGE_ME", ""} or place_id in {
        "YOUR_PLACE_ID",
        "YOUR_GOOGLE_PLACE_ID",
        "CHANGE_ME",
        "",
    }:
        print(
            "Set GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID.\n"
            "Find Place ID: Google Maps → your business → Share → Copy link, "
            "or use Google's Place ID finder.",
            file=sys.stderr,
        )
        return 1

    fields = "name,reviews,rating,user_ratings_total,url"
    qs = urllib.parse.urlencode(
        {"place_id": place_id, "fields": fields, "key": key}
    )
    url = f"{DETAILS_URL}?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})

    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.load(resp)

    status = payload.get("status")
    if status != "OK":
        err = payload.get("error_message") or status
        print(f"Places API error: {err}", file=sys.stderr)
        return 1

    result = payload.get("result") or {}
    place_name = result.get("name") or "Motel Mediteran"
    maps_url = os.environ.get("GOOGLE_MAPS_URL", "").strip() or result.get("url") or ""

    reviews_out = []
    for r in result.get("reviews") or []:
        try:
            rating = int(r.get("rating") or 0)
        except (TypeError, ValueError):
            rating = 0
        reviews_out.append(
            {
                "authorName": (r.get("author_name") or "").strip(),
                "rating": rating,
                "text": (r.get("text") or "").strip(),
                "relativeTime": (r.get("relative_time_description") or "").strip(),
                "authorPhotoUrl": (r.get("profile_photo_url") or "").strip(),
            }
        )

    out = {
        "placeName": place_name,
        "googleMapsUri": maps_url,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "rating": result.get("rating"),
        "userRatingsTotal": result.get("user_ratings_total"),
        "reviews": reviews_out,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(reviews_out)} review(s) total, all ratings; site shows 5★ only)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
