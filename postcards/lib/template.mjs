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

// Both brand faces are bundled from the rowbo font pack — TASA Orbiter for
// display, Inter for text — so a render is identical on any machine and no
// system font is assumed.
export const fontFaces = (base = `${ASSETS}/fonts`) => [
  ...[400, 600, 700, 800].map(w => `  @font-face { font-family: Inter; font-style: normal; font-weight: ${w};
    src: url('${base}/inter-latin-${w}-normal.woff2') format('woff2'); font-display: block; }`),
  ...[600, 700, 800].map(w => `  @font-face { font-family: 'TASA Orbiter'; font-style: normal; font-weight: ${w};
    src: url('${base}/tasa-orbiter-${w}.woff2') format('woff2'); font-display: block; }`),
].join('\n');

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
      <div style="margin-top:${p.items.length > 4 ? 16 : 30}px; flex:1; display:flex; flex-direction:column; justify-content:${p.items.length > 4 ? 'space-evenly' : 'flex-start'}; gap:${p.items.length > 4 ? 11 : 22}px;">
${p.items.map(item => `        <div style="display:flex; gap:9px; align-items:flex-start;">
          <div style="width:16px; height:16px; border-radius:50%; background:${t.accent}; flex-shrink:0; margin-top:1px; position:relative;">
            <div style="position:absolute; left:5px; top:3px; width:4px; height:7px; border:solid #fff; border-width:0 1.6px 1.6px 0; transform:rotate(45deg);"></div>
          </div>
          <div style="font-size:${p.items.length > 4 ? 12.8 : 15}px; line-height:1.5; color:#DCE0E8;">${item}</div>
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
${cfg.greeting ? `      <div style="font-family:${DISPLAY}; font-size: ${cfg.greetingSize ?? 23}px; line-height: 1.12; font-weight: 800; letter-spacing:-0.3px; margin-bottom:12px;">${cfg.greeting}</div>` : ''}

      <div style="font-size: ${cfg.noteSize ?? 14.5}px; line-height: 1.62; color: ${t.body};">
${note}
      </div>

      <div style="margin-top: ${cfg.signatureGap ?? 14}px; font-family:${DISPLAY}; font-size: 15px; font-weight:700; color: ${t.ink};">- ${cfg.senders} &middot; <span style="color:${t.accent};">rowbo.dev</span></div>
    </div>

    <div style="margin-top: auto; display: flex; align-items: center; gap: 12px;">
${qrTile(t, qrSvg, { size: 80, radius: 10, pad: 7 })}
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

// ---------------------------------------------------------------------------
// Layout B — the design we settled on for the first café batch.
//
// Front: headline over an accent line, QR low-left, phone right.
// Back:  a full-bleed dark panel of what's included, and a cream column that
//        says how to start. No postage furniture on either side.
// ---------------------------------------------------------------------------

const shellB = (t, inner) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${fontFaces()}
  body { margin: 0; }
</style>
</head>
<body>
<div style="position: relative; overflow: hidden; width: ${W}px; height: ${H}px; background: ${t.paper}; font-family: ${BODY}; color: ${t.ink}; box-sizing: border-box;">
${inner}
</div>
</body>
</html>`;


// iPhone 17 mockup, drawn to the real device: 149.6 x 71.5 mm body (2.092:1),
// a display corner radius of about 13.9 mm, and the ~1.5 mm uniform bezel.
// At 224 px wide that is 469 px tall, a 43 px outer radius and a 5 px bezel.
const PHONE_W = 214;
const PHONE_H = Math.round(PHONE_W * 149.6 / 71.5);   // 448
const BEZEL = 5;

const statusIcons = ink => `
        <svg width="12" height="8" viewBox="0 0 12 8" fill="${ink}" aria-hidden="true">
          <rect x="0" y="5.4" width="2" height="2.6" rx="0.6"/>
          <rect x="3.2" y="3.9" width="2" height="4.1" rx="0.6"/>
          <rect x="6.4" y="2.2" width="2" height="5.8" rx="0.6"/>
          <rect x="9.6" y="0.4" width="2" height="7.6" rx="0.6"/>
        </svg>
        <svg width="11" height="8" viewBox="0 0 11 8" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linecap="round" aria-hidden="true">
          <path d="M1 2.6a6.6 6.6 0 0 1 9 0"/>
          <path d="M2.9 4.7a3.9 3.9 0 0 1 5.2 0"/>
          <circle cx="5.5" cy="6.9" r="0.8" fill="${ink}" stroke="none"/>
        </svg>
        <svg width="18" height="8" viewBox="0 0 18 8" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="14.6" height="7" rx="2.2" stroke="${ink}" stroke-opacity="0.45"/>
          <rect x="2" y="2" width="10.4" height="4" rx="1.1" fill="${ink}"/>
          <path d="M16.4 3.1v1.8a1.6 1.6 0 0 0 0-1.8Z" fill="${ink}" fill-opacity="0.5"/>
        </svg>`;

const phoneMockup = (t, cfg) => {
  const ink = cfg.statusInk ?? '#1B1B1B';
  const shadow = t.phoneShadow ?? '0 18px 40px rgba(42,20,9,0.20)';
  return `
      <div style="width:${PHONE_W}px; height:${PHONE_H}px; background:${t.phoneBezel ?? t.ink}; border-radius:41px; padding:${BEZEL}px; box-sizing:border-box; box-shadow:${shadow};">
        <div style="position:relative; width:100%; height:100%; border-radius:36px; overflow:hidden; background:#fff;">
          <img src="site-mobile.jpg" style="width:100%; height:100%; object-fit:cover; object-position:top; display:block;">
          <div style="position:absolute; top:0; left:0; right:0; height:28px; display:flex; align-items:center; justify-content:space-between; padding:0 16px 0 17px;">
            <div style="font-size:10px; font-weight:700; letter-spacing:-0.1px; color:${ink}; font-variant-numeric:tabular-nums;">9:41</div>
            <div style="display:flex; align-items:center; gap:4px;">${statusIcons(ink)}
            </div>
          </div>
          <div style="position:absolute; top:7px; left:50%; transform:translateX(-50%); width:62px; height:19px; border-radius:999px; background:#080808;"></div>
        </div>
      </div>`;
};

export function frontB(cfg, qrSvg) {
  // The cover can run its own palette (config.coverTheme) so slide 1 can go
  // dark while the back keeps its cream how-to-start column.
  const t = { ...theme(cfg), ...(cfg.coverTheme ?? {}) };

  // On a dark cover the QR needs its own light field to scan from, so it sits
  // on a padded tile rather than butting straight up against the background.
  const qr = t.qrTile
    ? `<div style="width:122px; height:122px; flex-shrink:0; box-sizing:border-box; padding:9px; border-radius:9px; background:${t.qrTile};">${qrSvg}</div>`
    : `<div style="width:104px; height:104px; flex-shrink:0;">${qrSvg}</div>`;

  return shellB(t, `
  <div style="position:absolute; inset:0; display:flex; padding:46px 44px 40px; box-sizing:border-box; gap:26px;">

    <!-- LEFT: the offer -->
    <div style="flex:1.06; display:flex; flex-direction:column;">
      <div style="font-family:${DISPLAY}; font-size:${cfg.headlineSize ?? 46}px; line-height:0.98; font-weight:800; letter-spacing:-1.4px;">${cfg.headline}</div>
      <div style="margin-top:12px; font-family:${DISPLAY}; font-size:${cfg.accentSize ?? 27}px; line-height:1.05; font-weight:800; letter-spacing:-0.6px; color:${t.accent};">${cfg.headlineAccent}</div>

      <div style="margin-top:auto; display:flex; align-items:center; gap:20px;">
        ${qr}
        <div style="font-family:${DISPLAY}; font-size:19px; font-weight:800; line-height:1.2; letter-spacing:-0.2px;">${cfg.scanFront ?? 'Scan to<br>try it'}</div>
      </div>

      <div style="margin-top:30px;"><img src="${ASSETS}/${t.logo}" style="height:23px; display:block;"></div>
    </div>

    <!-- RIGHT: the phone -->
    <div style="flex:0.9; display:flex; align-items:center; justify-content:center;">
${phoneMockup(t, cfg)}
    </div>
  </div>`);
}

export function backB(cfg, qrSvg) {
  const t = theme(cfg);
  const p = cfg.panel;
  const split = cfg.backSplit ?? 60;

  return shellB(t, `
  <!-- LEFT: full-bleed dark panel -->
  <div style="position:absolute; left:0; top:0; bottom:0; width:${split}%; background:${t.ink}; color:#fff; padding:44px 40px 34px; box-sizing:border-box; display:flex; flex-direction:column;">
    <div style="font-family:${DISPLAY}; font-size:25px; font-weight:800; letter-spacing:-0.4px;">${p.title}</div>

    <div style="margin-top:26px; display:flex; flex-direction:column; gap:19px;">
${p.items.map(item => `      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div style="width:17px; height:17px; border-radius:50%; background:${t.accent}; flex-shrink:0; margin-top:2px; position:relative;">
          <div style="position:absolute; left:5.5px; top:3.5px; width:4px; height:7.5px; border:solid #fff; border-width:0 1.8px 1.8px 0; transform:rotate(45deg);"></div>
        </div>
        <div style="font-size:15px; line-height:1.45; color:#F2ECE4;">${item}</div>
      </div>`).join('\n')}
    </div>

${p.footnote ? `    <div style="margin-top:auto; font-size:11.5px; line-height:1.5; color:#9A897B;">${p.footnote}</div>` : ''}
  </div>

  <!-- RIGHT: how to start -->
  <div style="position:absolute; right:0; top:0; bottom:0; width:${100 - split}%; padding:44px 38px 34px; box-sizing:border-box; display:flex; flex-direction:column;">
    <!-- align-self, or the flex column stretches the logo to its full width
         and squashes the mark. -->
    <img src="${ASSETS}/${t.logo}" style="height:24px; width:auto; align-self:flex-start; display:block;">

    <div style="margin-top:26px; font-size:15px; line-height:1.6; color:${t.ink};">${cfg.rightNote}</div>

    <div style="margin-top:30px; display:flex; align-items:center; gap:16px;">
      <div style="width:92px; height:92px; flex-shrink:0;">${qrSvg}</div>
      <div style="font-family:${DISPLAY}; font-size:16px; font-weight:800; line-height:1.2; letter-spacing:-0.2px;">${cfg.scanBack ?? 'Scan to<br>start yours'}</div>
    </div>

    <div style="margin-top:auto; font-size:12.5px; color:#8A7A6E;">- ${cfg.senders} &middot; ${cfg.urlDisplay}</div>
  </div>`);
}
