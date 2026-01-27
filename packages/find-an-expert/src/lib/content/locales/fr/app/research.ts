/**
 * Research content - French.
 * Content for research organization search and research output features.
 */

import type { ResearchContent } from '$lib/content/types';

/**
 * French research content.
 */
export const fr: ResearchContent = {
  organization: {
    title: "Recherche d'organismes",
    consentRequired: 'Consentement requis',
    consentMessage:
      'Accordez le consentement dans la carte "Consentement des données" pour rechercher des organismes de recherche.',
    searchPlaceholder: 'Rechercher des organismes de recherche...',
    maxReached: "Nombre maximum d'organismes atteint",
    noResults: 'Aucun organisme trouvé pour',
    selectedTitle: 'Organismes sélectionnés',
    maxLabel: 'max',
    noSelection: 'Aucun organisme sélectionné. Utilisez la recherche ci-dessus pour en ajouter.',
    works: 'travaux',
    citations: 'citations',
    removeLabel: 'Supprimer',
  },
  output: {
    title: 'Production scientifique',
    consentMessage:
      'Accordez le consentement dans la carte "Consentement des données" pour voir les statistiques de production.',
    selectOrganizations:
      'Sélectionnez des organismes ci-dessus pour voir leur production scientifique.',
    loading: 'Chargement des statistiques...',
    articlesByYear: 'Articles par année',
    before: 'Avant',
    affiliatedAuthors: 'Auteurs affiliés',
    total: 'Total',
  },
};
