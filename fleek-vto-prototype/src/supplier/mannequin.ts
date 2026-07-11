import type { Garment, ModelProfile } from './types'
import { asDataUrl } from './imageUtils'

/**
 * Demo-mode try-on renderer. Draws a stylised studio figure matched to the
 * requested demographics (skin tone, height, build) and drapes the garment
 * photo over the torso. Used when no Gemini API key is configured so the
 * studio always produces a preview.
 */

const SKIN: Record<string, { skin: string; shade: string; hair: string }> = {
  Asian: { skin: '#eac39e', shade: '#d9ab82', hair: '#1d1712' },
  Black: { skin: '#6b4a35', shade: '#57392a', hair: '#120d0a' },
  White: { skin: '#f0d0b7', shade: '#ddb99e', hair: '#5a3d23' },
  'South Asian': { skin: '#c68b59', shade: '#b07747', hair: '#170f0a' },
  'Hispanic / Latino': { skin: '#d9a374', shade: '#c68f60', hair: '#241610' },
  'Middle Eastern': { skin: '#d9ae86', shade: '#c69a70', hair: '#1c120c' },
}

export async function renderDemoTryOn(garment: Garment, profile: ModelProfile): Promise<string> {
  const { skin, shade, hair } = SKIN[profile.ethnicity] ?? SKIN.Asian

  // SVG rendered via <img> can't fetch external resources, so inline the
  // garment photo (it may live in Supabase storage) as a data URL first.
  let garmentData: string | null = null
  if (garment.itemImage) {
    try {
      garmentData = await asDataUrl(garment.itemImage)
    } catch {
      garmentData = null
    }
  }

  // Proportions: height scales the figure, BMI widens it.
  const hScale = profile.heightCm / 172
  const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2)
  const wScale = Math.max(0.82, Math.min(1.45, bmi / 22))

  const W = 640
  const H = 800
  const cx = W / 2
  const figH = 620 * hScale
  const top = H - 60 - figH // feet anchored near bottom

  const headR = 34 * hScale
  const shoulderW = 150 * hScale * wScale
  const hipW = (profile.gender === 'Female' ? 140 : 118) * hScale * wScale
  const waistW = shoulderW * (profile.gender === 'Female' ? 0.72 : 0.86)

  const neckY = top + headR * 2 + 8
  const torsoH = figH * 0.34
  const hipY = neckY + torsoH
  const legH = figH * 0.5
  const longHair = profile.gender === 'Female'

  const garmentImg = garmentData
  const isBottom = garment.category === 'Trousers' || garment.category === 'Skirts'
  const gW = (isBottom ? hipW : shoulderW) * 1.55
  const gH = isBottom ? legH * 0.82 : torsoH * 1.32
  const gX = cx - gW / 2
  const gY = isBottom ? hipY - 14 : neckY - 12

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f3ea"/><stop offset="1" stop-color="#e9e2d2"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="${cx}" cy="${H - 48}" rx="${170 * wScale}" ry="20" fill="#000" opacity="0.10"/>

  <!-- legs -->
  <path d="M ${cx - hipW / 2 + 8} ${hipY} L ${cx - 14} ${hipY} L ${cx - 20} ${hipY + legH} L ${cx - hipW / 2 + 2} ${hipY + legH} Z" fill="${shade}"/>
  <path d="M ${cx + hipW / 2 - 8} ${hipY} L ${cx + 14} ${hipY} L ${cx + 20} ${hipY + legH} L ${cx + hipW / 2 - 2} ${hipY + legH} Z" fill="${skin}"/>
  <!-- torso -->
  <path d="M ${cx - shoulderW / 2} ${neckY + 10}
           C ${cx - shoulderW / 2 - 6} ${neckY + torsoH * 0.4}, ${cx - waistW / 2} ${neckY + torsoH * 0.6}, ${cx - hipW / 2} ${hipY}
           L ${cx + hipW / 2} ${hipY}
           C ${cx + waistW / 2} ${neckY + torsoH * 0.6}, ${cx + shoulderW / 2 + 6} ${neckY + torsoH * 0.4}, ${cx + shoulderW / 2} ${neckY + 10} Z"
        fill="${skin}"/>
  <!-- arms -->
  <path d="M ${cx - shoulderW / 2} ${neckY + 14} q -26 ${torsoH * 0.5} -16 ${torsoH + 40} l 18 -4 q -4 -${torsoH * 0.5} 10 -${torsoH + 10} Z" fill="${shade}"/>
  <path d="M ${cx + shoulderW / 2} ${neckY + 14} q 26 ${torsoH * 0.5} 16 ${torsoH + 40} l -18 -4 q 4 -${torsoH * 0.5} -10 -${torsoH + 10} Z" fill="${shade}"/>
  <!-- head -->
  ${longHair ? `<path d="M ${cx - headR - 8} ${top + headR} q 0 ${headR * 2.6} 10 ${headR * 3} l ${headR * 2 + 16} 0 q 10 -${headR * 0.4} 10 -${headR * 3} q 0 -${headR * 1.4} -${headR + 18} -${headR * 1.3} q -${headR + 18} 0 -${headR + 18} ${headR * 1.3} Z" fill="${hair}"/>` : ''}
  <circle cx="${cx}" cy="${top + headR + 6}" r="${headR}" fill="${skin}"/>
  <path d="M ${cx - headR} ${top + headR - 2} a ${headR} ${headR} 0 0 1 ${headR * 2} 0 q -${headR * 0.3} -${headR * 0.9} -${headR} -${headR * 0.9} q -${headR * 0.7} 0 -${headR} ${headR * 0.9} Z" fill="${hair}"/>
  <rect x="${cx - 12}" y="${top + headR * 2 - 6}" width="24" height="22" fill="${shade}"/>

  ${
    garmentImg
      ? `<image href="${garmentImg}" x="${gX}" y="${gY}" width="${gW}" height="${gH}" preserveAspectRatio="xMidYMid meet" filter="url(#soft)"/>`
      : ''
  }

  <g font-family="Montserrat, sans-serif">
    <rect x="16" y="16" width="196" height="30" rx="15" fill="#111"/>
    <text x="30" y="36" font-size="13" font-weight="700" fill="#ffd643">✦ DEMO PREVIEW MODE</text>
    <text x="20" y="${H - 16}" font-size="13" font-weight="600" fill="#5c554a">${escapeXml(
      `${profile.gender} · ${profile.ethnicity} · ${profile.heightCm} cm · ${profile.weightKg} kg`,
    )}</text>
  </g>
</svg>`

  // Rasterise so the result behaves like a normal generated photo (and
  // embedded garment data URLs survive publishing / export).
  return svgToPng(svg, W, H)
}

function svgToPng(svg: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Demo render failed'))
    img.src = url
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
