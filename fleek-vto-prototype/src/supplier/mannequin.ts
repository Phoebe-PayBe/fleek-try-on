import type { Garment, ModelProfile, ModelSize } from './types'
import { asDataUrl } from './imageUtils'
import { modelPhotoFor } from './models'

/**
 * Demo-mode try-on renderer (used when no Gemini key is configured).
 *
 * When we have a real photo of the model for this demographic + size, we draw
 * that photo and drape the garment photo over the torso — a stand-in for the
 * photorealistic Gemini composite. Otherwise we fall back to a stylised drawn
 * figure scaled to the chosen size. Either way the studio always produces a
 * preview so the pipeline can be demoed end-to-end without an API key.
 */

const W = 600
const H = 800

const SIZE_SCALE: Record<ModelSize, { h: number; w: number }> = {
  S: { h: 0.95, w: 0.86 },
  M: { h: 1.0, w: 1.0 },
  L: { h: 1.05, w: 1.16 },
  XL: { h: 1.09, w: 1.32 },
}

const SKIN: Record<string, { skin: string; shade: string; hair: string }> = {
  Asian: { skin: '#eac39e', shade: '#d9ab82', hair: '#1d1712' },
  Black: { skin: '#6b4a35', shade: '#57392a', hair: '#120d0a' },
  White: { skin: '#f0d0b7', shade: '#ddb99e', hair: '#5a3d23' },
  'South Asian': { skin: '#c68b59', shade: '#b07747', hair: '#170f0a' },
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 40)}`))
    img.src = src
  })
}

/** Cover-fit a source image into a WxH box (like CSS object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export async function renderDemoTryOn(garment: Garment, profile: ModelProfile): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const photo = modelPhotoFor(profile)
  if (photo) {
    await drawPhotoBase(ctx, photo)
  } else {
    drawFigureBase(ctx, profile)
  }

  await drawGarment(ctx, garment)
  drawChrome(ctx, profile)

  return canvas.toDataURL('image/png')
}

async function drawPhotoBase(ctx: CanvasRenderingContext2D, photoSrc: string) {
  const model = await loadImage(photoSrc)
  drawCover(ctx, model, 0, 0, W, H)
}

function drawFigureBase(ctx: CanvasRenderingContext2D, profile: ModelProfile) {
  const { skin, shade, hair } = SKIN[profile.ethnicity] ?? SKIN.Asian
  const { h: hScale, w: wScale } = SIZE_SCALE[profile.size]

  // warm studio backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#f7f3ea')
  bg.addColorStop(1, '#e9e2d2')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const cx = W / 2
  const figH = 620 * hScale
  const top = H - 60 - figH
  const headR = 32 * hScale
  const shoulderW = 150 * hScale * wScale
  const hipW = (profile.gender === 'Female' ? 138 : 116) * hScale * wScale
  const neckY = top + headR * 2 + 6
  const torsoH = figH * 0.34
  const hipY = neckY + torsoH
  const legH = figH * 0.5

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.10)'
  ctx.beginPath()
  ctx.ellipse(cx, H - 48, 165 * wScale, 20, 0, 0, Math.PI * 2)
  ctx.fill()

  // legs
  ctx.fillStyle = shade
  ctx.fillRect(cx - hipW / 2 + 6, hipY, hipW / 2 - 18, legH)
  ctx.fillStyle = skin
  ctx.fillRect(cx + 12, hipY, hipW / 2 - 18, legH)

  // torso
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.moveTo(cx - shoulderW / 2, neckY + 8)
  ctx.quadraticCurveTo(cx - shoulderW / 2, hipY, cx - hipW / 2, hipY)
  ctx.lineTo(cx + hipW / 2, hipY)
  ctx.quadraticCurveTo(cx + shoulderW / 2, hipY, cx + shoulderW / 2, neckY + 8)
  ctx.closePath()
  ctx.fill()

  // head
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(cx, top + headR + 6, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = hair
  ctx.beginPath()
  ctx.arc(cx, top + headR + 2, headR, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = shade
  ctx.fillRect(cx - 12, top + headR * 2 - 4, 24, 20)
}

async function drawGarment(ctx: CanvasRenderingContext2D, garment: Garment) {
  if (!garment.itemImage) return
  let src: string
  try {
    src = await asDataUrl(garment.itemImage)
  } catch {
    return
  }
  const g = await loadImage(src).catch(() => null)
  if (!g) return

  const isBottom = garment.category === 'Trousers' || garment.category === 'Skirts'
  // Torso box on a standing full-body model, tuned to the asian-male photos.
  const gW = W * 0.5
  const ratio = g.naturalHeight / g.naturalWidth
  const gH = gW * ratio
  const gX = (W - gW) / 2
  const gY = isBottom ? H * 0.52 : H * 0.2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 10
  ctx.drawImage(g, gX, gY, gW, gH)
  ctx.restore()
}

function drawChrome(ctx: CanvasRenderingContext2D, profile: ModelProfile) {
  // "DEMO PREVIEW" pill
  ctx.fillStyle = '#111'
  roundRect(ctx, 16, 16, 208, 30, 15)
  ctx.fill()
  ctx.fillStyle = '#ffd643'
  ctx.font = '700 13px Montserrat, sans-serif'
  ctx.fillText('✦ DEMO PREVIEW MODE', 30, 36)

  // caption
  const caption = `${profile.gender} · ${profile.ethnicity} · Size ${profile.size}`
  ctx.font = '600 13px Montserrat, sans-serif'
  const capW = ctx.measureText(caption).width + 28
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  roundRect(ctx, 16, H - 44, capW, 30, 15)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(caption, 30, H - 24)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
