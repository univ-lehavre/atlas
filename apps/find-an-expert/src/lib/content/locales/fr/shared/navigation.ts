/**
 * Navigation content - French.
 */

import { brand, commonLabels } from '$lib/content/core/brand';
import type { NavigationContent } from '$lib/content/types';

/**
 * French navigation content.
 */
export const fr: NavigationContent = {
  links: {
    home: commonLabels.home,
    dashboard: 'Tableau de bord',
  },
  external: {
    github: brand.github,
    githubDescription: 'Voir le code source',
  },
  actions: {
    signIn: 'Se connecter',
    signOut: 'Déconnexion',
  },
  brand: brand.appNameFull,
  footer: {
    attribution: `Développé à ${brand.ulhn}`,
  },
};
