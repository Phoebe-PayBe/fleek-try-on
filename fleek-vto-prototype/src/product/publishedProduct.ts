/**
 * Live publish pipeline bridge.
 *
 * The Supplier Studio (/admin) writes garments — including generated try-on
 * renders — into the shared local store. The buyer product page reads the most
 * recently published garment here and turns it into the `Product` shape the
 * VTO viewer expects, mapping each generated render into its demographic + size
 * cell. Falls back to the static MOCK_PRODUCT when nothing is published yet.
 */

import type { Demographic, Product, SizeCode, VtoMatrix } from '../types'
import { MOCK_PRODUCT } from '../mocks/product'
import { VTO_MATRIX } from '../mocks/vtoMatrix'
import { detectHealth, listGarments } from '../supplier/api'
import type { Garment } from '../supplier/types'

/** Product page demographic → supplier ethnicity label. */
const DEMO_TO_ETHNICITY: Record<Demographic, string> = {
  asian: 'Asian',
  white: 'White',
  black: 'Black',
  'south-asian': 'South Asian (Indian)',
}

const DEMOGRAPHICS: Demographic[] = ['asian', 'white', 'black', 'south-asian']
const SIZES: SizeCode[] = ['S', 'M', 'L', 'XL']

function parsePrice(raw: string, fallback: number): number {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const ETHNICITY_TO_DEMO: Record<string, Demographic> = Object.fromEntries(
  Object.entries(DEMO_TO_ETHNICITY).map(([demo, eth]) => [eth, demo as Demographic]),
)

/** The placeholder matrix supplies measurements per demographic + size. */
function buildMatrix(): VtoMatrix {
  const matrix = {} as VtoMatrix
  for (const demo of DEMOGRAPHICS) {
    matrix[demo] = { ...VTO_MATRIX[demo] }
  }
  return matrix
}

/**
 * Supplier render keys (`Ethnicity|Gender|Size`) → viewer keys
 * (`demographic|Gender|Size`). Legacy two-part keys (pre-gender) map to both
 * genders so old renders stay reachable.
 */
function buildLiveRenders(garment: Garment): Record<string, string> {
  const out: Record<string, string> = {}
  // Older garments (renders generated via the API before the combination map
  // existed) still have a headline try-on — surface it under its profile combo.
  if (garment.tryOnImage && Object.keys(garment.tryOnRenders ?? {}).length === 0) {
    const p = garment.modelProfile
    const demo = ETHNICITY_TO_DEMO[p?.ethnicity ?? '']
    if (demo) out[`${demo}|${p.gender || 'Female'}|${p.size || 'M'}`] = garment.tryOnImage
  }
  for (const [key, url] of Object.entries(garment.tryOnRenders ?? {})) {
    if (!url) continue
    const parts = key.split('|')
    const demo = ETHNICITY_TO_DEMO[parts[0]]
    if (!demo) continue
    if (parts.length === 3) {
      out[`${demo}|${parts[1]}|${parts[2]}`] = url
    } else if (parts.length === 2) {
      out[`${demo}|Female|${parts[1]}`] = url
      out[`${demo}|Male|${parts[1]}`] = url
    }
  }
  return out
}

function toProduct(garment: Garment): Product {
  const price = parsePrice(garment.wholesalePrice, MOCK_PRODUCT.pricePerPiece)
  return {
    ...MOCK_PRODUCT,
    id: garment.id,
    title: garment.name || MOCK_PRODUCT.title,
    pricePerPiece: price,
    category: garment.category || MOCK_PRODUCT.category,
    description: garment.upcycledSource || MOCK_PRODUCT.description,
    standardImages: garment.itemImage
      ? [{ id: 'item', url: garment.itemImage, alt: garment.name || 'Garment' }, ...MOCK_PRODUCT.standardImages]
      : MOCK_PRODUCT.standardImages,
    availableDemographics: DEMOGRAPHICS,
    availableSizes: SIZES,
    vtoMatrix: buildMatrix(),
    liveRenders: buildLiveRenders(garment),
  }
}

/**
 * Most recently published garment that has at least one generated render,
 * as a product-page `Product`. Returns null when nothing is published.
 */
export async function loadPublishedProduct(): Promise<Product | null> {
  let garments: Garment[]
  try {
    // Backend mode reads the shared Supabase catalogue (publishes from any
    // machine); offline mode falls back to this browser's local store.
    const health = await detectHealth()
    garments = await listGarments(health.mode)
  } catch {
    return null
  }
  const published = garments
    .filter(
      (g) =>
        g.status === 'published' &&
        (g.tryOnImage || (g.tryOnRenders && Object.keys(g.tryOnRenders).length > 0)),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
  return published.length ? toProduct(published[0]) : null
}
