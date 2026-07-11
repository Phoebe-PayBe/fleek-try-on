import type { ModelProfile, ModelSize } from './types'

/**
 * Real full-body model photos we can dress the garment onto. Only the Asian
 * male set exists today (materials/asian-male-{s,m,L}.png, copied into
 * public/models). Other demographics fall back to the drawn demo figure until
 * their photos are shot. XL reuses the L photo until an XL shoot exists.
 */
const ASIAN_MALE: Record<ModelSize, string> = {
  S: '/models/asian-male-s.png',
  M: '/models/asian-male-m.png',
  L: '/models/asian-male-l.png',
  XL: '/models/asian-male-l.png',
}

/** The real model photo for this profile, or null if we only have a drawn figure. */
export function modelPhotoFor(profile: Pick<ModelProfile, 'ethnicity' | 'gender' | 'size'>): string | null {
  if (profile.ethnicity === 'Asian' && profile.gender !== 'Female') {
    return ASIAN_MALE[profile.size] ?? ASIAN_MALE.M
  }
  return null
}
