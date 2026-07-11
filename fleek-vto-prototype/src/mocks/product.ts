import type { Product } from '../types';
import { VTO_MATRIX, VTO_DEMOGRAPHICS, VTO_SIZES } from './vtoMatrix';

/** The single mock product, modelled on the Fleek "Upcycle Rework Sweatshirts" listing. */
export const MOCK_PRODUCT: Product = {
  id: 'upcycle-rework-sweatshirts',
  title: 'Upcycle Rework Sweatshirts',
  pricePerPiece: 6.73,
  bundlePrice: 134.6,
  originalPrice: 214.6,
  discountPct: 37,
  quantity: 20,
  department: 'Unisex',
  category: 'Sweatshirt',
  brands: ['Almost Famous', 'Nike', 'Adidas', 'Puma', 'Polo', 'Champion'],
  grade: 'AB',
  description: [
    'The images and videos are representative. The products that will be delivered will be similar but not the same.',
    'Grade: AB',
    'Sizes: Sweatshirt S - XXL',
    'The bundle contains the following brands: Almost Famous, Nike, Adidas, Puma, Polo, Champion.',
    'This is a branded rework sweatshirt, and its logo is 100% authentic.',
    '100% old material has been used, and branded material has been utilized.',
    'We can also offer discounts on bulk quantities. If you want to create your own design, that can also be done — please message.',
    'Production timeline 7 days. Rework by Funky Find.',
  ].join('\n\n'),
  seller: {
    name: 'Funky Find',
    country: 'PK',
    avatarUrl: 'https://placehold.co/80x80/f4c1d8/1a1a1a?text=FF',
  },
  standardImages: [
    {
      id: 'std-1',
      url: 'https://placehold.co/600x600/d8dcc7/1a1a1a?text=Front+View',
      alt: 'Upcycle rework sweatshirt — front view',
    },
    {
      id: 'std-2',
      url: 'https://placehold.co/600x600/c7d2d8/1a1a1a?text=Size+Chart',
      alt: 'Upcycle rework sweatshirt — size chart',
    },
    {
      id: 'std-3',
      url: 'https://placehold.co/600x600/1a1a1a/ffffff?text=Video',
      alt: 'Upcycle rework sweatshirt — video thumbnail',
    },
  ],
  availableDemographics: VTO_DEMOGRAPHICS,
  availableSizes: VTO_SIZES,
  vtoMatrix: VTO_MATRIX,
};
