import type {
  Demographic,
  SizeCode,
  VtoMatrix,
  VtoVariant,
  GarmentMeasurements,
} from '../types';

const DEMOGRAPHICS: Demographic[] = ['asian', 'white', 'black'];
const SIZES: SizeCode[] = ['S', 'M', 'L', 'XL'];

/** Base measurements for size S; each larger size adds the increments below. */
const BASE_MEASUREMENTS: GarmentMeasurements = {
  chest: 52,
  length: 66,
  shoulder: 44,
  sleeve: 60,
};

const SIZE_STEP: Record<SizeCode, number> = { S: 0, M: 1, L: 2, XL: 3 };
const INCREMENT: GarmentMeasurements = { chest: 3, length: 2, shoulder: 1.5, sleeve: 2 };

/** Distinct background colour per demographic so combos are visually different. */
const DEMO_BG: Record<Demographic, string> = {
  asian: '2d3a56',
  white: '4a4e69',
  black: '22333b',
};

function measurementsFor(size: SizeCode): GarmentMeasurements {
  const step = SIZE_STEP[size];
  return {
    chest: BASE_MEASUREMENTS.chest + INCREMENT.chest * step,
    length: BASE_MEASUREMENTS.length + INCREMENT.length * step,
    shoulder: BASE_MEASUREMENTS.shoulder + INCREMENT.shoulder * step,
    sleeve: BASE_MEASUREMENTS.sleeve + INCREMENT.sleeve * step,
  };
}

/**
 * Placeholder image encoding demographic + size so every toggle combination
 * renders a visibly different image without any real assets.
 * (No live generation — pure mock, per prototype scope.)
 */
function imageFor(demographic: Demographic, size: SizeCode): string {
  const label = encodeURIComponent(
    `${demographic.toUpperCase()} model\n· Size ${size} ·`,
  );
  return `https://placehold.co/560x720/${DEMO_BG[demographic]}/ffffff?text=${label}`;
}

/** Build the full 3 x 4 = 12 variant matrix programmatically. */
function buildMatrix(): VtoMatrix {
  const matrix = {} as VtoMatrix;
  for (const demographic of DEMOGRAPHICS) {
    const row = {} as Record<SizeCode, VtoVariant>;
    for (const size of SIZES) {
      row[size] = {
        demographic,
        size,
        imageUrl: imageFor(demographic, size),
        measurements: measurementsFor(size),
      };
    }
    matrix[demographic] = row;
  }
  return matrix;
}

export const VTO_MATRIX: VtoMatrix = buildMatrix();
export const VTO_DEMOGRAPHICS = DEMOGRAPHICS;
export const VTO_SIZES = SIZES;
