/**
 * Profile content - French.
 * Content for user profile and data consent features.
 */

import { brand } from '$lib/content/core/brand';
import type { ProfileContent } from '$lib/content/types';

/**
 * French profile content.
 */
export const fr: ProfileContent = {
  card: {
    title: 'Votre profil',
    complete: 'Profil complet',
    incomplete: 'Profil incomplet',
  },
  consent: {
    title: 'Consentement des données',
    openAlexTitle: `Accès prioritaire à ${brand.openAlex}`,
    grantedMessage: `Votre email est partagé avec ${brand.openAlex} pour des requêtes plus rapides (10x plus rapide).`,
    declinedMessage: `Vous avez refusé de partager votre email avec ${brand.openAlex}.`,
    pendingMessage: `Partagez votre email avec ${brand.openAlex} pour des recherches plus rapides.`,
    grantButton: 'Accorder le consentement',
    revokeButton: 'Révoquer le consentement',
    declineButton: 'Refuser',
  },
};
