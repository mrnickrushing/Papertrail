/**
 * PaperTrail Design Tokens — Colors
 *
 * Dark-first palette. Clean, document-forward.
 * Primary: warm off-white on deep charcoal.
 * Accent: amber — evokes paper, warmth, filing cabinets.
 */
export const Colors = {
  // Surfaces
  bg:              '#0D0D0D',
  surface:         '#141414',
  surface2:        '#1A1A1A',
  surfaceOffset:   '#202020',
  surfaceDynamic:  '#2A2A2A',
  border:          '#2E2E2E',
  divider:         '#242424',

  // Text
  text:            '#F0EDE8',
  textMuted:       '#8A8680',
  textFaint:       '#4A4744',
  textInverse:     '#0D0D0D',

  // Accent — Amber/Paper
  accent:          '#D4A847',
  accentHover:     '#C49A3A',
  accentActive:    '#A8822F',
  accentHighlight: '#2A2318',
  accentSubtle:    '#1E1A11',

  // Semantic
  success:         '#4A9B6F',
  successHighlight:'#0F2018',
  warning:         '#D4842A',
  warningHighlight:'#201408',
  danger:          '#C45050',
  dangerHighlight: '#200E0E',
  info:            '#4A82B8',
  infoHighlight:   '#0E1820',

  // Document type colors
  docReceipt:      '#4A9B6F',
  docContract:     '#4A82B8',
  docID:           '#D4A847',
  docWarranty:     '#9B6F4A',
  docMedical:      '#C45050',
  docInsurance:    '#6F4AB8',
  docTax:          '#4AB8A0',
  docInvoice:      '#B84A82',
  docPersonal:     '#8A8680',

  // Utility
  transparent:     'transparent',
  overlay:         'rgba(0,0,0,0.6)',
  overlayLight:    'rgba(0,0,0,0.3)',
} as const;

export type ColorKey = keyof typeof Colors;
