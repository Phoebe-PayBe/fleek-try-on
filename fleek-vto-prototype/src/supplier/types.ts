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
  /** Background scene id (see BACKGROUNDS). Defaults to the studio backdrop. */
  background?: string
  /** Public storage URL of the chosen backdrop image (null/absent = studio). */
  backgroundUrl?: string | null
  /** Resolved model photo the studio previewed — the server uses this exact
   * photo as the try-on base so the render matches the panel. */
  modelPhotoUrl?: string | null
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

export const ETHNICITIES = ['Black', 'White', 'South Asian (Indian)', 'Asian'] as const

/** URL-safe ids used for stock-model storage paths. */
export const ETHNICITY_SLUGS: Record<string, string> = {
  Black: 'black',
  White: 'white',
  'South Asian (Indian)': 'indian-brown',
  Asian: 'asian',
}

export const GENDERS = ['Female', 'Male'] as const

/** Try-on backdrop options. 'default' keeps the neutral studio look. */
export const BACKGROUNDS = [
  { id: 'default', label: 'Default studio', url: null },
  {
    id: 'fleek-office',
    label: 'Fleek office',
    url: 'https://pcyiyxlnmqobowdsgmtl.supabase.co/storage/v1/object/public/garment-images/backgrounds/fleek-office.jpg',
  },
] as const

/** Resolve the backdrop image for a profile: explicit URL first, then built-ins. */
export function backgroundUrl(profile: Pick<ModelProfile, 'background' | 'backgroundUrl'>): string | null {
  if (profile.backgroundUrl) return profile.backgroundUrl
  return BACKGROUNDS.find((b) => b.id === profile.background)?.url ?? null
}

export const MODEL_SIZES: ModelSize[] = ['S', 'M', 'L', 'XL']

/** Stable key for a demographic + gender + size render cell — one render max
 * per combination; regenerating the same combination replaces it. */
export function renderKey(profile: Pick<ModelProfile, 'ethnicity' | 'gender' | 'size'>): string {
  return `${profile.ethnicity}|${profile.gender}|${profile.size}`
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
