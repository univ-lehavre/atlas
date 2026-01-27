/**
 * Context-based internationalization system.
 * Uses Svelte's Context API for SSR-safe state management.
 *
 * @example Setting up context in +layout.svelte
 * ```svelte
 * <script>
 *   import { setI18nContext } from '$lib/content';
 *   setI18nContext();
 * </script>
 * ```
 *
 * @example Accessing translations in components
 * ```svelte
 * <script>
 *   import { useI18n } from '$lib/content';
 *   const i18n = useI18n();
 * </script>
 * <h1>{i18n.navigation.links.home}</h1>
 * ```
 */

import { setContext, getContext } from 'svelte';
import { localeState, type Locale } from '$lib/stores';
import type {
  AccessibilityContent,
  ApiDocsContent,
  AuthContent,
  CommonContent,
  DashboardContent,
  ErrorContent,
  HealthContent,
  HomeContent,
  LanguageSelectorContent,
  NavigationContent,
  PartnersContent,
  ProfileContent,
  RepositoryContent,
  ResearchContent,
  ThemeContent,
  ThemePageContent,
  UIContent,
} from '../types';

// Import French content
import {
  homeFr,
  partnersFr,
  dashboardFr,
  repositoryFr,
  apiDocsFr,
  researchFr,
  profileFr,
  authFr,
  errorsFr,
  healthFr,
  accessibilityFr,
  languageSelectorFr,
  navigationFr,
  commonFr,
  themeFr,
} from '../locales/fr';

// Import English content
import {
  homeEn,
  partnersEn,
  dashboardEn,
  repositoryEn,
  apiDocsEn,
  researchEn,
  profileEn,
  authEn,
  errorsEn,
  healthEn,
  accessibilityEn,
  languageSelectorEn,
  navigationEn,
  commonEn,
  themeEn,
} from '../locales/en';

/** Symbol key for i18n context */
const I18N_CONTEXT_KEY = Symbol('i18n');

/**
 * All translations organized by locale.
 */
interface I18nTranslations {
  auth: AuthContent;
  dashboard: DashboardContent;
  errors: ErrorContent;
  home: HomeContent;
  navigation: NavigationContent;
  partners: PartnersContent;
  repository: RepositoryContent;
  themePage: ThemePageContent;
  ui: UIContent;
  apiDocs: ApiDocsContent;
  accessibility: AccessibilityContent;
  languageSelector: LanguageSelectorContent;
  common: CommonContent;
  health: HealthContent;
  profile: ProfileContent;
  research: ResearchContent;
  theme: ThemeContent;
}

/**
 * I18n context interface with reactive getters.
 * Internal type - consumers should use ReturnType<typeof useI18n> if needed.
 */
interface I18nContext {
  readonly navigation: NavigationContent;
  readonly auth: AuthContent;
  readonly errors: ErrorContent;
  readonly dashboard: DashboardContent;
  readonly repository: RepositoryContent;
  /** @deprecated Use common, health, profile, research instead */
  readonly ui: UIContent;
  readonly partners: PartnersContent;
  readonly themePage: ThemePageContent;
  readonly apiDocs: ApiDocsContent;
  readonly home: HomeContent;
  readonly accessibility: AccessibilityContent;
  readonly languageSelector: LanguageSelectorContent;
  readonly common: CommonContent;
  readonly health: HealthContent;
  readonly profile: ProfileContent;
  readonly research: ResearchContent;
  readonly theme: ThemeContent;
}

/**
 * Build UIContent from modular structure for backwards compatibility.
 */
const buildUIContent = (
  common: CommonContent,
  health: HealthContent,
  profile: ProfileContent,
  research: ResearchContent,
  theme: ThemeContent
): UIContent => ({
  common: common.labels,
  relativeTime: common.relativeTime,
  connectivity: health.connectivity,
  consent: profile.consent,
  profile: profile.card,
  theme: theme.card,
  comingSoon: common.comingSoon,
  health: health.card,
  researchOrganization: research.organization,
  researchOutput: research.output,
});

/**
 * Content collections by locale.
 */
const translations: Record<Locale, I18nTranslations> = {
  fr: {
    auth: authFr,
    dashboard: dashboardFr,
    errors: errorsFr,
    home: homeFr,
    navigation: navigationFr,
    partners: partnersFr,
    repository: repositoryFr,
    themePage: themeFr.page,
    ui: buildUIContent(commonFr, healthFr, profileFr, researchFr, themeFr),
    apiDocs: apiDocsFr,
    accessibility: accessibilityFr,
    languageSelector: languageSelectorFr,
    common: commonFr,
    health: healthFr,
    profile: profileFr,
    research: researchFr,
    theme: themeFr,
  },
  en: {
    auth: authEn,
    dashboard: dashboardEn,
    errors: errorsEn,
    home: homeEn,
    navigation: navigationEn,
    partners: partnersEn,
    repository: repositoryEn,
    themePage: themeEn.page,
    ui: buildUIContent(commonEn, healthEn, profileEn, researchEn, themeEn),
    apiDocs: apiDocsEn,
    accessibility: accessibilityEn,
    languageSelector: languageSelectorEn,
    common: commonEn,
    health: healthEn,
    profile: profileEn,
    research: researchEn,
    theme: themeEn,
  },
};

/**
 * Get translations for a specific locale.
 */
const getTranslations = (locale: Locale): I18nTranslations => translations[locale];

/**
 * Create the i18n context object with reactive getters.
 * Uses a function to access locale state for reactivity across context boundaries.
 */
const createI18nContext = (): I18nContext => {
  return {
    get navigation(): NavigationContent {
      return getTranslations(localeState.current).navigation;
    },
    get auth(): AuthContent {
      return getTranslations(localeState.current).auth;
    },
    get errors(): ErrorContent {
      return getTranslations(localeState.current).errors;
    },
    get dashboard(): DashboardContent {
      return getTranslations(localeState.current).dashboard;
    },
    get repository(): RepositoryContent {
      return getTranslations(localeState.current).repository;
    },
    get ui(): UIContent {
      return getTranslations(localeState.current).ui;
    },
    get partners(): PartnersContent {
      return getTranslations(localeState.current).partners;
    },
    get themePage(): ThemePageContent {
      return getTranslations(localeState.current).themePage;
    },
    get apiDocs(): ApiDocsContent {
      return getTranslations(localeState.current).apiDocs;
    },
    get home(): HomeContent {
      return getTranslations(localeState.current).home;
    },
    get accessibility(): AccessibilityContent {
      return getTranslations(localeState.current).accessibility;
    },
    get languageSelector(): LanguageSelectorContent {
      return getTranslations(localeState.current).languageSelector;
    },
    get common(): CommonContent {
      return getTranslations(localeState.current).common;
    },
    get health(): HealthContent {
      return getTranslations(localeState.current).health;
    },
    get profile(): ProfileContent {
      return getTranslations(localeState.current).profile;
    },
    get research(): ResearchContent {
      return getTranslations(localeState.current).research;
    },
    get theme(): ThemeContent {
      return getTranslations(localeState.current).theme;
    },
  };
};

/**
 * Set up the i18n context in a layout component.
 * Must be called during component initialization (in <script> block).
 *
 * @example
 * ```svelte
 * <script>
 *   import { setI18nContext } from '$lib/content';
 *   setI18nContext();
 * </script>
 * ```
 */
export const setI18nContext = (): void => {
  const context = createI18nContext();
  setContext(I18N_CONTEXT_KEY, context);
};

/**
 * Get the i18n context from a parent layout.
 * Must be called during component initialization (in <script> block).
 *
 * @returns The i18n context with reactive translation getters
 * @throws Error if called outside of a component that has i18n context set up
 *
 * @example
 * ```svelte
 * <script>
 *   import { useI18n } from '$lib/content';
 *   const i18n = useI18n();
 * </script>
 * <h1>{i18n.navigation.links.home}</h1>
 * ```
 */
export const useI18n = (): I18nContext => {
  const context = getContext<I18nContext | undefined>(I18N_CONTEXT_KEY);
  if (!context) {
    throw new Error(
      'useI18n must be called within a component tree where setI18nContext has been called. ' +
        'Make sure to call setI18nContext() in your root +layout.svelte.'
    );
  }
  return context;
};

/**
 * Check if i18n context is available.
 * Useful for components that need to work both with and without context.
 *
 * @returns True if i18n context is available
 */
export const hasI18nContext = (): boolean => {
  return getContext<I18nContext | undefined>(I18N_CONTEXT_KEY) !== undefined;
};
