#!/usr/bin/env python3
"""
Build preview/index.html 1:1 with site-export theme markup:
- home.html + expanded header.html + footer.html
- Preserves WordPress.com media URLs from export (same as Site Editor save)
- Expands wp:site-title and wp:navigation (refs not in export)
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # …/motel med
EXPORT = ROOT / "site-export"
PREVIEW = ROOT / "preview"
PREVIEW_THEME_CSS = PREVIEW / "site-export-style.css"

# Exact self-closing blocks from export that produce no HTML when stripped
HEADER_TP = '<!-- wp:template-part {"slug":"header","tagName":"header","align":"wide"} /-->'

FOOTER_TP = (
    '<!-- wp:template-part {"slug":"footer","tagName":"footer",'
    '"className":"site-footer-container"} /-->'
)

# Navigation HTML matching WP 6.x block output (class names from theme + block library)
NAV_HTML = """<nav class="is-responsive items-justified-right no-wrap wp-block-navigation order-1 md:order-0 is-content-justification-right is-layout-flex wp-block-navigation-is-layout-flex" aria-label="Navigation"><ul class="wp-block-navigation__container is-responsive wp-block-navigation"><li class=" wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content" href="index.html"><span class="wp-block-navigation-item__label">Home</span></a></li><li class=" wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content" href="rooms.html"><span class="wp-block-navigation-item__label">Rooms</span></a></li><li class=" wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content" href="amenities.html"><span class="wp-block-navigation-item__label">Amenities</span></a></li><li class=" wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content" href="directions.html"><span class="wp-block-navigation-item__label">Directions</span></a></li><li class=" wp-block-navigation-item wp-block-navigation-link"><a class="wp-block-navigation-item__content" href="accessibility.html"><span class="wp-block-navigation-item__label">Accessibility</span></a></li></ul></nav>"""

# Header brand: call icon + E.164-style number (no duplicate site name; hero has the title).
SITE_TITLE_HTML = (
    '<p class="site-header-call">'
    '<a class="header-phone-link" href="tel:+17607432300" '
    'aria-label="Call Motel Mediteran at +1 760 743 2300">'
    '<span class="header-phone-icon" aria-hidden="true">'
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 '
    "19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 "
    '2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'
    "</svg></span>"
    '<span class="header-phone-number">+1 (760) 743-2300</span></a></p>'
)


def clean_block_comments(text: str) -> str:
    lines = []
    for line in text.splitlines():
        line = re.sub(r"<!--\s*wp:.*?/-->", "", line)
        line = re.sub(r"<!--\s*/wp:.*?-->", "", line)
        line = re.sub(r"<!--\s*wp:.*?-->", "", line)
        lines.append(line.rstrip())
    return "\n".join(lines)


def normalize_html_whitespace(html: str) -> str:
    """Remove huge gaps left after stripping block comments."""
    html = re.sub(r"\n{3,}", "\n\n", html)
    return html.strip() + "\n"


def expand_header(raw: str) -> str:
    raw = raw.replace("<!-- wp:site-title /-->", SITE_TITLE_HTML)
    raw = raw.replace(
        '<!-- wp:navigation {"ref":5,"className":"order-1 md:order-0"} /-->',
        NAV_HTML,
    )
    return clean_block_comments(raw)


def expand_footer(raw: str) -> str:
    """Social links are self-closing block comments; expand to list items like front-end render."""
    raw = raw.replace(
        '<!-- wp:social-link {"url":"#","service":"facebook"} /-->',
        '<li class="wp-social-link wp-block-social-link"><a href="#" class="wp-block-social-link-anchor">Facebook</a></li>',
    )
    raw = raw.replace(
        '<!-- wp:social-link {"url":"#","service":"instagram"} /-->',
        '<li class="wp-social-link wp-block-social-link"><a href="#" class="wp-block-social-link-anchor">Instagram</a></li>',
    )
    raw = raw.replace(
        '<!-- wp:social-link {"url":"#","service":"twitter"} /-->',
        '<li class="wp-social-link wp-block-social-link"><a href="#" class="wp-block-social-link-anchor">Twitter</a></li>',
    )
    return clean_block_comments(raw)


def main() -> None:
    home = (EXPORT / "templates/home.html").read_text(encoding="utf-8")
    head_raw = (EXPORT / "parts/header.html").read_text(encoding="utf-8")
    foot_raw = (EXPORT / "parts/footer.html").read_text(encoding="utf-8")
    export_theme_css = (EXPORT / "style.css").read_text(encoding="utf-8")

    header_html = expand_header(head_raw)
    footer_html = (
        '<footer class="wp-block-template-part site-footer-container">\n'
        + expand_footer(foot_raw)
        + "\n</footer>"
    )

    if HEADER_TP not in home:
        raise SystemExit("home.html missing header template-part marker")

    home = home.replace(HEADER_TP, header_html, 1)

    if FOOTER_TP not in home:
        raise SystemExit("home.html missing footer template-part marker")

    home = home.replace(FOOTER_TP, footer_html, 1)

    body = clean_block_comments(home)
    body = body.replace(
        '<main class="wp-block-group"',
        '<main id="main" class="wp-block-group"',
        1,
    )

    # Final document
    head = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Motel Mediteran — Escondido, CA</title>
<meta name="description" content="Motel Mediteran — static 1:1 build from WordPress theme export (Assembler)." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&amp;family=Great+Vibes&amp;family=Inter:wght@400;450;500;600;700&amp;family=Rye&amp;display=swap" rel="stylesheet" />
<link rel="stylesheet" href="global-styles.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/WordPress/WordPress@6.6.2/wp-includes/css/dist/block-library/style.min.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/WordPress/WordPress@6.6.2/wp-includes/css/dist/block-library/theme.min.css" />
<link rel="stylesheet" href="site-export-style.css" />
<link rel="stylesheet" href="css/motel-map.css?v=ref23" />
<link rel="stylesheet" href="wp-compat-1to1.css?v=ref61" />
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
"""

    body = normalize_html_whitespace(body)

    out = PREVIEW / "index.html"
    PREVIEW_THEME_CSS.write_text(export_theme_css, encoding="utf-8")
    # Subtle motion + Google reviews carousel (data from data/google-reviews.json)
    body = body.replace("</body>", "<script src=\"motion.js\"></script>\n</body>") if "</body>" in body else body
    full = (
        head
        + "\n"
        + body
        + '\n<script src="motion.js"></script>\n'
        + '<script src="js/home-welcome-quotes.js?v=4"></script>\n'
        + '<script src="js/home-amenities-carousel.js?v=7"></script>\n'
        + '<script src="google-reviews.js?v=2" defer></script>\n'
        + "</body>\n</html>"
    )
    out.write_text(full, encoding="utf-8")
    print("Wrote", out)


if __name__ == "__main__":
    main()
