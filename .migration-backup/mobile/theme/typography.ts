import { Platform } from 'react-native';

/**
 * FileTrail Typography Tokens
 * System fonts — no external font loading needed in Phase 1.
 * iOS: SF Pro | Android: Roboto
 */
export const Font = {
  // Font families
  body: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),

  // Weights
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
} as const;

export const T = {
  // Sizes — 4px base grid, 12px minimum floor
  xs:   12,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
} as const;

export const LineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;
