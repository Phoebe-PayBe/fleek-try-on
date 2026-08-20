// Decodes the QR code out of the rendered artwork (dist/front.png and
// dist/back.png), not out of the source SVG — so a layout change that shrinks
// or clips a code is caught before the card goes to print.
//
//   node verify-qr.mjs

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
const jsQrSource = readFileSync(
  join(root, 'node_modules', 'jsqr', 'dist', 'jsQR.js'), 'utf8');

const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(CHROME) ? { executablePath: CHROME } : {});
const page = await browser.newPage();
await page.addScriptTag({ content: jsQrSource });

let failed = false;
for (const side of ['front', 'back']) {
  const png = readFileSync(join(root, 'dist', `${side}.png`)).toString('base64');
  const result = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
    // eslint-disable-next-line no-undef
    return jsQR(data, width, height)?.data ?? null;
  }, `data:image/png;base64,${png}`);

  const ok = result === cfg.url;
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${side}.png -> ${result ?? 'no QR found'}`);
}

await browser.close();
process.exit(failed ? 1 : 0);
