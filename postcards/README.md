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
| `generic-cafe/` | Any independent cafe | Demo site at `rowbo.dev/cafe`, handed over in person |
| `gym/` | Gyms and studios | Demo at `rowbo.dev/gym` — timetable, membership, class booking |
| `barber/` | Barbers and hairdressers | Demo at `rowbo.dev/barber` — price list and chair booking |
| `nails/` | Nail salons | Demo at `rowbo.dev/nails` — treatment list and booking |
| `plumber/` | Plumbers and tradespeople | Demo at `rowbo.dev/plumber` — call-out prices, quote requests |

The five handouts share a cover and a back; only the trade word in the note
("your timetable" / "your price list" / …), one panel bullet and the demo site
behind the QR change between them.

`generic-cafe` runs **layout B** (`layout: "b"` in config) — the design chosen
for the first café batch: headline over an accent line with the QR low-left on
the cover, and a full-bleed dark panel of inclusions beside a cream
how-to-start column on the back. The other cards run the original layout.

Layout B's cover takes its own palette from `coverTheme`, which overrides
`theme` on slide 1 only: the café card runs dark espresso paper, white type,
rowbo orange for the accent line, the white-wordmark logo and a white tile
under the QR so it still scans. `coverTheme.phoneShadow` carries the phone's
drop shadow and `coverTheme.phoneGlow` the halo of screen light behind it,
without which the phone reads as a flat cut-out on a dark card. `phoneRail`
and `phoneButton` override the aluminium edge and the side buttons.

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
assets/       rowbo logo artwork + brand fonts, shared by every card
<card>/
  config.json   name, greeting, address, headline, note copy, URL, price
  site/         the mock mobile site shown in the phone mockup
  dist/         generated — artwork and the print PDF
```

## Palette

Posted cards use the design canvas palette (cream, ink brown, orange). A card
can override any of it with `theme` in its config — `generic-cafe` runs warm
off-white paper and navy ink with rowbo orange as the only accent; its demo site
runs warm cream and near-black of its own, set in Source Serif 4 over a
full-bleed hero photograph with the copy reversed out in white. `lib/recolour-logo.mjs` makes single-colour versions of
the logo (`rowbo-logo-orange.png` is the mark *and* the wordmark in `#FA4500`).
The QR ink follows `theme.ink`, so it stays legible in the card's own colour.

`theme.coverImage` puts a photo behind the front artboard — blurred by
`theme.coverBlur` px under a paper-coloured veil, densest on the left, so the
card reads as frosted glass without costing the headline contrast. No card uses
it at the moment; `generic-cafe/site/img/cover-bg.jpg` is there if the frosted
cover is ever wanted back. The back never takes the photo.

## Build

```bash
npm install
node lib/build.mjs bliss-in-the-park     # QR + site screenshot + artboards + print PDF
node lib/verify-qr.mjs bliss-in-the-park # decodes the QR back out of the rendered PNGs
```

`verify-qr` reads `dist/front.png` and `dist/back.png`, decodes the printed QR
and checks it resolves to that card's `url` — so a layout tweak that shrinks or
clips the code fails loudly instead of shipping an unscannable card.

```bash
node lib/verify-print.mjs generic-cafe   # page size and image resolution
```

`verify-print` opens the print PDFs and checks what a printer's preflight
checks: that every page measures exactly trim plus bleed, and that every raster
image clears 300 dpi *as placed*. It walks the nested form XObjects Chromium
wraps a page in and multiplies the matrices down the chain, so the number is
the real one rather than the image's own pixel count. Run it before any upload:

```
generic-cafe-print-front-216x154mm.pdf  (1 page)
  PASS  page 216.00 x 154.00mm (want 216 x 154)
  PASS  2 images, lowest 538 dpi (want 300+) — 1170x2532px placed 55.3 x 119.3mm
```

Only two things on the card are raster at all — the phone screenshot and the
logo. Type is live font, the QR is vector, and the flat colour is vector fill.
Watch CSS `filter` in particular: Chromium rasterises a filtered layer at
exactly 300 dpi, so the phone's glow used to land on the limit until it was
rewritten as a plain radial gradient, which the PDF carries as a shading.

`node lib/optimise-images.mjs <card> [maxWidth] [quality]` re-encodes anything
dropped in `<card>/site/img/` as JPEG, so generated artwork doesn't land in the
repo as 8 MB PNGs.

## What each card produces

| File | What it's for |
| --- | --- |
| `dist/<card>-print-front-<w>x<h>mm.pdf` / `-back-` | **Upload these.** One page each, at the card's trim size plus 3 mm bleed on every edge — instantprint's two-file upload wants a separate FRONT and BACK. `generic-cafe` is A5 landscape, so 216 × 154 mm. |
| `dist/<card>-print-both-<w>x<h>mm.pdf` | The same two pages in one file, for a printer that asks for a single upload. |
| `dist/<card>-print-guides.pdf` | The same two pages with the cut line (red, 3 mm in) and the safe zone (blue, 6 mm in) drawn on top, watermarked **PROOF · NOT FOR UPLOAD**. Check against this, upload the other one. |
| `dist/<card>-both-slides.pdf` | **Both sides in one file, whole and uncropped** — the one to send someone who just wants to look at the card. 2 pages at the artboard's own ratio (148 × 103.6 mm), so nothing is trimmed into the bleed. |
| `dist/front.png` / `back.png` | 2400 × 1680 previews (~400 dpi at A6). |
| `dist/site-mobile.jpg` | Screenshot of the mock site, used in the phone mockup. |
| `dist/<card>-a4-<n>up.pdf` | Handouts only, for running a few off in the office. An A6 tiles four to an A4 landscape sheet; an A5 tiles two to an A4 portrait one. Print duplex, **flip on short edge**, then cut. |
| `dist/*.html`, `dist/qr.svg` | The artboards and the QR on its own, for hand-editing. |

## Sending artwork to a printer

`trimMm: [w, h]` in a card's config sets the finished size; the build adds 3 mm
of bleed on every edge and reports where the copy lands:

```
trim 210x148mm, page 216x154mm (+3mm bleed all round)
artwork covers the page, 2.0mm trimmed off each side and 0.0mm off top and bottom
nearest copy sits 6.0mm inside the cut line (needs 3mm)
print PDF page measures 216.00 x 154.00mm
```

The artboard is 800 × 560, which is not quite any paper ratio, so it is scaled
to *cover* the bleed page and the surplus is trimmed. That surplus is bleed,
never artwork: the check above fails loudly if a trim-size change ever pushes
copy inside the safe zone.

Chromium can only make PDF pages in steps of 1/75 in (0.339 mm) and rounds up,
so a page asked for at 216 mm comes out at 216.24 and a printer's preflight
reads it as the wrong size and rescales the file. The build renders a hair
oversize and then narrows each page's MediaBox to the exact size, centred,
writing the new box over the old at the same byte length so the cross-reference
table stays valid. `generic-cafe` matches instantprint's own A5 template
(154 × 216 mm portrait; ours is the same rotated) to within 2 microns.

One thing the build cannot do: **the PDFs are RGB.** Chromium has no CMYK
output. instantprint and most online printers convert on receipt, which shifts
saturated colour slightly — rowbo orange `#FA4500` will come back a little
flatter. That is normal for this route; if a run ever needs to match exactly,
the file has to go through a CMYK conversion first.

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
- **Photography.** `bliss-in-the-park` and every handout use AI-generated
  imagery (Higgsfield / nano-banana). On the handouts that's fine as-is —
  those demos aren't claiming to be anyone's shop. On a card made for a specific
  business, swap in their own photos before the site goes live: a generated
  dish is not their dish and shouldn't be presented as it.
- **Prices and dates** are transcribed from public posts and posters. Worth a
  glance before print in case they've moved on.
## Fonts and logo

Both faces come from the rowbo font pack and are bundled as woff2 in
`assets/fonts`, so a render is identical anywhere and no system font is
assumed:

- **TASA Orbiter** (SemiBold / Bold / ExtraBold) — headlines, the scan line,
  the panel title, the sign-off.
- **Inter** (400 / 600 / 700 / 800) — body copy, bullets, small print.

The demo sites are not rowbo, so they set their own type. `generic-cafe` runs
**Source Serif 4**, bundled as a variable woff2 on both weight (200-900) and
optical size (8-60), so headlines take the display cut and small text the text
cut from one file.

Logo artwork is the official pack (`Logomark` lockup):
`rowbo-logo.png` is the brand default (orange mark, ink wordmark) and is what
the two posted cards use; `rowbo-logo-orange.png` and `rowbo-logo-navy.png`
are single-colour versions made from it by `lib/recolour-logo.mjs`, and the
handouts run the orange one. `rowbo-logo-on-dark.png` keeps the orange mark and
knocks the wordmark out to white for dark backgrounds (`recolour-logo.mjs
--wordmark`), and is what the café cover uses. `rowbo-logo.svg` is there for
anything vector.
