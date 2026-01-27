/**
 * Content exports for internationalization.
 * All user-facing text content is centralized here for easy translation.
 *
 * @example Using i18n Context API (recommended for SSR-safe reactive content)
 * ```svelte
 * <script>
 *   import { useI18n } from '$lib/content';
 *
 *   const i18n = useI18n();
 *   const navigation = $derived(i18n.navigation);
 * </script>
 * ```
 *
 * @example Using static exports (for non-reactive contexts)
 * ```typescript
 * import { brand, navigation } from '$lib/content';
 *
 * const appName = brand.appName;
 * ```
 */

// Brand constants (locale-independent)
export { brand, commonLabels, pageTitle } from './core/brand';

// i18n context API (recommended for SSR-safe state)
export { setI18nContext, useI18n, hasI18nContext } from './core/i18n-context.svelte';

// Static exports (French default - for backwards compatibility)
export { fr as content } from './locales/fr/marketing/home';
export { fr as navigation } from './locales/fr/shared/navigation';
export { fr as auth } from './locales/fr/system/auth';
export { fr as errors } from './locales/fr/system/errors';
export { fr as dashboard } from './locales/fr/app/dashboard';
export { fr as repository } from './locales/fr/app/repository';
export { fr as partners } from './locales/fr/marketing/partners';
export { fr as apiDocs } from './locales/fr/app/api-docs';

// Build UIContent for backwards compatibility
import { fr as commonFr } from './locales/fr/shared/common';
import { fr as healthFr } from './locales/fr/system/health';
import { fr as profileFr } from './locales/fr/app/profile';
import { fr as researchFr } from './locales/fr/app/research';
import { fr as themeFr } from './locales/fr/shared/theme';
import type { UIContent } from './types';

/**
 * UI content for backwards compatibility.
 * @deprecated Use modular imports instead
 */
export const ui: UIContent = {
  common: commonFr.labels,
  relativeTime: commonFr.relativeTime,
  connectivity: healthFr.connectivity,
  consent: profileFr.consent,
  profile: profileFr.card,
  theme: themeFr.card,
  comingSoon: commonFr.comingSoon,
  health: healthFr.card,
  researchOrganization: researchFr.organization,
  researchOutput: researchFr.output,
};

/**
 * Theme page content for backwards compatibility.
 */
export const themePage = themeFr.page;
