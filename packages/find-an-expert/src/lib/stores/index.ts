/**
 * Stores index - exports all global stores
 */
export {
  clearFontPreference,
  clearPalettePreference,
  clearThemePreferences,
  createThemeStore,
  hasThemePreferences,
  initTheme,
  setDarkMode,
  setFont,
  setPalette,
  type DarkMode,
} from './theme.svelte.ts';

export { fontCategories, getFontsByCategory } from './fonts.svelte.ts';

export { initLocale, locales, localeState, setLocale, type Locale } from './locale.svelte.ts';
