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
import { renderKey } from '../supplier/types'
import type { Garment } from '../supplier/types'

/** Product page demographic → supplier ethnicity label. */
const DEMO_TO_ETHNICITY: Record<Demographic, string> = {
  asian: 'Asian',
  white: 'White',
  black: 'Black',
  'south-asian': 'Indian / Brown',
}

const DEMOGRAPHICS: Demographic[] = ['asian', 'white', 'black', 'south-asian']
const SIZES: SizeCode[] = ['S', 'M', 'L', 'XL']

function parsePrice(raw: string, fallback: number): number {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Overlay a garment's generated renders onto a clone of the placeholder matrix. */
function buildMatrix(garment: Garment): VtoMatrix {
  const matrix = {} as VtoMatrix
  for (const demo of DEMOGRAPHICS) {
    matrix[demo] = {} as VtoMatrix[Demographic]
    for (const size of SIZES) {
      const base = VTO_MATRIX[demo][size]
      const key = renderKey({ ethnicity: DEMO_TO_ETHNICITY[demo], size })
      const render = garment.tryOnRenders?.[key]
      matrix[demo][size] = render ? { ...base, imageUrl: render } : base
    }
  }
  return matrix
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
    vtoMatrix: buildMatrix(garment),
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
    .filter((g) => g.status === 'published' && g.tryOnRenders && Object.keys(g.tryOnRenders).length > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
  return published.length ? toProduct(published[0]) : null
}
