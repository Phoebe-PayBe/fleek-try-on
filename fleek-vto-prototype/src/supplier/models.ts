import type { ModelProfile, ModelSize } from './types'

/**
 * Real full-body model photos we can dress the garment onto (male sets shot
 * for Asian, White and Indian / Brown; female sets for Asian S–XL and
 * Black S). Served from Supabase storage so deployments stay lightweight.
 * Demographics without a set fall back to a stock photo uploaded in the
 * studio, then to the drawn demo figure. Missing sizes reuse the closest
 * shot size.
 */
const CDN =
  'https://pcyiyxlnmqobowdsgmtl.supabase.co/storage/v1/object/public/garment-images/model-library'

const MALE_SETS: Record<string, Partial<Record<ModelSize, string>>> = {
  Asian: {
    S: `${CDN}/asian-male-s.jpg`,
    M: `${CDN}/asian-male-m.jpg`,
    L: `${CDN}/asian-male-l.jpg`,
    XL: `${CDN}/asian-male-l.jpg`,
  },
  White: {
    S: `${CDN}/white-male-s.jpg`,
    M: `${CDN}/white-male-m.jpg`,
    L: `${CDN}/white-male-l.jpg`,
    XL: `${CDN}/white-male-xl.jpg`,
  },
  'South Asian (Indian)': {
    S: `${CDN}/indian-male-s.jpg`,
    M: `${CDN}/indian-male-m.jpg`,
    L: `${CDN}/indian-male-l.jpg`,
    XL: `${CDN}/indian-male-xl.jpg`,
  },
}

const FEMALE_SETS: Record<string, Partial<Record<ModelSize, string>>> = {
  Asian: {
    S: `${CDN}/asian-female-s.jpg`,
    M: `${CDN}/asian-female-m.jpg`,
    L: `${CDN}/asian-female-l.jpg`,
    XL: `${CDN}/asian-female-xl.jpg`,
  },
  Black: {
    S: `${CDN}/black-female-s.jpg`,
    M: `${CDN}/black-female-m.jpg`,
    L: `${CDN}/black-female-l.jpg`,
    XL: `${CDN}/black-female-xl.jpg`,
  },
  White: {
    S: `${CDN}/white-female-s.jpg`,
    M: `${CDN}/white-female-m.jpg`,
    L: `${CDN}/white-female-l.jpg`,
    XL: `${CDN}/white-female-xl.jpg`,
  },
}

/** The real model photo for this profile, or null if we only have a drawn figure. */
export function modelPhotoFor(profile: Pick<ModelProfile, 'ethnicity' | 'gender' | 'size'>): string | null {
  const set = profile.gender === 'Female' ? FEMALE_SETS[profile.ethnicity] : MALE_SETS[profile.ethnicity]
  if (!set) return null
  return set[profile.size] ?? set.M ?? set.S ?? null
}
