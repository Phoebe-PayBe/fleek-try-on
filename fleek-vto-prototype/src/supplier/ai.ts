import type { AiSummary, Garment, ModelProfile } from './types'
import { backgroundUrl } from './types'
import { asDataUrl, dataUrlToInline } from './imageUtils'
import { renderDemoTryOn } from './mannequin'
import { modelPhotoFor } from './models'

const IMAGE_MODEL = 'gemini-2.5-flash-image'
const TEXT_MODEL = 'gemini-2.5-flash'

/** AI Studio keys (AIza…) use the Gemini API; Vertex AI express keys (AQ.…)
 * use the aiplatform endpoint. Same request/response schema on both. */
function geminiBase(key: string): string {
  return key.startsWith('AQ.')
    ? 'https://aiplatform.googleapis.com/v1/publishers/google/models'
    : 'https://generativelanguage.googleapis.com/v1beta/models'
}

export interface TryOnResult {
  image: string
  isDemo: boolean
}

/**
 * Check a Gemini API key and return a human-readable verdict. Catches the
 * classic mistakes: Google Cloud / Vision keys (invalid here), disabled
 * billing, model access, key restrictions.
 */
export async function validateGeminiKey(key: string): Promise<{ ok: boolean; message: string }> {
  if (!key) return { ok: false, message: 'No key entered' }
  try {
    // tiny generateContent works for both AI Studio (AIza…) and Vertex (AQ.…) keys
    const res = await fetch(`${geminiBase(key)}/${TEXT_MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }] }),
    })
    if (res.ok) return { ok: true, message: `Key valid via ${new URL(geminiBase(key)).host} ✓` }
    const body = await res.json().catch(() => null)
    const detail = body?.error?.message ?? (await res.text().catch(() => '')) ?? ''
    let hint = ''
    if (res.status === 400 || /API key not valid/i.test(detail)) {
      hint =
        ' — this usually means the key is not a Gemini API key. Create one at aistudio.google.com/apikey (a Google Cloud Vision key will not work).'
    } else if (res.status === 403) {
      hint = ' — the key exists but is blocked (API restrictions or the Generative Language API is not enabled for it).'
    } else if (res.status === 404) {
      hint = ` — the key works but has no access to ${IMAGE_MODEL}.`
    } else if (res.status === 429) {
      hint = ' — quota exhausted; wait a minute or enable billing on the key.'
    }
    return { ok: false, message: `Google says (${res.status}): ${detail.slice(0, 200)}${hint}` }
  } catch (e) {
    return { ok: false, message: `Could not reach Google: ${e instanceof Error ? e.message : String(e)}` }
  }
}

const SIZE_BUILD: Record<string, string> = {
  S: 'slim, size S build',
  M: 'average, size M build',
  L: 'broad, size L build',
  XL: 'plus, size XL build',
}

function modelDescription(p: ModelProfile): string {
  return `${p.ethnicity} ${p.gender.toLowerCase()} fashion model, ${SIZE_BUILD[p.size] ?? 'average build'}`
}

/**
 * Generate the try-on render. Uses Google's Gemini image model when an API
 * key is configured; otherwise falls back to the built-in demo renderer so
 * the studio always works.
 */
export async function generateTryOn(
  garment: Garment,
  profile: ModelProfile,
  apiKey: string,
  stockModelPhoto: string | null = null,
): Promise<TryOnResult> {
  if (!apiKey) {
    return { image: await renderDemoTryOn(garment, profile, stockModelPhoto), isDemo: true }
  }

  // When we have a real photo of the model (uploaded stock photo first, then
  // bundled), dress that exact person; otherwise fall back to a text-described
  // model.
  const modelPhoto = stockModelPhoto ?? modelPhotoFor(profile)
  const bgUrl = backgroundUrl(profile)

  const parts: unknown[] = [
    {
      text: modelPhoto
        ? `Photorealistic full-body e-commerce fashion photograph. The FIRST attached image is the model — ` +
          `keep their face, hair, body proportions and identity unchanged. Dress this exact person in EXACTLY ` +
          `the garment shown in the following product photo — reproduce its colours, fabric texture, seams, ` +
          `prints and proportions faithfully, replacing whatever they are currently wearing on that part of the body. ` +
          (garment.templateImage
            ? `One attached image is the garment's technical spec sheet (paper template); use it for the cut, collar, pockets and proportions. `
            : '') +
          `The garment is "${garment.name}" (${garment.category}), fabric: ${garment.fabric || 'unknown'}. ` +
          (bgUrl
            ? `Place the model in the environment shown in the LAST attached photo (an interior space) — match its lighting and perspective. `
            : `Keep the studio background and lighting natural, whole outfit visible head to toe. `) +
          `Whole outfit visible head to toe. No text, no watermark, single model only.`
        : `Photorealistic full-body e-commerce fashion photograph. A ${modelDescription(profile)} ` +
          `is wearing EXACTLY the garment shown in the attached product photo — reproduce its colours, ` +
          `fabric texture, seams, prints and proportions faithfully. ` +
          (garment.templateImage
            ? `The second attached image is the garment's technical spec sheet (paper template); use it to get the cut, collar, pockets and proportions right. `
            : '') +
          `The garment is "${garment.name}" (${garment.category}), fabric: ${garment.fabric || 'unknown'}. ` +
          (bgUrl
            ? `Set the scene in the environment shown in the LAST attached photo (an interior space) — match its lighting and perspective. `
            : `Neutral warm studio background, soft daylight. `) +
          `Natural relaxed pose, whole outfit visible head to toe. ` +
          `No text, no watermark, single model only.`,
    },
  ]
  if (modelPhoto) {
    parts.push({ inline_data: dataUrlToInline(await asDataUrl(modelPhoto)) })
  }
  if (garment.itemImage) {
    parts.push({ inline_data: dataUrlToInline(await asDataUrl(garment.itemImage)) })
  }
  if (garment.templateImage) {
    parts.push({ inline_data: dataUrlToInline(await asDataUrl(garment.templateImage)) })
  }
  if (bgUrl) {
    parts.push({ inline_data: dataUrlToInline(await asDataUrl(bgUrl)) })
  }

  const res = await fetch(`${geminiBase(apiKey)}/${IMAGE_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
  })
  if (!res.ok) {
    throw new Error(`Gemini image API error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const json = await res.json()
  const respParts: any[] = json?.candidates?.[0]?.content?.parts ?? []
  for (const part of respParts) {
    const inline = part.inlineData ?? part.inline_data
    if (inline?.data) {
      return { image: `data:${inline.mimeType ?? inline.mime_type ?? 'image/png'};base64,${inline.data}`, isDemo: false }
    }
  }
  throw new Error('Gemini returned no image — try again or adjust the photos')
}

/**
 * B2B buyer summary: how the garment feels + style notes. Uses Gemini text
 * model when a key is present, otherwise a rule-based fallback.
 */
export async function generateSummary(garment: Garment, apiKey: string): Promise<AiSummary> {
  if (!apiKey) return fallbackSummary(garment)

  const parts: unknown[] = [
    {
      text:
        `You are writing product intelligence for B2B wholesale buyers (secondhand / vintage / upcycled ` +
        `fashion retailers) sourcing on Fleek. The garment is upcycled: custom-made from reclaimed fabric scraps.\n\n` +
        `Garment: ${garment.name}\nCategory: ${garment.category}\nSizes: ${garment.sizeRange}\n` +
        `Fabric: ${garment.fabric}\nUpcycled source: ${garment.upcycledSource}\n` +
        `Wholesale price: ${garment.wholesalePrice}\nQuantity available: ${garment.quantity}\n\n` +
        `Attached: product photo and/or technical spec sheet. Respond with STRICT JSON only, no markdown fences:\n` +
        `{"feel": "2-3 sentences on how the fabric feels to wear — texture, weight, drape, breathability",\n` +
        ` "styleNotes": "2-3 sentences on the overall style — era, silhouette, how to style it",\n` +
        ` "buyerNotes": "2-3 sentences for the retail buyer — who it sells to, merchandising angle, the upcycled story"}`,
    },
  ]
  if (garment.itemImage) parts.push({ inline_data: dataUrlToInline(await asDataUrl(garment.itemImage)) })
  if (garment.templateImage) parts.push({ inline_data: dataUrlToInline(await asDataUrl(garment.templateImage)) })

  const res = await fetch(`${geminiBase(apiKey)}/${TEXT_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    throw new Error(`Gemini text API error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const json = await res.json()
  const text: string = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? ''
  try {
    const parsed = JSON.parse(text.replace(/^```json?\s*|```\s*$/g, ''))
    return {
      feel: String(parsed.feel ?? ''),
      styleNotes: String(parsed.styleNotes ?? ''),
      buyerNotes: String(parsed.buyerNotes ?? ''),
    }
  } catch {
    return { feel: text, styleNotes: '', buyerNotes: '' }
  }
}

const FEEL_BY_FABRIC: Array<[RegExp, string]> = [
  [/denim/i, 'Sturdy mid-to-heavyweight handle with the familiar dry, crisp denim grain. It softens noticeably with wear and holds structure well — expect a broken-in feel within a few wears.'],
  [/cotton|poplin|jersey/i, 'Soft, breathable cotton handle with a smooth, dry touch. Lightweight enough for all-day wear, with a natural drape that relaxes against the body rather than holding a rigid shape.'],
  [/fleece|sweat/i, 'Plush brushed-back interior with a cosy, insulating feel. Medium-heavy weight that drapes with a relaxed slouch — comfortable straight out of the box.'],
  [/wool|knit/i, 'Warm, textured knit handle with gentle stretch. Insulating without being stifling, and drapes with a soft, structured fall.'],
  [/silk|satin/i, 'Fluid, cool-to-the-touch handle with a subtle sheen. Very light on the body with an elegant, liquid drape.'],
  [/leather/i, 'Substantial, structured feel with a smooth-grain surface that develops character over time. Holds its silhouette firmly.'],
]

function fallbackSummary(g: Garment): AiSummary {
  const feel =
    FEEL_BY_FABRIC.find(([re]) => re.test(g.fabric))?.[1] ??
    'Balanced mid-weight handle typical of quality reclaimed fabric — soft where it touches the skin, with enough body to keep its shape on the rail and on the customer.'
  return {
    feel,
    styleNotes:
      `A one-of-a-kind upcycled ${g.category.toLowerCase().replace(/s$/, '')} with visible craft value — ` +
      `panel mixing and reworked construction give it an elevated streetwear / vintage crossover look. ` +
      `Styles easily over basics; the contrast panelling does the talking.`,
    buyerNotes:
      `Strong fit for secondhand, vintage and sustainability-led retailers: each piece is custom-made from ` +
      `fabric saved from landfill (${g.upcycledSource || 'reclaimed off-cuts'}), so scarcity and story justify a premium retail markup. ` +
      `Merchandise around the upcycled narrative — "no two pieces alike" — at ${g.wholesalePrice || 'the listed wholesale price'} ` +
      `with ${g.quantity || 'limited'} available.`,
  }
}
