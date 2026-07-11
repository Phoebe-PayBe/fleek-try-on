export type GarmentStatus = 'draft' | 'preview' | 'published'

export type Category =
  | 'Shirts'
  | 'T-shirts'
  | 'Sweatshirts'
  | 'Outerwear'
  | 'Dresses'
  | 'Trousers'
  | 'Skirts'
  | 'Accessories'

/** Body size for the try-on model. Replaces the old height/weight sliders. */
export type ModelSize = 'S' | 'M' | 'L' | 'XL'

export interface ModelProfile {
  ethnicity: string
  gender: string
  size: ModelSize
}

export interface AiSummary {
  feel: string
  styleNotes: string
  buyerNotes: string
}

export interface Garment {
  id: string
  name: string
  category: Category
  sizeRange: string
  fabric: string
  upcycledSource: string
  wholesalePrice: string
  quantity: string
  /** Scanned paper template (spec sheet), enhanced. Data URL or public path. */
  templateImage: string | null
  /** Photo of the actual physical item. Data URL or public path. */
  itemImage: string | null
  /** Latest generated try-on render (mirrors the most recent tryOnRenders cell). */
  tryOnImage: string | null
  tryOnIsDemo: boolean
  /**
   * Generated renders keyed by `${ethnicity}|${size}` (see renderKey). Lets the
   * buyer product page show a different render per demographic + size toggle.
   */
  tryOnRenders: Record<string, string>
  modelProfile: ModelProfile
  summary: AiSummary | null
  status: GarmentStatus
  createdAt: number
}

export const ETHNICITIES = ['Asian', 'White', 'Black', 'South Asian'] as const

export const GENDERS = ['Female', 'Male', 'Non-binary'] as const

export const MODEL_SIZES: ModelSize[] = ['S', 'M', 'L', 'XL']

/** Stable key for a demographic + size render cell. */
export function renderKey(profile: Pick<ModelProfile, 'ethnicity' | 'size'>): string {
  return `${profile.ethnicity}|${profile.size}`
}

export const CATEGORIES: Category[] = [
  'Shirts',
  'T-shirts',
  'Sweatshirts',
  'Outerwear',
  'Dresses',
  'Trousers',
  'Skirts',
  'Accessories',
]

export const DEFAULT_MODEL: ModelProfile = {
  ethnicity: 'Asian',
  gender: 'Male',
  size: 'M',
}
