/**
 * Health status content - English.
 * Content for system health monitoring and connectivity features.
 */

import { brand, commonLabels } from '$lib/content/locales/en/brand';
import type { HealthContent } from '$lib/content/types';

/**
 * English health content.
 */
export const en: HealthContent = {
  card: {
    title: 'System health',
    refreshLabel: 'Refresh status',
    status: commonLabels.statusLabels,
    services: {
      appwrite: brand.appwrite,
      internet: 'Internet',
    },
    checked: 'Checked',
    apiKey: 'API Key',
    valid: 'Valid',
    invalid: 'Invalid',
    notFound: 'Not found',
    missing: 'Missing',
  },
  connectivity: {
    appwriteUnavailable: {
      title: 'Authentication server unavailable',
      description:
        'Unable to connect to the authentication server. Some features may not work properly.',
    },
    noInternet: {
      title: 'No internet connection',
      description: 'Please check your network settings and try again.',
    },
  },
};
