// Downscales and re-encodes a card's site/img/*.png to JPEG, so generated
// artwork doesn't land in the repo as 8 MB PNGs. Uses Chromium's canvas (no
// native image toolchain needed).
//
//   node lib/optimise-images.mjs <card> [maxWidth] [quality]

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const slug = process.argv[2];
const MAX_W = Number(process.argv[3] ?? 1200);
const QUALITY = Number(process.argv[4] ?? 0.82);
if (!slug) {
  console.error('usage: node lib/optimise-images.mjs <card> [maxWidth] [quality]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, slug, 'site', 'img');
const pngs = readdirSync(imgDir).filter(f => f.endsWith('.png'));
if (!pngs.length) {
  console.log('nothing to do');
  process.exit(0);
}

const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(CHROME) ? { executablePath: CHROME } : {});
const page = await browser.newPage();

for (const file of pngs) {
  const src = join(imgDir, file);
  const before = readFileSync(src);
  const jpeg = await page.evaluate(async ({ dataUrl, maxW, quality }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality).split(',')[1];
  }, {
    dataUrl: `data:image/png;base64,${before.toString('base64')}`,
    maxW: MAX_W,
    quality: QUALITY,
  });

  const out = src.replace(/\.png$/, '.jpg');
  const buf = Buffer.from(jpeg, 'base64');
  writeFileSync(out, buf);
  unlinkSync(src);
  console.log(`${file} ${(before.length / 1e6).toFixed(1)}MB -> ${(buf.length / 1e3).toFixed(0)}KB`);
}

await browser.close();
