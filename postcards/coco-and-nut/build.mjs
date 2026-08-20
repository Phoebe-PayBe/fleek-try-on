// Builds the Coco & Nut postcard: real QR code, mock-site screenshot for the
// phone mockup, both artboards as HTML + PNG, and a print-ready A6 PDF.
//
//   npm install && node build.mjs
//
// Outputs land in dist/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import QRCode from 'qrcode';
import { chromium } from 'playwright';
import { front, back, fontFaces, W, H } from './template.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const cfg = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));

// --- print geometry -------------------------------------------------------
// A6 landscape (148 x 105 mm) plus 3 mm bleed on every edge.
const BLEED_MM = 3;
const PAGE_W_MM = 148 + BLEED_MM * 2;
const PAGE_H_MM = 105 + BLEED_MM * 2;
const MM = 96 / 25.4; // CSS px per mm
// Scale the 800x560 artboard to cover the bleed page (uniform, so nothing
// stretches; the overflow is trimmed at the bleed edge, well outside the
// 40 px safety padding the layout already uses).
const SCALE = Math.max((PAGE_W_MM * MM) / W, (PAGE_H_MM * MM) / H);

// --- QR -------------------------------------------------------------------
// Error correction M: comfortably scannable at the 56 px / 76 px printed sizes.
const rawQr = await QRCode.toString(cfg.url, {
  type: 'svg',
  margin: 0,
  errorCorrectionLevel: 'M',
  color: { dark: '#1D0802', light: '#ffffff' },
});
const qrSvg = rawQr
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/width="[^"]*"/, 'width="100%"')
  .replace(/height="[^"]*"/, 'height="100%"');
writeFileSync(join(dist, 'qr.svg'), rawQr);

// --- render ---------------------------------------------------------------
// This container ships Chromium at a fixed path (PLAYWRIGHT_BROWSERS_PATH);
// fall back to Playwright's own download when running elsewhere.
const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(CHROME) ? { executablePath: CHROME } : {}
);

// 1. Mock mobile site -> the screen inside the phone mockup on the front.
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
});
await phone.goto(`file://${join(root, 'site', 'index.html')}`);
await phone.evaluate(() => document.fonts.ready);
await phone.screenshot({ path: join(dist, 'site-mobile.jpg'), quality: 92, type: 'jpeg' });
await phone.close();

// 2. Artboards.
const frontHtml = front(cfg, qrSvg);
const backHtml = back(cfg, qrSvg);
writeFileSync(join(dist, 'front.html'), frontHtml);
writeFileSync(join(dist, 'back.html'), backHtml);

const card = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 3, // 2400 x 1680 px ≈ 400 dpi at A6
});
for (const [name, html] of [['front', frontHtml], ['back', backHtml]]) {
  await card.goto(`file://${join(dist, `${name}.html`)}`);
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: join(dist, `${name}.png`) });
  void html;
}
await card.close();

// 3. Print PDF: two pages, A6 + bleed, artwork scaled to cover.
const artboard = html => html.split('<body>')[1].split('</body>')[0];
const printHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
  @page { size: ${PAGE_W_MM}mm ${PAGE_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #FBF5EC; }
  .page {
    width: ${PAGE_W_MM}mm; height: ${PAGE_H_MM}mm; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background: #FBF5EC; break-after: page;
  }
  .page:last-child { break-after: auto; }
  .art { transform: scale(${SCALE.toFixed(5)}); transform-origin: center center; flex: 0 0 auto; }
</style></head><body>
  <div class="page"><div class="art">${artboard(frontHtml)}</div></div>
  <div class="page"><div class="art">${artboard(backHtml)}</div></div>
</body></html>`;
writeFileSync(join(dist, 'print.html'), printHtml);

const printPage = await browser.newPage();
await printPage.goto(`file://${join(dist, 'print.html')}`);
await printPage.evaluate(() => document.fonts.ready);
await printPage.pdf({
  path: join(dist, 'coco-and-nut-postcard-print.pdf'),
  width: `${PAGE_W_MM}mm`,
  height: `${PAGE_H_MM}mm`,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await printPage.close();

await browser.close();
console.log(`Built dist/ — QR -> ${cfg.url}, page ${PAGE_W_MM}x${PAGE_H_MM}mm (A6 + ${BLEED_MM}mm bleed)`);
