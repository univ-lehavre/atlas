/**
 * Profile content - English.
 * Content for user profile and data consent features.
 */

import { brand } from '$lib/content/locales/en/brand';
import type { ProfileContent } from '$lib/content/types';

/**
 * English profile content.
 */
export const en: ProfileContent = {
  card: {
    title: 'Your profile',
    complete: 'Profile complete',
    incomplete: 'Profile incomplete',
  },
  consent: {
    title: 'Data consent',
    openAlexTitle: `Priority access to ${brand.openAlex}`,
    grantedMessage: `Your email is shared with ${brand.openAlex} for faster queries (10x faster).`,
    declinedMessage: `You declined to share your email with ${brand.openAlex}.`,
    pendingMessage: `Share your email with ${brand.openAlex} for faster searches.`,
    grantButton: 'Grant consent',
    revokeButton: 'Revoke consent',
    declineButton: 'Decline',
  },
};
