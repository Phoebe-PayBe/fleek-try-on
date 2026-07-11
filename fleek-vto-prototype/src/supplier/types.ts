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

export interface ModelProfile {
  ethnicity: string
  gender: string
  heightCm: number
  weightKg: number
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
  /** Latest generated try-on render. */
  tryOnImage: string | null
  tryOnIsDemo: boolean
  modelProfile: ModelProfile
  summary: AiSummary | null
  status: GarmentStatus
  createdAt: number
}

export const ETHNICITIES = ['Black', 'White', 'Asian', 'Indian / Brown'] as const

/** URL-safe ids used for stock-model storage paths. */
export const ETHNICITY_SLUGS: Record<string, string> = {
  Black: 'black',
  White: 'white',
  Asian: 'asian',
  'Indian / Brown': 'indian-brown',
}

export const GENDERS = ['Female', 'Male', 'Non-binary'] as const

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
  gender: 'Female',
  heightCm: 170,
  weightKg: 62,
}
