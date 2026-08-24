// Postcard artboards, 800 x 560 px.
//
// Design values (colours, type, spacing, radii, shadows) are carried over from
// the rowbo postcard design canvas export (Main.dc.html / Back.dc.html) so the
// printed card matches the mockup exactly. Everything card-specific comes from
// a card's config.json.
//
// Two backs:
//   variant "mailer"  (default) — note + postage box + address panel, for post
//   variant "handout"           — note + what-you-get panel, for handing over

export const W = 800;
export const H = 560;

const DISPLAY = `'TASA Orbiter','Helvetica Neue',system-ui,sans-serif`;
const BODY = `Inter, system-ui, -apple-system, sans-serif`;

// Paths are written relative to a card's dist/ folder, where the artboards render.
const ASSETS = '../../assets';

// The posted cards use the canvas palette. A card can override any of it via
// config.theme — the handout runs cream / navy / red.
const DEFAULT_THEME = {
  paper: '#FBF5EC',
  ink: '#1D0802',
  accent: '#FA4500',
  body: '#3a2e26',
  hairline: '#E5D8C4',
  qrBorder: '#EDE1CE',
  logo: 'rowbo-logo.png',
};

const theme = cfg => ({ ...DEFAULT_THEME, ...(cfg.theme ?? {}) });

// Inter is bundled so the render is identical on any machine (no system fonts
// are assumed). 'TASA Orbiter' stays first in the display stack: if the printer
// or designer has the licensed face installed, it wins.
export const fontFaces = (base = `${ASSETS}/fonts`) => [400, 600, 700, 800]
  .map(w => `  @font-face { font-family: Inter; font-style: normal; font-weight: ${w};
    src: url('${base}/inter-latin-${w}-normal.woff2') format('woff2'); font-display: block; }`)
  .join('\n');

// Optional photo background (the handout's cover): the image is blurred and
// veiled so it reads as frosted glass and the type stays legible. The veil is
// denser on the left, where the headline and QR sit.
const coverLayers = t => t.coverImage ? `
  <img src="${t.coverImage}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scale(1.08); filter:blur(${t.coverBlur ?? 7}px) saturate(1.02); display:block;">
  <div style="position:absolute; inset:0; background:${t.coverVeil ?? `linear-gradient(100deg, ${t.paper}E8 0%, ${t.paper}D6 46%, ${t.paper}99 100%)`};"></div>` : '';

const shell = (t, inner, padding) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${fontFaces()}
  body { margin: 0; }
  a { color: ${t.accent}; }
</style>
</head>
<body>
<div style="position: relative; overflow: hidden; width: ${W}px; height: ${H}px; background: ${t.paper}; font-family: ${BODY}; color: ${t.ink}; box-sizing: border-box; padding: ${padding}; display: flex; gap: 30px;">
${coverLayers(t)}
${inner}
</div>
</body>
</html>`;

// The QR is a real, scannable code generated at build time from config.url.
const qrTile = (t, qrSvg, { size, radius, pad }) => `
      <div style="width:${size}px; height:${size}px; background:#fff; border-radius:${radius}px; border:1px solid ${t.qrBorder}; padding:${pad}px; box-sizing:border-box; flex-shrink:0;">
        ${qrSvg}
      </div>`;

export function front(cfg, qrSvg) {
  const t = theme(cfg);
  return shell(t, `
  <!-- LEFT: headline + CTA -->
  <div style="position: relative; flex: ${cfg.frontSplit?.[0] ?? 1.18}; display: flex; flex-direction: column; justify-content: center;">
    <div style="font-family:${DISPLAY}; font-size: ${cfg.headlineSize ?? 37}px; line-height: 1.03; font-weight: 800; letter-spacing: -0.5px;">${cfg.headline}</div>
${cfg.subhead ? `
    <div style="margin-top: 14px; font-size: 14.5px; line-height: 1.55; color: ${t.body}; max-width: 330px;">${cfg.subhead}</div>` : ''}

    <div style="margin-top: ${cfg.subhead ? 30 : 48}px; display: flex; align-items: center; gap: 14px;">
${qrTile(t, qrSvg, { size: 76, radius: 11, pad: 6 })}
      <div style="display:flex; flex-direction:column;">
        <div style="font-family:${DISPLAY}; font-size:${cfg.scanLineSize ?? 20}px; font-weight:800; color:${t.accent}; letter-spacing:-0.3px;">${cfg.scanLine ?? 'Scan to see it live'}</div>
${cfg.priceLine === false ? '' : `        <div style="font-size:13px; color:#626262;">Free to look &middot; yours to keep for ${cfg.price}/mo</div>`}
      </div>
    </div>
    <div style="margin-top:18px;"><img src="${ASSETS}/${t.logo}" style="height:18px; display:block;"></div>
  </div>

  <!-- RIGHT: phone mockup -->
  <div style="position: relative; flex: ${cfg.frontSplit?.[1] ?? 0.82}; display: flex; align-items: center; justify-content: center;">
    <div style="width:232px; height:472px; background:${t.phoneBezel ?? t.ink}; border-radius:36px; padding:8px; box-sizing:border-box; box-shadow:0 24px 50px ${t.phoneShadow ?? 'rgba(29,8,2,0.32)'};">
      <div style="width:100%; height:100%; border-radius:29px; overflow:hidden; background:#fff;">
        <img src="site-mobile.jpg" style="width:100%; height:100%; object-fit:cover; object-position:top; display:block;">
      </div>
    </div>
  </div>`, '40px 44px');
}

// Right-hand side of a posted card: postage box over the address.
const addressSide = (cfg, t) => {
  const lines = cfg.addressLines?.length
    ? cfg.addressLines.map(l => `      <div style="font-size:14px; color:${t.body};">${l}</div>`).join('\n')
    : [0, 1, 2, 3].map(() => `      <div style="height:1px; background:${t.hairline};"></div>`).join('\n');

  return `
    <div style="display:flex; justify-content:flex-end;">
      <div style="width:66px; height:76px; border:1.5px dashed #D8C6AC; border-radius:4px; display:flex; align-items:center; justify-content:center; text-align:center; font-size:9px; color:#B6A68F; line-height:1.3;">POSTAGE<br>PAID</div>
    </div>
    <div style="margin-top:64px; display:flex; flex-direction:column; gap:10px;">
      <div style="font-size:15px; color:${t.ink}; font-weight:600;">${cfg.addressName}</div>
${lines}
    </div>`;
};

// Right-hand side of a handout: no address, so the space sells instead.
const panelSide = (cfg, t) => {
  const p = cfg.panel;
  return `
    <div style="background:${t.ink}; color:#fff; border-radius:14px; padding:22px 22px 20px; height:100%; box-sizing:border-box; display:flex; flex-direction:column;">
      <div style="font-family:${DISPLAY}; font-size:19px; font-weight:800; letter-spacing:-0.2px;">${p.title}</div>
      <div style="margin-top:${p.items.length > 4 ? 16 : 30}px; flex:1; display:flex; flex-direction:column; justify-content:${p.items.length > 4 ? 'space-evenly' : 'flex-start'}; gap:${p.items.length > 4 ? 11 : 30}px;">
${p.items.map(item => `        <div style="display:flex; gap:9px; align-items:flex-start;">
          <div style="width:16px; height:16px; border-radius:50%; background:${t.accent}; flex-shrink:0; margin-top:1px; position:relative;">
            <div style="position:absolute; left:5px; top:3px; width:4px; height:7px; border:solid #fff; border-width:0 1.6px 1.6px 0; transform:rotate(45deg);"></div>
          </div>
          <div style="font-size:${p.items.length > 4 ? 12.8 : 14}px; line-height:1.55; color:#DCE0E8;">${item}</div>
        </div>`).join('\n')}
      </div>
${p.footnote ? `      <div style="margin-top:auto; padding-top:16px; border-top:1px solid rgba(255,255,255,0.16); font-size:12px; color:#C9CEDA; line-height:1.5;">${p.footnote}</div>` : ''}
    </div>`;
};

export function back(cfg, qrSvg) {
  const t = { ...theme(cfg), coverImage: null };
  const note = cfg.note.map(p => `      ${p}`).join(`\n      <div style="height: ${cfg.noteGap ?? 9}px;"></div>\n`);
  const isHandout = cfg.variant === 'handout';

  return shell(t, `
  <!-- LEFT: the note -->
  <div style="flex: ${isHandout ? '1.22' : '1.28'}; display: flex; flex-direction: column;">
    <div style="margin-bottom: 18px;">
      <img src="${ASSETS}/${t.logo}" style="height: 24px; display: block;">
    </div>

    <div style="${isHandout ? 'margin: auto 0;' : ''}">
      <div style="font-family:${DISPLAY}; font-size: ${cfg.greetingSize ?? 23}px; line-height: 1.12; font-weight: 800; letter-spacing:-0.3px; margin-bottom:12px;">${cfg.greeting}</div>

      <div style="font-size: ${cfg.noteSize ?? 14.5}px; line-height: 1.62; color: ${t.body};">
${note}
      </div>

      <div style="margin-top: ${cfg.signatureGap ?? 14}px; font-family:${DISPLAY}; font-size: 15px; font-weight:700; color: ${t.ink};">- ${cfg.senders} &middot; <span style="color:${t.accent};">rowbo.dev</span></div>
    </div>

    <div style="margin-top: auto; display: flex; align-items: center; gap: 12px;">
${qrTile(t, qrSvg, { size: 68, radius: 10, pad: 6 })}
      <div style="font-size:13px; color:#626262;">${cfg.claimLine ?? 'Scan to claim &rarr;'}<br><span style="color:${t.accent}; font-weight:600;">${cfg.urlDisplay}</span></div>
    </div>
  </div>
${isHandout ? '' : `
  <!-- divider -->
  <div style="width:1px; background:${t.hairline}; margin: 4px 0;"></div>
`}
  <!-- RIGHT: ${isHandout ? 'what you get' : 'address side'} -->
  <div style="flex: 1; display: flex; flex-direction: column;">
${isHandout ? panelSide(cfg, t) : addressSide(cfg, t)}
  </div>`, '40px 40px 34px');
}
