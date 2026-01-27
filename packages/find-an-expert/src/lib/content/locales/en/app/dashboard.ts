/**
 * Dashboard content - English.
 */

import { brand, pageTitle } from '$lib/content/locales/en/brand';
import type { DashboardContent } from '$lib/content/types';

/**
 * English dashboard content.
 */
export const en: DashboardContent = {
  meta: {
    title: pageTitle('Dashboard'),
    description: `Your personal dashboard on ${brand.ecrin} ${brand.appName}`,
  },
  header: {
    title: 'Dashboard',
    welcomeBack: 'Welcome back',
  },
  externalLinks: {
    ecrin: {
      title: brand.ecrin,
      description: 'Main project website',
    },
    github: {
      title: brand.github,
      description: 'Source code repository',
    },
    zenodo: {
      title: brand.zenodo,
      description: 'Permanent archive',
    },
  },
  comingSoon: {
    title: 'Coming soon',
    description:
      'We are working on new features to help you manage your profile and discover collaborators.',
    features: [
      'Complete your profile with your skills and expertise',
      'Search and discover researchers',
      'Connect and collaborate on projects',
    ],
  },
  cards: {
    repository: {
      title: 'Repository',
      description: 'Explore code statistics and analysis for this repository.',
      linkText: 'View stats',
    },
    apiDocs: {
      title: 'API Documentation',
      description: 'Browse the REST API reference with Swagger UI.',
      linkText: 'Browse API',
    },
  },
};
