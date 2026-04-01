/**
 * Locale store for managing application language.
 * Persists language preference in cookies and detects browser language.
 *
 * Uses Svelte 5 runes for reactive state management.
 */

/** Supported locales */
export type Locale = 'fr' | 'en';

/** Available locales with their display names */
export const locales: Record<Locale, { name: string; flag: string }> = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇬🇧' },
};

/** Default locale */
const defaultLocale: Locale = 'fr';

/** Cookie name for locale preference */
const COOKIE_LOCALE = 'locale';

/** Cookie max age: 1 year */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Shared locale state - reactive across all components.
 * This is a module-level $state that is shared.
 */
export const localeState = $state<{ current: Locale }>({ current: defaultLocale });

/**
 * Set a cookie with standard options.
 */
const setCookie = (name: string, value: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
};

/**
 * Get a cookie value by name.
 */
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Detect browser language and map to supported locale.
 */
const detectBrowserLocale = (): Locale => {
  if (typeof navigator === 'undefined') return defaultLocale;

  const browserLang = navigator.language || (navigator.languages && navigator.languages[0]);
  if (!browserLang) return defaultLocale;

  const langCode = browserLang.split('-')[0].toLowerCase();

  if (langCode === 'fr') return 'fr';
  if (langCode === 'en') return 'en';

  // Default to English for other languages
  return 'en';
};

/**
 * Check if a value is a valid locale.
 */
const isValidLocale = (value: string): value is Locale => {
  return value === 'fr' || value === 'en';
};

/**
 * Set the current locale and persist to cookie.
 */
export const setLocale = (locale: Locale): void => {
  localeState.current = locale;
  setCookie(COOKIE_LOCALE, locale);

  // Update document lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
};

/**
 * Initialize locale from cookie or browser detection.
 * Call this on client-side mount.
 */
export const initLocale = (): Locale => {
  // Check saved preference first
  const savedLocale = getCookie(COOKIE_LOCALE);
  if (savedLocale && isValidLocale(savedLocale)) {
    localeState.current = savedLocale;
  } else {
    // Detect from browser
    localeState.current = detectBrowserLocale();
  }

  // Apply to document
  if (typeof document !== 'undefined') {
    document.documentElement.lang = localeState.current;
  }

  return localeState.current;
};
