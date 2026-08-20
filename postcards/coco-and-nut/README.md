# Coco & Nut Coffee — rowbo postcard

Print-ready postcard for **Coco and Nut Coffee Wimbledon** (inside Hybrid
Fitness, 82a Plough Lane, London SW17 0BN — 4.6★, 49 Google reviews, opens 7am).

Built from the rowbo postcard design canvas (`Main.dc.html` / `Back.dc.html`):
same cream `#FBF5EC`, ink `#1D0802`, orange `#FA4500`, type scale, spacing,
radii and shadows.

## What's in `dist/`

| File | What it's for |
| --- | --- |
| `coco-and-nut-postcard-print.pdf` | **Send this to the printer.** 2 pages (front, back), A6 landscape + 3 mm bleed (154 × 111 mm). |
| `front.png` / `back.png` | 2400 × 1680 previews (~400 dpi at A6). |
| `site-mobile.jpg` | Screenshot of the mock site, used in the phone mockup. |
| `front.html` / `back.html` / `print.html` | The artboards themselves — edit and re-render. |
| `qr.svg` | The QR on its own, vector. |

## Rebuild

```bash
npm install
npm run build     # QR + site screenshot + artboards + print PDF
npm run verify    # decodes the QR back out of the rendered PNGs
```

`npm run verify` reads `dist/front.png` and `dist/back.png`, decodes the printed
QR and checks it resolves to `config.json`'s `url` — so a layout tweak that
shrinks or clips the code fails loudly instead of shipping an unscannable card.

## Changing the copy

Everything recipient-specific lives in `config.json` (name, greeting, address,
headline, URL, price, sender names). `template.mjs` holds the two artboards;
`site/index.html` is the mock mobile site shown in the phone.

Leave `addressLines` as `[]` to get blank ruled lines for handwriting the
address instead of the printed one.

## Before it goes to print

- **The URL is a placeholder** — `rowbo.dev/coco-and-nut` needs to exist and
  serve the real site before these are posted; the QR encodes it verbatim.
- **The greeting is to the business**, not a person — Google doesn't name the
  owner. Swap `greeting` in `config.json` if you find the name first; a first
  name lifts response rates on cold post noticeably.
- **Menu prices in the mock site are placeholders** (Google only gives the
  £1–10 band). Worth confirming, or dropping the prices, before the site is live.
- **No photography yet** — the mock site uses illustrated tiles. Their Google
  photos (latte art, branded sandwich wrappers, doughnuts) would be a big
  upgrade on the phone screen, and are the pitch's whole point.
- `TASA Orbiter` isn't bundled (licensed font). Renders here fall back to the
  bundled Inter; install the real face before final artwork if you want the
  headline exactly as the canvas shows it.
