/**
 * Dashboard content - French.
 */

import { brand, pageTitle } from '$lib/content/core/brand';
import type { DashboardContent } from '$lib/content/types';

/**
 * French dashboard content.
 */
export const fr: DashboardContent = {
  meta: {
    title: pageTitle('Tableau de bord'),
    description: `Votre tableau de bord personnel sur ${brand.ecrin} ${brand.appName}`,
  },
  header: {
    title: 'Tableau de bord',
    welcomeBack: 'Bienvenue',
  },
  externalLinks: {
    ecrin: {
      title: brand.ecrin,
      description: 'Site principal du projet',
    },
    github: {
      title: brand.github,
      description: 'Dépôt du code source',
    },
    zenodo: {
      title: brand.zenodo,
      description: 'Archive permanente',
    },
  },
  comingSoon: {
    title: 'Bientôt disponible',
    description:
      'Nous travaillons sur de nouvelles fonctionnalités pour vous aider à gérer votre profil et découvrir des collaborateurs.',
    features: [
      'Compléter votre profil avec vos compétences et expertises',
      'Rechercher et découvrir des chercheurs',
      'Se connecter et collaborer sur des projets',
    ],
  },
  cards: {
    repository: {
      title: 'Dépôt',
      description: 'Explorez les statistiques et analyses du code de ce dépôt.',
      linkText: 'Voir les stats',
    },
    apiDocs: {
      title: 'Documentation API',
      description: "Parcourez la référence de l'API REST avec Swagger UI.",
      linkText: "Parcourir l'API",
    },
  },
};
