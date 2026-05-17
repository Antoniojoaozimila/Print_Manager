/**
 * Impressão digital — traços baseados no ícone Lucide (ISC).
 * https://lucide.dev/icons/fingerprint
 * viewBox 0 0 24 24, curvas em espiral como impressão real.
 */

export const FP_VIEWBOX = '0 0 24 24';

/** Subcaminhos absolutos (cada um = uma crista animável). */
export const FINGERPRINT_RIDGES = [
  'M 12 10 a 2 2 0 0 0 -2 2 c 0 1.02 -0.1 2.51 -0.26 4',
  'M 14 13.12 c 0 2.38 0 6.38 -1 8.88',
  'M 17.29 21.03 c 0.12 -0.6 0.43 -2.3 0.5 -3.02',
  'M 2 12 a 10 10 0 0 1 18 -6',
  'M 2 16 L 2.01 16',
  'M 21.8 16 c 0.2 -2 0.131 -5.354 0 -6',
  'M 5 19.5 C 5.5 18 6 15 6 12 a 6 6 0 0 1 0.34 -2',
  'M 8.65 22 c 0.21 -0.66 0.45 -1.32 0.57 -2',
  'M 9 6.8 a 6 6 0 0 1 9 5.2 v 2',
];

export const FINGERPRINT_CHECK = 'M 7.5 12.5 L 10.5 15.5 L 16.5 9';
export const FINGERPRINT_CHECK_CX = 12;
export const FINGERPRINT_CHECK_CY = 12;
export const FINGERPRINT_CHECK_R = 9.5;
