/**
 * UI Palettes Module
 * Defines 18 color palettes for the application UI
 * Each palette is defined by CSS custom properties in app.css
 *
 * Palettes use OKLCH color space with 7 parameters:
 * - 6 hues (primary, accent, neutral, success, warning, error)
 * - 1 optional chroma value for saturation control
 */

/**
 * Available palette names
 * Each name corresponds to a [data-palette="name"] CSS selector in app.css
 */
export const paletteNames = [
  'default',
  'corporate',
  'executive',
  'forest',
  'ocean',
  'earth',
  'neon',
  'electric',
  'tropical',
  'paper',
  'slate',
  'stone',
  'amber',
  'rose',
  'terracotta',
  'arctic',
  'indigo',
  'mint',
] as const;

/** Palette name type derived from the constant array */
export type PaletteName = (typeof paletteNames)[number];

/** Palette category type */
type PaletteCategory = 'professional' | 'nature' | 'vibrant' | 'minimal' | 'warm' | 'cool';

/** Category metadata */
interface PaletteCategoryInfo {
  id: PaletteCategory;
  name: string;
  description: string;
}

/** Palette color data (hues and chroma for OKLCH) */
interface PaletteColors {
  primary: number;
  accent: number;
  secondary: number;
  success: number;
  warning: number;
  error: number;
  chroma: number;
}

/** Available palette categories with descriptions */
export const paletteCategories: PaletteCategoryInfo[] = [
  { id: 'professional', name: 'Professionnel', description: 'Thèmes business et corporate' },
  { id: 'nature', name: 'Nature', description: 'Tons naturels et terreux' },
  { id: 'vibrant', name: 'Vibrant', description: 'Couleurs vives et audacieuses' },
  { id: 'minimal', name: 'Minimal', description: 'Design épuré et sobre' },
  { id: 'warm', name: 'Chaleureux', description: 'Tons chauds et accueillants' },
  { id: 'cool', name: 'Frais', description: 'Couleurs froides et apaisantes' },
];

/** Mapping of categories to their palettes */
export const palettesByCategory: Record<PaletteCategory, PaletteName[]> = {
  professional: ['default', 'corporate', 'executive'],
  nature: ['forest', 'ocean', 'earth'],
  vibrant: ['neon', 'electric', 'tropical'],
  minimal: ['paper', 'slate', 'stone'],
  warm: ['amber', 'rose', 'terracotta'],
  cool: ['arctic', 'indigo', 'mint'],
};

/** Palette color definitions (hues in degrees 0-360, chroma 0-1) */
const paletteColors: Record<PaletteName, PaletteColors> = {
  // Professional
  default: {
    primary: 250,
    accent: 180,
    secondary: 260,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.15,
  },
  corporate: {
    primary: 220,
    accent: 200,
    secondary: 220,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.12,
  },
  executive: {
    primary: 240,
    accent: 280,
    secondary: 240,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.1,
  },
  // Nature
  forest: {
    primary: 145,
    accent: 85,
    secondary: 145,
    success: 120,
    warning: 55,
    error: 15,
    chroma: 0.15,
  },
  ocean: {
    primary: 200,
    accent: 180,
    secondary: 210,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.15,
  },
  earth: {
    primary: 35,
    accent: 85,
    secondary: 40,
    success: 120,
    warning: 55,
    error: 15,
    chroma: 0.12,
  },
  // Vibrant
  neon: {
    primary: 280,
    accent: 320,
    secondary: 260,
    success: 150,
    warning: 50,
    error: 350,
    chroma: 0.22,
  },
  electric: {
    primary: 240,
    accent: 60,
    secondary: 250,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.2,
  },
  tropical: {
    primary: 170,
    accent: 45,
    secondary: 180,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.18,
  },
  // Minimal
  paper: {
    primary: 220,
    accent: 200,
    secondary: 220,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.08,
  },
  slate: {
    primary: 210,
    accent: 210,
    secondary: 210,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.06,
  },
  stone: {
    primary: 30,
    accent: 30,
    secondary: 30,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.05,
  },
  // Warm
  amber: {
    primary: 45,
    accent: 25,
    secondary: 40,
    success: 145,
    warning: 55,
    error: 15,
    chroma: 0.15,
  },
  rose: {
    primary: 350,
    accent: 320,
    secondary: 355,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.14,
  },
  terracotta: {
    primary: 25,
    accent: 35,
    secondary: 25,
    success: 120,
    warning: 55,
    error: 5,
    chroma: 0.13,
  },
  // Cool
  arctic: {
    primary: 200,
    accent: 180,
    secondary: 210,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.12,
  },
  indigo: {
    primary: 260,
    accent: 280,
    secondary: 260,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.16,
  },
  mint: {
    primary: 160,
    accent: 145,
    secondary: 165,
    success: 145,
    warning: 45,
    error: 25,
    chroma: 0.14,
  },
};

/**
 * Get preview colors for a palette (as OKLCH strings)
 * Matches the exact CSS formulas from app.css for -500 shades:
 * - primary-500: oklch(55% var(--chroma) var(--hue-primary))
 * - accent-500: oklch(60% var(--chroma) var(--hue-accent))
 * - secondary-500: oklch(55% calc(var(--chroma) * 0.13) var(--hue-neutral))
 * - success-500: oklch(55% var(--chroma) var(--hue-success))
 * - warning-500: oklch(75% var(--chroma) var(--hue-warning))
 * - error-500: oklch(55% calc(var(--chroma) * 1.33) var(--hue-error))
 */
export const getPalettePreviewColors = (
  palette: PaletteName
): {
  primary: string;
  accent: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
} => {
  const colors = paletteColors[palette];
  const c = colors.chroma;
  return {
    primary: `oklch(55% ${c} ${colors.primary})`,
    accent: `oklch(60% ${c} ${colors.accent})`,
    secondary: `oklch(55% ${c * 0.13} ${colors.secondary})`,
    success: `oklch(55% ${c} ${colors.success})`,
    warning: `oklch(75% ${c} ${colors.warning})`,
    error: `oklch(55% ${c * 1.33} ${colors.error})`,
  };
};
