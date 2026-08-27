// Checks a print PDF the way a printer's preflight does, so a file can't go
// to instantprint on trust:
//
//   node lib/verify-print.mjs <card>
//
//   - every page is exactly the trim size plus 3 mm of bleed
//   - every raster image lands at 300 dpi or better once placed
//
// Text and the QR are vector, so they have no resolution to check. The images
// are the phone screenshot, the logo, and whatever Chromium rasterised out of
// a CSS gradient or blur — that last group is the one worth watching, because
// a blurred halo drawn once and stretched across the card is exactly how a
// file ends up flagged.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node lib/verify-print.mjs <card>');
  process.exit(1);
}
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, slug, 'dist');
const cfg = JSON.parse(readFileSync(join(root, slug, 'config.json'), 'utf8'));

const BLEED_MM = 3;
const [TRIM_W, TRIM_H] = cfg.trimMm ?? [148, 105];
const PAGE_W = TRIM_W + BLEED_MM * 2;
const PAGE_H = TRIM_H + BLEED_MM * 2;
const MIN_DPI = 300;
const PT_MM = 25.4 / 72;

// --- the smallest PDF reader that answers these two questions --------------

const objects = buf => {
  const txt = buf.toString('latin1');
  const out = new Map();
  const re = /(\d+)\s+0\s+obj\b/g;
  let m;
  while ((m = re.exec(txt))) {
    const start = m.index + m[0].length;
    const end = txt.indexOf('endobj', start);
    out.set(+m[1], { dict: txt.slice(start, Math.min(end, start + 4000)), start, end });
  }
  return { txt, out };
};

const streamOf = (buf, txt, obj) => {
  const s = txt.indexOf('stream', obj.start);
  if (s < 0 || s > obj.end) return null;
  let from = s + 'stream'.length;
  if (txt[from] === '\r') from++;
  if (txt[from] === '\n') from++;
  const to = txt.indexOf('endstream', from);
  const raw = buf.subarray(from, to);
  if (!/\/Filter\s*\/FlateDecode/.test(obj.dict)) return null;
  try { return inflateSync(raw).toString('latin1'); } catch { return null; }
};

const num = (dict, key) => {
  const m = new RegExp(`/${key}\\s+(-?[\\d.]+)`).exec(dict);
  return m ? +m[1] : null;
};

// --- check ----------------------------------------------------------------

const files = readdirSync(dist).filter(f => /-print-.*\.pdf$/.test(f) && !f.includes('guides'));
if (!files.length) {
  console.error(`no print PDFs in ${slug}/dist`);
  process.exit(1);
}

let failed = false;
for (const file of files.sort()) {
  const buf = readFileSync(join(dist, file));
  const { txt, out } = objects(buf);

  const xobjectsIn = dict => {
    const names = new Map();
    const xo = /\/XObject\s*<<([\s\S]*?)>>/.exec(dict);
    if (xo) for (const r of xo[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) names.set(r[1], +r[2]);
    return names;
  };

  // Chromium wraps a page's drawing in form XObjects, so an image's placed
  // size is the product of every matrix down the chain, not the one beside it.
  const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];

  const placements = [];
  const walk = (content, names, ctm, depth) => {
    if (!content || depth > 6) return;
    const stack = [];
    let cur = ctm;
    const ops = [];
    // Skip inline image data, which is binary and would derail the scan.
    const body = content.replace(/\bBI\b[\s\S]*?\bEI\b/g, ' ');
    for (const tok of body.split(/\s+/)) {
      if (tok === 'q') { stack.push(cur); ops.length = 0; continue; }
      if (tok === 'Q') { cur = stack.pop() ?? cur; ops.length = 0; continue; }
      if (tok === 'cm') { cur = mul(cur, ops.slice(-6).map(Number)); ops.length = 0; continue; }
      if (tok === 'Do') {
        const name = (ops[ops.length - 1] ?? '').replace(/^\//, '');
        const id = names.get(name);
        const obj = id && out.get(id);
        ops.length = 0;
        if (!obj) continue;
        if (/\/Subtype\s*\/Image/.test(obj.dict)) {
          const px = num(obj.dict, 'Width'), py = num(obj.dict, 'Height');
          if (px && py) placements.push({ px, py, ctm: cur });
        } else if (/\/Subtype\s*\/Form/.test(obj.dict)) {
          const m = /\/Matrix\s*\[([^\]]*)\]/.exec(obj.dict);
          const inner = m ? mul(cur, m[1].trim().split(/\s+/).map(Number)) : cur;
          walk(streamOf(buf, txt, obj), xobjectsIn(obj.dict), inner, depth + 1);
        }
        continue;
      }
      ops.push(tok);
      if (ops.length > 8) ops.shift();
    }
  };

  const pages = [];
  for (const [id, obj] of out) {
    if (!/\/Type\s*\/Page[^s]/.test(obj.dict)) continue;
    const box = /MediaBox\s*\[([^\]]*)\]/.exec(obj.dict);
    const [x0, y0, x1, y1] = box[1].trim().split(/\s+/).map(Number);
    const contents = /\/Contents\s+(\d+)\s+0\s+R/.exec(obj.dict);
    pages.push({ id, w: (x1 - x0) * PT_MM, h: (y1 - y0) * PT_MM, dict: obj.dict, contents: contents && +contents[1] });
  }

  console.log(`${file}  (${pages.length} page${pages.length === 1 ? '' : 's'})`);

  for (const page of pages) {
    const sizeOk = Math.abs(page.w - PAGE_W) < 0.05 && Math.abs(page.h - PAGE_H) < 0.05;
    if (!sizeOk) failed = true;
    console.log(`  ${sizeOk ? 'PASS' : 'FAIL'}  page ${page.w.toFixed(2)} x ${page.h.toFixed(2)}mm ` +
                `(want ${PAGE_W} x ${PAGE_H})`);
    if (page.contents) {
      walk(streamOf(buf, txt, out.get(page.contents)), xobjectsIn(page.dict), [1, 0, 0, 1, 0, 0], 0);
    }
  }

  let worst = Infinity, worstAt = '';
  for (const { px, py, ctm } of placements) {
    const wPt = Math.hypot(ctm[0], ctm[1]), hPt = Math.hypot(ctm[2], ctm[3]);
    if (wPt < 0.5 || hPt < 0.5) continue;
    const dpi = Math.min(px / (wPt / 72), py / (hPt / 72));
    if (dpi < worst) {
      worst = dpi;
      worstAt = `${px}x${py}px placed ${(wPt * PT_MM).toFixed(1)} x ${(hPt * PT_MM).toFixed(1)}mm`;
    }
  }
  if (worst === Infinity) {
    console.log('  ----  no raster images (all vector)');
  } else {
    const ok = worst >= MIN_DPI;
    if (!ok) failed = true;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${placements.length} images, lowest ${worst.toFixed(0)} dpi ` +
                `(want ${MIN_DPI}+) — ${worstAt}`);
  }
}

process.exit(failed ? 1 : 0);
