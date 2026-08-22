// Recolours the rowbo logo mark for cards that don't run the orange palette.
// Every non-transparent pixel is re-tinted to <hex>, keeping its alpha and
// relative lightness, so the mark and the wordmark stay one colour family.
//
//   node lib/recolour-logo.mjs rowbo-logo.png rowbo-logo-navy.png "#16233F"

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const [src, out, hex] = process.argv.slice(2);
if (!src || !out || !hex) {
  console.error('usage: node lib/recolour-logo.mjs <src.png> <out.png> <#rrggbb>');
  process.exit(1);
}

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(CHROME) ? { executablePath: CHROME } : {});
const page = await browser.newPage();

const png = await page.evaluate(async ({ dataUrl, hex }) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [tr, tg, tb] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    // Keep each pixel's own lightness so anti-aliased edges stay smooth, but
    // pull dark pixels all the way to the target rather than washing them out.
    const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    const lift = 0.25 * lum; // at most a quarter-step towards white
    px[i] = Math.round(tr + (255 - tr) * lift);
    px[i + 1] = Math.round(tg + (255 - tg) * lift);
    px[i + 2] = Math.round(tb + (255 - tb) * lift);
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1];
}, {
  dataUrl: `data:image/png;base64,${readFileSync(join(assets, src)).toString('base64')}`,
  hex,
});

writeFileSync(join(assets, out), Buffer.from(png, 'base64'));
await browser.close();
console.log(`${src} -> ${out} (${hex})`);
