// FileTrail Design Tokens
// Art direction: secure digital filing cabinet → clean, trustworthy, minimal
// Palette: deep charcoal surfaces, warm paper-cream accents, amber primary
// Typography: System UI for clarity; no decorative fonts needed in a utility app
// Density: balanced — comfortable for document-heavy lists
//
// Phase 2 additions: amberDim, ink4 alias, success color, duration, shorthand C/T/S/R exports

import { Platform } from 'react-native';

export const Colors = {
  // Backgrounds / Surfaces
  bg:              '#0F0F12',
  surface:         '#16161A',
  surface2:        '#1C1C21',
  surfaceOffset:   '#222228',
  divider:         '#2E2E38',
  border:          '#38383F',

  // Text
  text:            '#EEEAE3',
  textMuted:       '#8A8A96',
  textFaint:       '#52525C',
  textInverse:     '#0F0F12',

  // Primary Accent — Amber (slightly desaturated to avoid flare on glossy displays)
  primary:          '#D9941E',
  primaryHover:     '#C8831A',
  primaryActive:    '#A86012',
  primaryHighlight: '#3A2E18',
  primaryDim:       'rgba(217,148,30,0.15)',

  // Semantic
  success:          '#4D9E5A',
  warning:          '#D97B2A',
  warningHighlight: '#2E1E10',
  error:            '#D04B4B',
  danger:           '#D04B4B',
  dangerHighlight:  '#2E1212',
  info:             '#4A8FC4',
  infoHighlight:    '#102030',

  // Category chip colors
  catReceipt:  '#4A8FC4',
  catBill:     '#2E9E8F',
  catContract: '#9B6DD4',
  catID:       '#4D9E5A',
  catWarranty: '#D9941E',
  catMedical:  '#D04B4B',
  catTax:      '#D97B2A',
  catWork:       '#5E72C4',
  catRetirement: '#B08D57',
  catInsurance:  '#3FA7C9',
  catLegal:      '#7C5C99',
  catVehicle:    '#6E8CA0',
  catProperty:   '#A8674A',
  catEducation:  '#8E7CC3',
  catTravel:     '#45B39A',
  catPet:        '#D9788E',
  catOther:    '#8A8A96',
} as const;

export const Typography = {
  fontBody: 'System',
  fontMono: 'monospace',

  xs:   12,
  sm:   13,
  base: 15,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  28,
  hero: 36,

  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,

  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;

export const Spacing = {
  px:   1,
  '0':  0,
  '1':  4,
  '2':  8,
  '3':  12,
  '4':  16,
  '5':  20,
  '6':  24,
  '8':  32,
  '10': 40,
  '12': 48,
  '16': 64,
  '20': 80,
} as const;

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const;

export const Shadows = Platform.select({
  ios: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2,  elevation: 2  },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6  },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10}, shadowOpacity: 0.38, shadowRadius: 24, elevation: 12 },
  },
  default: {
    sm: { elevation: 2  },
    md: { elevation: 6  },
    lg: { elevation: 12 },
  },
})!;

export const duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;

export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH = 44;

// ─── Shorthand aliases used in Phase 2+ components ──────────────────────────

export const C = {
  ink1:     Colors.bg,
  ink2:     Colors.surface,
  ink3:     Colors.surface2,
  ink4:     Colors.border,
  cream:    Colors.text,
  ash:      Colors.textMuted,
  faint:    Colors.textFaint,
  amber:    Colors.primary,
  amberDim: Colors.primaryDim,
  success:  Colors.success,
  danger:   Colors.error,
  warning:  Colors.warning,
  category: {
    receipt:  Colors.catReceipt,
    bill:     Colors.catBill,
    contract: Colors.catContract,
    id:       Colors.catID,
    warranty: Colors.catWarranty,
    medical:  Colors.catMedical,
    tax:      Colors.catTax,
    work:       Colors.catWork,
    retirement: Colors.catRetirement,
    insurance:  Colors.catInsurance,
    legal:      Colors.catLegal,
    vehicle:    Colors.catVehicle,
    property:   Colors.catProperty,
    education:  Colors.catEducation,
    travel:     Colors.catTravel,
    pet:        Colors.catPet,
    other:    Colors.catOther,
  },
} as const;

export const T = {
  xs:    Typography.xs,
  sm:    Typography.sm,
  base:  Typography.base,
  md:    Typography.md,
  lg:    Typography.lg,
  xl:    Typography.xl,
  xxl:   Typography.xxl,
  hero:  Typography.hero,
  '2xl': Typography.xxl,
  '3xl': Typography.hero,
} as const;

export const S = {
  1:  Spacing['1'],
  2:  Spacing['2'],
  3:  Spacing['3'],
  4:  Spacing['4'],
  5:  Spacing['5'],
  6:  Spacing['6'],
  8:  Spacing['8'],
  10: Spacing['10'],
  12: Spacing['12'],
  16: Spacing['16'],
  20: Spacing['20'],
} as const;

export const R = {
  sm:   Radius.sm,
  md:   Radius.md,
  lg:   Radius.lg,
  xl:   Radius.xl,
  full: Radius.full,
} as const;
