/** Read a File into a downscaled JPEG data URL (keeps IndexedDB small). */
export function fileToDataUrl(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(drawScaled(img, maxDim))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

function drawScaled(img: HTMLImageElement, maxDim: number, filter?: string): string {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  if (filter) ctx.filter = filter
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * "Scanner" enhancement for phone photos of large paper templates:
 * flattens lighting, boosts contrast so pattern lines and measurements read
 * like a clean document scan.
 */
export function enhanceScan(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve(drawScaled(img, 1600, 'grayscale(0.25) contrast(1.45) brightness(1.15) saturate(1.1)'))
    img.onerror = () => reject(new Error('Could not enhance scan'))
    img.src = dataUrl
  })
}

/** Split a data URL into the pieces the Gemini API wants. */
export function dataUrlToInline(dataUrl: string): { mimeType: string; data: string } {
  const [head, data] = dataUrl.split(',')
  const mimeType = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  return { mimeType, data }
}

/** Fetch an image path/URL into a data URL. Remote URLs get a short timeout
 * and fall back to the backend image proxy (handles CORS/network restrictions). */
export async function pathToDataUrl(path: string): Promise<string> {
  try {
    return await fetchAsDataUrl(path, 6000)
  } catch (err) {
    if (/^https?:/.test(path)) {
      return fetchAsDataUrl(`/api/proxy-image?url=${encodeURIComponent(path)}`, 15000)
    }
    throw err
  }
}

async function fetchAsDataUrl(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } finally {
    clearTimeout(t)
  }
}

export async function asDataUrl(src: string): Promise<string> {
  return src.startsWith('data:') ? src : pathToDataUrl(src)
}

/** Centre-crop an image to a portrait ratio (default 3:4) — backdrop scenes
 * must match the portrait try-on frame so renders aren't letterboxed. */
export function cropToPortrait(dataUrl: string, ratio = 3 / 4, maxH = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const srcRatio = img.naturalWidth / img.naturalHeight
      let sw = img.naturalWidth
      let sh = img.naturalHeight
      if (srcRatio > ratio) sw = Math.round(sh * ratio)
      else sh = Math.round(sw / ratio)
      const sx = Math.round((img.naturalWidth - sw) / 2)
      const sy = Math.round((img.naturalHeight - sh) / 2)
      const h = Math.min(maxH, sh)
      const w = Math.round(h * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Could not crop image'))
    img.src = dataUrl
  })
}
