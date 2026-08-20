// Postcard artboards, 800 x 560 px.
//
// Design values (colours, type, spacing, radii, shadows) are carried over from
// the rowbo postcard design canvas export (Main.dc.html / Back.dc.html) so the
// printed card matches the mockup exactly. Everything recipient-specific comes
// from a card's config.json.

export const W = 800;
export const H = 560;

const CREAM = '#FBF5EC';
const INK = '#1D0802';
const ORANGE = '#FA4500';
const HAIRLINE = '#E5D8C4';
const DISPLAY = `'TASA Orbiter','Helvetica Neue',system-ui,sans-serif`;
const BODY = `Inter, system-ui, -apple-system, sans-serif`;

// Paths are written relative to a card's dist/ folder, where the artboards render.
const ASSETS = '../../assets';

// Inter is bundled so the render is identical on any machine (no system fonts
// are assumed). 'TASA Orbiter' stays first in the display stack: if the printer
// or designer has the licensed face installed, it wins.
export const fontFaces = (base = `${ASSETS}/fonts`) => [400, 600, 700, 800]
  .map(w => `  @font-face { font-family: Inter; font-style: normal; font-weight: ${w};
    src: url('${base}/inter-latin-${w}-normal.woff2') format('woff2'); font-display: block; }`)
  .join('\n');

const shell = (inner, padding) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${fontFaces()}
  body { margin: 0; }
  a { color: ${ORANGE}; }
</style>
</head>
<body>
<div style="width: ${W}px; height: ${H}px; background: ${CREAM}; font-family: ${BODY}; color: ${INK}; box-sizing: border-box; padding: ${padding}; display: flex; gap: 30px;">
${inner}
</div>
</body>
</html>`;

// The QR is a real, scannable code generated at build time from config.url.
const qrTile = (qrSvg, { size, radius, pad }) => `
      <div style="width:${size}px; height:${size}px; background:#fff; border-radius:${radius}px; border:1px solid #EDE1CE; padding:${pad}px; box-sizing:border-box; flex-shrink:0;">
        ${qrSvg}
      </div>`;

export function front(cfg, qrSvg) {
  return shell(`
  <!-- LEFT: headline + CTA -->
  <div style="flex: 1.18; display: flex; flex-direction: column; justify-content: center;">
    <div style="font-family:${DISPLAY}; font-size: ${cfg.headlineSize ?? 37}px; line-height: 1.03; font-weight: 800; letter-spacing: -0.5px;">${cfg.headline}</div>

    <div style="margin-top: 48px; display: flex; align-items: center; gap: 14px;">
${qrTile(qrSvg, { size: 76, radius: 11, pad: 6 })}
      <div style="display:flex; flex-direction:column;">
        <div style="font-family:${DISPLAY}; font-size:20px; font-weight:800; color:${ORANGE}; letter-spacing:-0.3px;">Scan to see it live</div>
        <div style="font-size:13px; color:#626262;">Free to look &middot; yours to keep for ${cfg.price}/mo</div>
      </div>
    </div>
    <div style="margin-top:18px;"><img src="${ASSETS}/rowbo-logo.png" style="height:18px; display:block;"></div>
  </div>

  <!-- RIGHT: phone mockup -->
  <div style="flex: 0.82; display: flex; align-items: center; justify-content: center;">
    <div style="width:232px; height:472px; background:${INK}; border-radius:36px; padding:8px; box-sizing:border-box; box-shadow:0 24px 50px rgba(29,8,2,0.32);">
      <div style="width:100%; height:100%; border-radius:29px; overflow:hidden; background:#fff;">
        <img src="site-mobile.jpg" style="width:100%; height:100%; object-fit:cover; object-position:top; display:block;">
      </div>
    </div>
  </div>`, '40px 44px');
}

export function back(cfg, qrSvg) {
  // Blank ruled lines when a card has no printed address (config.addressLines: []).
  const addressBlock = cfg.addressLines?.length
    ? `      <div style="font-size:15px; color:${INK}; font-weight:600;">${cfg.addressName}</div>
${cfg.addressLines.map(l => `      <div style="font-size:14px; color:#3a2e26;">${l}</div>`).join('\n')}`
    : `      <div style="font-size:15px; color:${INK}; font-weight:600;">${cfg.addressName}</div>
${[0, 1, 2, 3].map(() => `      <div style="height:1px; background:${HAIRLINE};"></div>`).join('\n')}`;

  const note = cfg.note
    .map(p => `      ${p}`)
    .join('\n      <div style="height: 9px;"></div>\n');

  return shell(`
  <!-- LEFT: the note -->
  <div style="flex: 1.28; display: flex; flex-direction: column;">
    <div style="margin-bottom: 18px;">
      <img src="${ASSETS}/rowbo-logo.png" style="height: 24px; display: block;">
    </div>

    <div style="font-family:${DISPLAY}; font-size: 23px; font-weight: 800; letter-spacing:-0.3px; margin-bottom:10px;">${cfg.greeting}</div>

    <div style="font-size: ${cfg.noteSize ?? 14.5}px; line-height: 1.62; color: #3a2e26;">
${note}
    </div>

    <div style="margin-top: 14px; font-family:${DISPLAY}; font-size: 15px; font-weight:700; color: ${INK};">- ${cfg.senders} &middot; <span style="color:${ORANGE};">rowbo.dev</span></div>

    <div style="margin-top: auto; display: flex; align-items: center; gap: 12px;">
${qrTile(qrSvg, { size: 68, radius: 10, pad: 6 })}
      <div style="font-size:13px; color:#626262;">Scan to claim &rarr;<br><span style="color:${ORANGE}; font-weight:600;">${cfg.urlDisplay}</span></div>
    </div>
  </div>

  <!-- divider -->
  <div style="width:1px; background:${HAIRLINE}; margin: 4px 0;"></div>

  <!-- RIGHT: address side -->
  <div style="flex: 1; display: flex; flex-direction: column;">
    <div style="display:flex; justify-content:flex-end;">
      <div style="width:66px; height:76px; border:1.5px dashed #D8C6AC; border-radius:4px; display:flex; align-items:center; justify-content:center; text-align:center; font-size:9px; color:#B6A68F; line-height:1.3;">POSTAGE<br>PAID</div>
    </div>
    <div style="margin-top:64px; display:flex; flex-direction:column; gap:10px;">
${addressBlock}
    </div>
  </div>`, '40px 40px 34px');
}
