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
// Trim size comes from config (`trimMm: [w, h]`, landscape), defaulting to A6.
// Every printer we deal with wants 3 mm of bleed on every edge and the
// important content 3 mm inside the cut, which is what `safe` below checks.
const BLEED_MM = 3;
const [TRIM_W_MM, TRIM_H_MM] = cfg.trimMm ?? [148, 105];
const PAGE_W_MM = TRIM_W_MM + BLEED_MM * 2;
const PAGE_H_MM = TRIM_H_MM + BLEED_MM * 2;
const MM = 96 / 25.4; // CSS px per mm
// Chromium rounds a mm page size through CSS pixels and lands ~0.2 mm over,
// which a printer's preflight reads as the wrong page. Inches convert to
// points exactly, so the MediaBox comes out at the template's own size.
const IN = mm => `${(mm / 25.4).toFixed(6)}in`;

// Chromium can only make pages in steps of 1/75 in (0.339 mm) and rounds up,
// so 216 mm comes out 216.24 and a printer's preflight reads it as the wrong
// size. Render a hair oversize, then narrow each page's MediaBox to the exact
// size, centred — the sliver that falls outside is bleed, never artwork. The
// new box is written over the old one at the same byte length so the file's
// cross-reference offsets stay valid.
const mediaBoxMm = file => {
  const m = /MediaBox\s*\[([^\]]*)\]/.exec(readFileSync(file).toString('latin1'));
  const [x0, y0, x1, y1] = m[1].trim().split(/\s+/).map(Number);
  return [((x1 - x0) / 72) * 25.4, ((y1 - y0) / 72) * 25.4];
};
const exactPage = (file, wMm, hMm) => {
  const wPt = (wMm / 25.4) * 72, hPt = (hMm / 25.4) * 72;
  const txt = readFileSync(file).toString('latin1').replace(
    /MediaBox\s*\[([^\]]*)\]/g,
    (whole, inner) => {
      const [x0, y0, x1, y1] = inner.trim().split(/\s+/).map(Number);
      // Centred if it fits in the bytes we have, otherwise anchored at the
      // origin, which trims the surplus off one edge instead of two.
      for (const [ox, oy] of [[x0 + (x1 - x0 - wPt) / 2, y0 + (y1 - y0 - hPt) / 2], [0, 0]]) {
        for (const dp of [4, 3, 2, 1, 0]) {
          const box = [ox, oy, ox + wPt, oy + hPt].map(v => v.toFixed(dp)).join(' ');
          if (box.length <= inner.length) return whole.replace(inner, box.padEnd(inner.length));
        }
      }
      return whole;
    }
  );
  writeFileSync(file, Buffer.from(txt, 'latin1'));
  return mediaBoxMm(file);
};
// Scale the 800x560 artboard to cover the bleed page (uniform, so nothing
// stretches; the overflow is trimmed at the bleed edge, well outside the
// 40 px safety padding the layout already uses).
const SCALE = Math.max((PAGE_W_MM * MM) / W, (PAGE_H_MM * MM) / H);

// How much of the artboard falls outside the page once it covers, and how far
// the layout's own padding then sits from the trimmed edge. Printed as a
// safe-zone report so a trim-size change can't quietly push copy into the cut.
const artW = (W * SCALE) / MM, artH = (H * SCALE) / MM;   // mm
const overW = (artW - PAGE_W_MM) / 2, overH = (artH - PAGE_H_MM) / 2;
const PAD_PX = cfg.layout === 'b' ? 40 : 40;              // smallest padding in the layout
const padMm = (PAD_PX * SCALE) / MM;
const safeMm = padMm - Math.max(overW, overH) - BLEED_MM; // clear of the cut line

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

const printPdf = join(dist, `${slug}-print-${TRIM_W_MM}x${TRIM_H_MM}mm-bleed.pdf`);
const printPage = await browser.newPage();
await printPage.goto(`file://${join(dist, 'print.html')}`);
await printPage.evaluate(() => document.fonts.ready);
await printPage.pdf({
  path: printPdf,
  width: IN(PAGE_W_MM),
  height: IN(PAGE_H_MM),
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await printPage.close();
const [gotW, gotH] = exactPage(printPdf, PAGE_W_MM, PAGE_H_MM);

// 3b. The same two pages with the printer's guides drawn on top: the cut line
// at 3 mm in and the safe zone at 6 mm. A proof to check against, watermarked
// so it can't be mistaken for the upload file.
{
  const guidesHtml = printHtml.replace(
    '</style></head><body>',
    `  .page { position: relative; }
  .guide { position: absolute; pointer-events: none; }
  .cut { left: ${BLEED_MM}mm; top: ${BLEED_MM}mm; right: ${BLEED_MM}mm; bottom: ${BLEED_MM}mm;
         border: 0.25mm dashed rgba(226,32,32,0.95); }
  .safe { left: ${BLEED_MM * 2}mm; top: ${BLEED_MM * 2}mm; right: ${BLEED_MM * 2}mm; bottom: ${BLEED_MM * 2}mm;
          border: 0.25mm dashed rgba(30,120,235,0.95); }
  .stamp { left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center;
           font-family: Inter, sans-serif; font-size: 7mm; font-weight: 800; letter-spacing: 0.6mm;
           color: rgba(226,32,32,0.55); }
</style></head><body>`
  ).replace(
    /<\/div><\/div>/g,
    `</div><div class="guide cut"></div><div class="guide safe"></div><div class="guide stamp">PROOF &middot; NOT FOR UPLOAD</div></div>`
  );
  writeFileSync(join(dist, 'print-guides.html'), guidesHtml);

  const guidePdf = join(dist, `${slug}-print-guides.pdf`);
  const guidePage = await browser.newPage();
  await guidePage.goto(`file://${join(dist, 'print-guides.html')}`);
  await guidePage.evaluate(() => document.fonts.ready);
  await guidePage.pdf({
    path: guidePdf, width: IN(PAGE_W_MM), height: IN(PAGE_H_MM),
    printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await guidePage.close();
  exactPage(guidePdf, PAGE_W_MM, PAGE_H_MM);
}

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
  // An A6 is a quarter of an A4 landscape; an A5 is half an A4 portrait.
  const up = TRIM_W_MM > 180 ? 2 : 4;
  const [A4_W_MM, A4_H_MM] = up === 2 ? [210, 297] : [297, 210];
  const [COLS, ROWS] = up === 2 ? [1, 2] : [2, 2];
  const CELL_W_MM = A4_W_MM / COLS, CELL_H_MM = A4_H_MM / ROWS;
  const CELL_SCALE = Math.max((CELL_W_MM * MM) / W, (CELL_H_MM * MM) / H);
  const cell = html => `<div class="cell"><div class="art">${artboard(html)}</div></div>`;

  const sheetHtml = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontFaces()}
  @page { size: ${A4_W_MM}mm ${A4_H_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: ${PAPER}; }
  .sheet {
    width: ${A4_W_MM}mm; height: ${A4_H_MM}mm; display: grid;
    grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: repeat(${ROWS}, 1fr);
    background: ${PAPER}; break-after: page;
  }
  .sheet:last-child { break-after: auto; }
  .cell {
    width: ${CELL_W_MM}mm; height: ${CELL_H_MM}mm; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .art { transform: scale(${CELL_SCALE.toFixed(5)}); transform-origin: center center; flex: 0 0 auto; }
</style></head><body>
  <div class="sheet">${cell(frontHtml).repeat(up)}</div>
  <div class="sheet">${cell(backHtml).repeat(up)}</div>
</body></html>`;
  writeFileSync(join(dist, 'sheet-a4-4up.html'), sheetHtml);

  const sheetPdf = join(dist, `${slug}-a4-${up}up.pdf`);
  const sheetPage = await browser.newPage();
  await sheetPage.goto(`file://${join(dist, 'sheet-a4-4up.html')}`);
  await sheetPage.evaluate(() => document.fonts.ready);
  await sheetPage.pdf({
    path: sheetPdf,
    width: IN(A4_W_MM),
    height: IN(A4_H_MM),
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await sheetPage.close();
  exactPage(sheetPdf, A4_W_MM, A4_H_MM);
  console.log(`Also built the ${up}-up A4 sheet (duplex, flip on SHORT edge; cut in ${up === 2 ? 'half' : 'quarters'}).`);
}

await browser.close();
console.log(`Built ${slug}/dist — QR -> ${cfg.url}`);
console.log(`  trim ${TRIM_W_MM}x${TRIM_H_MM}mm, page ${PAGE_W_MM}x${PAGE_H_MM}mm (+${BLEED_MM}mm bleed all round)`);
console.log(`  artwork covers the page, ${overW.toFixed(1)}mm trimmed off each side and ${overH.toFixed(1)}mm off top and bottom`);
console.log(`  nearest copy sits ${safeMm.toFixed(1)}mm inside the cut line (needs 3mm)`);
console.log(`  print PDF page measures ${gotW.toFixed(2)} x ${gotH.toFixed(2)}mm`);
if (Math.abs(gotW - PAGE_W_MM) > 0.02 || Math.abs(gotH - PAGE_H_MM) > 0.02) {
  console.warn('  WARNING: page size is off, the printer will rescale it');
}
if (safeMm < BLEED_MM) console.warn('  WARNING: copy is inside the safe zone margin');
