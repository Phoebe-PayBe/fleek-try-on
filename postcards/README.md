# rowbo outreach postcards

Print-ready A6 postcards for local businesses with no website: a note on the
back, a QR on the front, and a phone mockup showing the site we've already
built them.

Built from the rowbo postcard design canvas (`Main.dc.html` / `Back.dc.html`):
same cream `#FBF5EC`, ink `#1D0802`, orange `#FA4500`, type scale, spacing,
radii and shadows.

## Cards

| Card | Who | Hook |
| --- | --- | --- |
| `coco-and-nut/` | Coco and Nut Coffee, inside Hybrid Fitness, 82a Plough Ln SW17 0BN | Speciality coffee in a gym — no site, so non-members never find it |
| `bliss-in-the-park/` | Bliss in the Park, South Park Gardens SW19 8PN | Mauritian food + live music Fridays; Facebook-only, WhatsApp pre-orders |

## Layout

```
lib/          template.mjs (the two artboards), build.mjs, verify-qr.mjs, optimise-images.mjs
assets/       rowbo logo + bundled fonts, shared by every card
<card>/
  config.json   name, greeting, address, headline, note copy, URL, price
  site/         the mock mobile site shown in the phone mockup
  dist/         generated — artwork and the print PDF
```

## Build

```bash
npm install
node lib/build.mjs bliss-in-the-park     # QR + site screenshot + artboards + print PDF
node lib/verify-qr.mjs bliss-in-the-park # decodes the QR back out of the rendered PNGs
```

`verify-qr` reads `dist/front.png` and `dist/back.png`, decodes the printed QR
and checks it resolves to that card's `url` — so a layout tweak that shrinks or
clips the code fails loudly instead of shipping an unscannable card.

`node lib/optimise-images.mjs <card> [maxWidth] [quality]` re-encodes anything
dropped in `<card>/site/img/` as JPEG, so generated artwork doesn't land in the
repo as 8 MB PNGs.

## What each card produces

| File | What it's for |
| --- | --- |
| `dist/<card>-postcard-print.pdf` | **Send this to the printer.** 2 pages (front, back), A6 landscape + 3 mm bleed (154 × 111 mm). |
| `dist/front.png` / `back.png` | 2400 × 1680 previews (~400 dpi at A6). |
| `dist/site-mobile.jpg` | Screenshot of the mock site, used in the phone mockup. |
| `dist/*.html`, `dist/qr.svg` | The artboards and the QR on its own, for hand-editing. |

## Adding a card

Copy an existing card folder, rewrite `config.json` and `site/index.html`, and
build. Nothing else needs touching — `lib/` and `assets/` are shared.

Write the site from what the business actually publishes: their menu, prices,
opening hours, event dates, the things reviews single out. The pitch only lands
if the phone on the postcard looks like *their* site rather than a template.

## Before any card goes to print

- **The URLs are placeholders.** `rowbo.dev/<card>` has to exist and serve the
  real site before the cards are posted; the QR encodes it verbatim.
- **Check who you're addressing.** Both cards currently greet the business, not
  a person — a first name lifts response rates on cold post noticeably.
- **Photography.** `bliss-in-the-park` uses AI-generated placeholder imagery
  (Higgsfield / nano-banana): a park evening, a curry roti bowl, prawns,
  pastries. They stand in for the real thing and should be swapped for the
  business's own photos before the site goes live — a generated dish is not
  their dish, and shouldn't be presented as it on a live site.
- **Prices and dates** are transcribed from public posts and posters. Worth a
  glance before print in case they've moved on.
- `TASA Orbiter` isn't bundled (licensed font). Renders fall back to the bundled
  Inter; install the real face before final artwork if you want the headline
  exactly as the canvas shows it.
