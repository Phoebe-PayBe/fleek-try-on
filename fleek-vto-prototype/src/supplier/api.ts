/**
 * Hybrid data layer.
 *
 * Preferred path:  React ⇄ FastAPI backend ⇄ Supabase (catalogue + images) ⇄ Gemini
 * Fallback path:   everything client-side (IndexedDB + in-browser Gemini/demo renderer)
 * so the demo keeps working even if the backend isn't running.
 */

import type { AiSummary, Garment, ModelProfile } from './types'
import { DEFAULT_MODEL } from './types'
import * as local from './store'
import * as clientAi from './ai'
import { renderDemoTryOn } from './mannequin'

const API = '/api'

export interface Health {
  mode: 'backend' | 'local'
  geminiOnServer: boolean
  supabase?: string
}

export async function detectHealth(): Promise<Health> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${API}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) throw new Error('bad status')
    const j = await res.json()
    return { mode: 'backend', geminiOnServer: Boolean(j.gemini), supabase: j.supabase }
  } catch {
    return { mode: 'local', geminiOnServer: false }
  }
}

/* ---------- row mapping (snake_case DB ⇄ camelCase app) ---------- */

function rowToGarment(r: any): Garment {
  return {
    id: r.id,
    name: r.name ?? '',
    category: r.category ?? 'Shirts',
    sizeRange: r.size_range ?? '',
    fabric: r.fabric ?? '',
    upcycledSource: r.upcycled_source ?? '',
    wholesalePrice: r.wholesale_price ?? '',
    quantity: r.quantity ?? '',
    templateImage: r.template_url ?? null,
    itemImage: r.item_url ?? null,
    tryOnImage: r.tryon_url ?? null,
    tryOnIsDemo: Boolean(r.tryon_is_demo),
    modelProfile: { ...DEFAULT_MODEL, ...(r.model_profile ?? {}) },
    summary: r.summary ?? null,
    status: r.status ?? 'draft',
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  }
}

function garmentToRow(g: Garment): any {
  return {
    id: g.id,
    name: g.name,
    category: g.category,
    size_range: g.sizeRange,
    fabric: g.fabric,
    upcycled_source: g.upcycledSource,
    wholesale_price: g.wholesalePrice,
    quantity: g.quantity,
    template_url: g.templateImage,
    item_url: g.itemImage,
    tryon_url: g.tryOnImage,
    tryon_is_demo: g.tryOnIsDemo,
    model_profile: g.modelProfile,
    summary: g.summary,
    status: g.status,
  }
}

async function uploadIfDataUrl(
  garmentId: string,
  kind: 'template' | 'item' | 'tryon',
  src: string | null,
): Promise<string | null> {
  if (!src || !src.startsWith('data:')) return src
  const res = await fetch(`${API}/garments/${garmentId}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, data_url: src }),
  })
  if (!res.ok) throw new Error(`Image upload failed: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()).url
}

/* ---------- public surface ---------- */

export async function listGarments(mode: Health['mode']): Promise<Garment[]> {
  if (mode === 'local') return local.loadGarments()
  const res = await fetch(`${API}/garments`)
  if (!res.ok) throw new Error('Could not load garments from backend')
  const rows = await res.json()
  return rows.map(rowToGarment)
}

/** Persist a garment. In backend mode, data-URL images are moved to Supabase
 * storage first and swapped for public URLs. Returns the stored garment. */
export async function persistGarment(mode: Health['mode'], g: Garment): Promise<Garment> {
  if (mode === 'local') {
    await local.saveGarment(g)
    return g
  }
  const stored: Garment = {
    ...g,
    templateImage: await uploadIfDataUrl(g.id, 'template', g.templateImage),
    itemImage: await uploadIfDataUrl(g.id, 'item', g.itemImage),
    tryOnImage: await uploadIfDataUrl(g.id, 'tryon', g.tryOnImage),
  }
  const res = await fetch(`${API}/garments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(garmentToRow(stored)),
  })
  if (!res.ok) throw new Error(`Save failed: ${(await res.text()).slice(0, 200)}`)
  return stored
}

export async function removeGarment(mode: Health['mode'], id: string): Promise<void> {
  if (mode === 'local') return local.deleteGarment(id)
  await fetch(`${API}/garments/${id}`, { method: 'DELETE' })
}

/**
 * Try-on generation, best available engine first:
 * 1. backend + server Gemini key  → server-side Gemini, stored in Supabase
 * 2. client Gemini key            → in-browser Gemini call
 * 3. neither                      → built-in demo renderer (always works)
 */
export async function runTryOn(
  health: Health,
  garment: Garment,
  profile: ModelProfile,
  clientKey: string,
): Promise<{ image: string; isDemo: boolean }> {
  if (health.mode === 'backend' && health.geminiOnServer) {
    const res = await fetch(`${API}/garments/${garment.id}/tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_profile: profile }),
    })
    if (!res.ok) throw new Error(`Try-on failed: ${(await res.text()).slice(0, 300)}`)
    const j = await res.json()
    if (!j.demo) return { image: j.url, isDemo: false }
  }
  if (clientKey) return clientAi.generateTryOn(garment, profile, clientKey)
  return { image: await renderDemoTryOn(garment, profile), isDemo: true }
}

export async function runSummary(
  health: Health,
  garment: Garment,
  clientKey: string,
): Promise<AiSummary> {
  // Client key takes priority when the server has no Gemini key.
  if (health.mode === 'backend' && (health.geminiOnServer || !clientKey)) {
    const res = await fetch(`${API}/garments/${garment.id}/summary`, { method: 'POST' })
    if (!res.ok) throw new Error(`Summary failed: ${(await res.text()).slice(0, 300)}`)
    return res.json()
  }
  return clientAi.generateSummary(garment, clientKey)
}

export { getApiKey, setApiKey, newId } from './store'
