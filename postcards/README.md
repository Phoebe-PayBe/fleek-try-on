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
| `generic-cafe/` | Nobody in particular — a handout for any independent cafe | Generic demo site at `rowbo.dev/cafe`, handed over in person |

Cards come in two shapes, set by `variant` in config:

- **`mailer`** (default) — postage box and address panel on the back, for post.
- **`handout`** — no address; the back's right-hand side sells instead
  ("Included for £30/mo"), and the build also produces a 4-up A4 sheet. The
  front carries only the headline and "Scan to see it live" (`priceLine: false`
  drops the price sub-line), so the cover stays quiet.

## Layout

```
lib/          template.mjs (the artboards), build.mjs, verify-qr.mjs,
              optimise-images.mjs, recolour-logo.mjs
assets/       rowbo logo + bundled fonts, shared by every card
<card>/
  config.json   name, greeting, address, headline, note copy, URL, price
  site/         the mock mobile site shown in the phone mockup
  dist/         generated — artwork and the print PDF
```

## Palette

Posted cards use the design canvas palette (cream, ink brown, orange). A card
can override any of it with `theme` in its config — `generic-cafe` runs cream
white paper and navy ink with rowbo orange as the only accent; its demo site
runs a warmer scheme of its own (cream, espresso brown, Playfair Display). `lib/recolour-logo.mjs` makes single-colour versions of
the logo (`rowbo-logo-orange.png` is the mark *and* the wordmark in `#FA4500`).
The QR ink follows `theme.ink`, so it stays legible in the card's own colour.

`theme.coverImage` puts a photo behind the front artboard — blurred by
`theme.coverBlur` px and covered by a cream veil that is densest on the left,
so the card reads as frosted glass without costing the headline any contrast.
The back stays plain paper.

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
| `dist/<card>-a4-4up.pdf` | Handouts only: four cards to an A4 landscape sheet. Print duplex, **flip on short edge**, then cut the sheet in quarters — an A6 is exactly a quarter of an A4, so there's nothing to trim. |
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
- **Check who you're addressing.** The two posted cards greet the business, not
  a person — a first name lifts response rates on cold post noticeably. (The
  handout is deliberately generic: it opens "Hey - we made you a website.")
- **Photography.** `bliss-in-the-park` and `generic-cafe` use AI-generated
  imagery (Higgsfield / nano-banana). On `generic-cafe` that's fine as-is —
  the demo isn't claiming to be anyone's shop. On a card made for a specific
  business, swap in their own photos before the site goes live: a generated
  dish is not their dish and shouldn't be presented as it.
- **Prices and dates** are transcribed from public posts and posters. Worth a
  glance before print in case they've moved on.
- `TASA Orbiter` isn't bundled (licensed font). Renders fall back to the bundled
  Inter; install the real face before final artwork if you want the headline
  exactly as the canvas shows it.
