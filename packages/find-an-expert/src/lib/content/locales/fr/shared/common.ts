/**
 * Common shared content - French.
 * Labels and messages used across multiple components.
 */

import { commonLabels } from '$lib/content/core/brand';
import type { CommonContent } from '$lib/content/types';

/**
 * French common content.
 */
export const fr: CommonContent = {
  labels: {
    tryAgain: commonLabels.retry,
    checkStatus: 'Vérifier le statut',
    email: 'Email',
    notLoggedIn: 'Non connecté',
    customize: 'Personnaliser',
    updated: 'Mis à jour',
  },
  relativeTime: {
    justNow: "à l'instant",
    secondsAgo: 'il y a {count}s',
    minutesAgo: 'il y a {count}min',
    hoursAgo: 'il y a {count}h',
    yesterday: 'hier',
    daysAgo: 'il y a {count} jours',
  },
  comingSoon: {
    defaultTitle: 'Bientôt disponible',
    defaultDescription:
      'Nous travaillons sur de nouvelles fonctionnalités pour améliorer votre expérience.',
  },
};
