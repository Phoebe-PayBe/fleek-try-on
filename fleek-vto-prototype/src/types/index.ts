// ---- VTO domain ----
export type Demographic = 'asian' | 'white' | 'black' | 'south-asian';
export type SizeCode = 'S' | 'M' | 'L' | 'XL';

/** Human-readable labels for UI. */
export const DEMOGRAPHIC_LABELS: Record<Demographic, string> = {
  asian: 'Asian',
  white: 'White',
  black: 'Black',
  'south-asian': 'South Asian (Indian)',
};

export const SIZE_LABELS: Record<SizeCode, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'X-Large',
};

/** Garment measurements shown in the overlay, per size (centimetres). */
export interface GarmentMeasurements {
  chest: number; // pit-to-pit
  length: number; // collar-to-hem
  shoulder: number;
  sleeve: number;
}

/** One cell of the VTO matrix = a single demographic + size combination. */
export interface VtoVariant {
  demographic: Demographic;
  size: SizeCode;
  imageUrl: string;
  measurements: GarmentMeasurements;
}

/** Full lookup: matrix[demographic][size] -> VtoVariant. */
export type VtoMatrix = Record<Demographic, Record<SizeCode, VtoVariant>>;

// ---- Product domain ----
export interface ProductImage {
  id: string;
  url: string;
  alt: string;
}

export interface Seller {
  name: string;
  country: string;
  avatarUrl: string;
}

export interface Product {
  id: string;
  title: string;
  pricePerPiece: number;
  bundlePrice: number;
  originalPrice: number;
  discountPct: number;
  quantity: number; // pieces in the bundle
  department: string;
  category: string;
  brands: string[];
  grade: string;
  description: string;
  seller: Seller;
  standardImages: ProductImage[];
  availableDemographics: Demographic[];
  availableSizes: SizeCode[];
  vtoMatrix: VtoMatrix;
}
