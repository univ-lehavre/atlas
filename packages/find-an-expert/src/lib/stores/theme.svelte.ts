/**
 * Theme store for managing UI palette, font pairing, and dark mode
 * Persists preferences in cookies for server-side access
 * Applies themes via data attributes: data-palette and data-font
 */

import { paletteNames, type PaletteName } from '$lib/palettes';
import { fontPairings, getFontByName, type FontPairing } from './fonts.svelte.ts';

/** Dark mode options */
export type DarkMode = 'light' | 'dark' | 'system';

/** Cookie names for theme preferences */
const COOKIE_PALETTE = 'theme-palette';
const COOKIE_FONT = 'theme-font';
const COOKIE_DARK_MODE = 'theme-dark-mode';

/** Cookie max age: 1 year */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Current palette state */
let currentPalette = $state<PaletteName>('default');

/** Current font name state */
let currentFontName = $state<string>('interface');

/** Current dark mode preference */
let currentDarkMode = $state<DarkMode>('system');

/**
 * Set a cookie with standard options
 */
const setCookie = (name: string, value: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
};

/**
 * Get a cookie value by name
 */
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Apply the current palette to the document
 */
const applyPalette = (palette: PaletteName): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.palette = palette;
};

/**
 * Apply the current font to the document
 */
const applyFont = (fontName: string): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.font = fontName;
};

/**
 * Apply the current dark mode setting to the document
 */
const applyDarkMode = (mode: DarkMode): void => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', isDark);
};

/**
 * Set the current palette and persist to cookie
 */
export const setPalette = (palette: PaletteName): void => {
  currentPalette = palette;
  setCookie(COOKIE_PALETTE, palette);
  applyPalette(palette);
};

/**
 * Get the current font pairing object
 */
const getFont = (): FontPairing => {
  return getFontByName(currentFontName) ?? fontPairings[0];
};

/**
 * Set the current font and persist to cookie
 */
export const setFont = (fontName: string): void => {
  const font = getFontByName(fontName);
  if (!font) return;

  currentFontName = fontName;
  setCookie(COOKIE_FONT, fontName);
  applyFont(fontName);
};

/**
 * Set the dark mode preference and persist to cookie
 */
export const setDarkMode = (mode: DarkMode): void => {
  currentDarkMode = mode;
  setCookie(COOKIE_DARK_MODE, mode);
  applyDarkMode(mode);
};

/**
 * Get a random palette name
 */
const getRandomPalette = (): PaletteName => {
  return paletteNames[Math.floor(Math.random() * paletteNames.length)];
};

/**
 * Get a random font name
 */
const getRandomFont = (): string => {
  return fontPairings[Math.floor(Math.random() * fontPairings.length)].name;
};

/**
 * Initialize theme from cookies
 * If no cookie exists, selects a random value without saving to cookie
 * Call this on client-side mount
 */
export const initTheme = (): void => {
  // Initialize palette (from cookie or random)
  const savedPalette = getCookie(COOKIE_PALETTE) as PaletteName | null;
  if (savedPalette && paletteNames.includes(savedPalette)) {
    currentPalette = savedPalette;
  } else {
    // Random selection without saving to cookie
    currentPalette = getRandomPalette();
  }
  applyPalette(currentPalette);

  // Initialize font (from cookie or random)
  const savedFontName = getCookie(COOKIE_FONT);
  if (savedFontName && getFontByName(savedFontName)) {
    currentFontName = savedFontName;
  } else {
    // Random selection without saving to cookie
    currentFontName = getRandomFont();
  }
  applyFont(currentFontName);

  // Initialize dark mode
  const savedDarkMode = getCookie(COOKIE_DARK_MODE) as DarkMode | null;
  if (savedDarkMode && ['light', 'dark', 'system'].includes(savedDarkMode)) {
    currentDarkMode = savedDarkMode;
  }
  applyDarkMode(currentDarkMode);

  // Listen for system preference changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentDarkMode === 'system') {
        applyDarkMode('system');
      }
    });
  }
};

/**
 * Delete a cookie by setting it to expire
 */
const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

/**
 * Check if theme preferences are saved in cookies
 */
export const hasThemePreferences = (): { palette: boolean; font: boolean } => {
  return {
    palette: getCookie(COOKIE_PALETTE) !== null,
    font: getCookie(COOKIE_FONT) !== null,
  };
};

/**
 * Clear theme preferences from cookies and reinitialize with random values
 */
export const clearThemePreferences = (): void => {
  deleteCookie(COOKIE_PALETTE);
  deleteCookie(COOKIE_FONT);

  // Set random values without saving to cookies
  currentPalette = getRandomPalette();
  currentFontName = getRandomFont();

  applyPalette(currentPalette);
  applyFont(currentFontName);
};

/**
 * Clear only palette preference from cookie
 */
export const clearPalettePreference = (): void => {
  deleteCookie(COOKIE_PALETTE);
};

/**
 * Clear only font preference from cookie
 */
export const clearFontPreference = (): void => {
  deleteCookie(COOKIE_FONT);
};

/**
 * Create a reactive theme store for use in components
 */
export const createThemeStore = () => {
  return {
    get palette() {
      return currentPalette;
    },
    set palette(value: PaletteName) {
      setPalette(value);
    },
    get fontName() {
      return currentFontName;
    },
    set fontName(value: string) {
      setFont(value);
    },
    get font() {
      return getFont();
    },
    get darkMode() {
      return currentDarkMode;
    },
    set darkMode(value: DarkMode) {
      setDarkMode(value);
    },
  };
};
