import type { ModelProfile, ModelSize } from './types'

/**
 * Real full-body model photos we can dress the garment onto (male sets shot
 * for Asian, White and Indian / Brown; copied from materials/ into
 * public/models). Demographics without a set fall back to a stock photo
 * uploaded in the studio, then to the drawn demo figure. Asian XL reuses the
 * L photo until an XL shoot exists.
 */
const MALE_SETS: Record<string, Record<ModelSize, string>> = {
  Asian: {
    S: '/models/asian-male-s.png',
    M: '/models/asian-male-m.png',
    L: '/models/asian-male-l.png',
    XL: '/models/asian-male-l.png',
  },
  White: {
    S: '/models/white-male-s.png',
    M: '/models/white-male-m.png',
    L: '/models/white-male-l.png',
    XL: '/models/white-male-xl.png',
  },
  'Indian / Brown': {
    S: '/models/indian-male-s.png',
    M: '/models/indian-male-m.png',
    L: '/models/indian-male-l.png',
    XL: '/models/indian-male-xl.png',
  },
}

const FEMALE_SETS: Record<string, Partial<Record<ModelSize, string>>> = {
  Asian: {
    S: '/models/asian-female-s.png',
    M: '/models/asian-female-m.png',
    L: '/models/asian-female-l.png',
    XL: '/models/asian-female-xl.png',
  },
  Black: {
    S: '/models/black-female-s.png',
  },
}

/** The real model photo for this profile, or null if we only have a drawn figure. */
export function modelPhotoFor(profile: Pick<ModelProfile, 'ethnicity' | 'gender' | 'size'>): string | null {
  const set = profile.gender === 'Female' ? FEMALE_SETS[profile.ethnicity] : MALE_SETS[profile.ethnicity]
  if (!set) return null
  return set[profile.size] ?? set.M ?? set.S ?? null
}
