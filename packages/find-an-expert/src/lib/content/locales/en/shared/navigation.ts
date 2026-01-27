/**
 * Navigation content - English.
 */

import { brand, commonLabels } from '$lib/content/locales/en/brand';
import type { NavigationContent } from '$lib/content/types';

/**
 * English navigation content.
 */
export const en: NavigationContent = {
  links: {
    home: commonLabels.home,
    dashboard: 'Dashboard',
  },
  external: {
    github: brand.github,
    githubDescription: 'View source code',
  },
  actions: {
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  brand: brand.appNameFull,
  footer: {
    attribution: `Developed at ${brand.ulhn}`,
  },
};
