/**
 * Health status content - French.
 * Content for system health monitoring and connectivity features.
 */

import { brand, commonLabels } from '$lib/content/core/brand';
import type { HealthContent } from '$lib/content/types';

/**
 * French health content.
 */
export const fr: HealthContent = {
  card: {
    title: 'Santé du système',
    refreshLabel: 'Actualiser le statut',
    status: commonLabels.statusLabels,
    services: {
      appwrite: brand.appwrite,
      internet: 'Internet',
    },
    checked: 'Vérifié',
    apiKey: 'Clé API',
    valid: 'Valide',
    invalid: 'Invalide',
    notFound: 'Non trouvé',
    missing: 'Manquant',
  },
  connectivity: {
    appwriteUnavailable: {
      title: "Serveur d'authentification indisponible",
      description:
        "Impossible de se connecter au serveur d'authentification. Certaines fonctionnalités peuvent ne pas fonctionner correctement.",
    },
    noInternet: {
      title: 'Pas de connexion internet',
      description: 'Veuillez vérifier vos paramètres réseau et réessayer.',
    },
  },
};
