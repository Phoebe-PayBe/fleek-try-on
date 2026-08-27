// Builds one postcard: real QR code, mock-site screenshot for the phone
// mockup, both artboards as HTML + PNG, and a print-ready A6 PDF.
//
//   npm install && node lib/build.mjs <card>      e.g. bliss-in-the-park
//
// Outputs land in <card>/dist/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import QRCode from 'qrcode';
import { chromium } from 'playwright';
import { front, back, frontB, backB, fontFaces, W, H } from './template.mjs';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node lib/build.mjs <card>   (e.g. bliss-in-the-park)');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const card = join(root, slug);
const dist = join(card, 'dist');
mkdirSync(dist, { recursive: true });

const cfg = JSON.parse(readFileSync(join(card, 'config.json'), 'utf8'));

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
  color: { dark: cfg.theme?.qrInk ?? cfg.theme?.ink ?? '#1D0802', light: '#ffffff' },
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
await phone.goto(`file://${join(card, 'site', 'index.html')}`);
await phone.evaluate(() => document.fonts.ready);
await phone.screenshot({ path: join(dist, 'site-mobile.jpg'), quality: 92, type: 'jpeg' });
await phone.close();

// 2. Artboards.
const layoutB = cfg.layout === 'b';
const frontHtml = (layoutB ? frontB : front)(cfg, qrSvg);
const backHtml = (layoutB ? backB : back)(cfg, qrSvg);
writeFileSync(join(dist, 'front.html'), frontHtml);
writeFileSync(join(dist, 'back.html'), backHtml);

const artPage = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 3, // 2400 x 1680 px ≈ 400 dpi at A6
});
for (const [name, html] of [['front', frontHtml], ['back', backHtml]]) {
  await artPage.goto(`file://${join(dist, `${name}.html`)}`);
  await artPage.evaluate(() => document.fonts.ready);
  await artPage.screenshot({ path: join(dist, `${name}.png`) });
  void html;
}
await artPage.close();

// 3. Print PDF: two pages, A6 + bleed, artwork scaled to cover.
const PAPER = cfg.theme?.paper ?? '#FBF5EC';
const artboard = html => html.split('<body>')[1].split('</body>')[0];
const printHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
  @page { size: ${PAGE_W_MM}mm ${PAGE_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: ${PAPER}; }
  .page {
    width: ${PAGE_W_MM}mm; height: ${PAGE_H_MM}mm; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background: ${PAPER}; break-after: page;
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
  path: join(dist, `${slug}-postcard-print.pdf`),
  width: `${PAGE_W_MM}mm`,
  height: `${PAGE_H_MM}mm`,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await printPage.close();

// 4. Both artboards in one PDF, whole and uncropped — the file to send
// someone who just wants to look at the card. Page matches the artboard's
// ratio at A6 width, so nothing is trimmed and nothing is letterboxed.
{
  const PAGE_W = 148;
  const PAGE_H = +(PAGE_W * H / W).toFixed(2);
  const FIT = (PAGE_W * MM) / W;
  const bothHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
  @page { size: ${PAGE_W}mm ${PAGE_H}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: ${PAPER}; }
  .page {
    width: ${PAGE_W}mm; height: ${PAGE_H}mm; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background: ${PAPER}; break-after: page;
  }
  .page:last-child { break-after: auto; }
  .art { transform: scale(${FIT.toFixed(5)}); transform-origin: center center; flex: 0 0 auto; }
</style></head><body>
  <div class="page"><div class="art">${artboard(frontHtml)}</div></div>
  <div class="page"><div class="art">${artboard(backHtml)}</div></div>
</body></html>`;
  writeFileSync(join(dist, 'both-slides.html'), bothHtml);

  const bothPage = await browser.newPage();
  await bothPage.goto(`file://${join(dist, 'both-slides.html')}`);
  await bothPage.evaluate(() => document.fonts.ready);
  await bothPage.pdf({
    path: join(dist, `${slug}-both-slides.pdf`),
    width: `${PAGE_W}mm`,
    height: `${PAGE_H}mm`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await bothPage.close();
}

// 5. Handouts also get a 4-up A4 sheet, for running off a batch on an office
// printer. An A6 is exactly a quarter of an A4, so the cards tile with no
// waste and the cut lines are the two halves of the sheet.
if (cfg.variant === 'handout') {
  const A4_W_MM = 297, A4_H_MM = 210;          // A4 landscape
  const CELL_W_MM = A4_W_MM / 2, CELL_H_MM = A4_H_MM / 2;
  const CELL_SCALE = Math.max((CELL_W_MM * MM) / W, (CELL_H_MM * MM) / H);
  const cell = html => `<div class="cell"><div class="art">${artboard(html)}</div></div>`;

  const sheetHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: ${PAPER}; }
  .sheet {
    width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; display: grid;
    grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
    background: ${PAPER}; break-after: page;
  }
  .sheet:last-child { break-after: auto; }
  .cell {
    width: ${CELL_W_MM}mm; height: ${CELL_H_MM}mm; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .art { transform: scale(${CELL_SCALE.toFixed(5)}); transform-origin: center center; flex: 0 0 auto; }
</style></head><body>
  <div class="sheet">${cell(frontHtml).repeat(4)}</div>
  <div class="sheet">${cell(backHtml).repeat(4)}</div>
</body></html>`;
  writeFileSync(join(dist, 'sheet-a4-4up.html'), sheetHtml);

  const sheetPage = await browser.newPage();
  await sheetPage.goto(`file://${join(dist, 'sheet-a4-4up.html')}`);
  await sheetPage.evaluate(() => document.fonts.ready);
  await sheetPage.pdf({
    path: join(dist, `${slug}-a4-4up.pdf`),
    width: `${A4_W_MM}mm`,
    height: `${A4_H_MM}mm`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await sheetPage.close();
  console.log('Also built the 4-up A4 sheet (duplex, flip on SHORT edge; cut in quarters).');
}

await browser.close();
console.log(`Built ${slug}/dist — QR -> ${cfg.url}, page ${PAGE_W_MM}x${PAGE_H_MM}mm (A6 + ${BLEED_MM}mm bleed)`);
