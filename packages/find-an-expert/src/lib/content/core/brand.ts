/**
 * Brand constants and common labels - centralized for consistency.
 * These values are used across multiple content files to avoid duplication.
 *
 * @example
 * ```typescript
 * import { brand, commonLabels } from '../core/brand';
 *
 * const title = `Dashboard - ${brand.appNameFull}`;
 * const buttonLabel = commonLabels.primary;
 * ```
 */

/**
 * Brand names and organization identifiers.
 */
export const brand = {
  /** Application name */
  appName: 'Talent Finder',
  /** Full application name with project prefix */
  appNameFull: 'ECRIN | Talent finder',
  /** Page title suffix */
  titleSuffix: '- ECRIN | Talent finder',

  /** Project name */
  ecrin: 'ECRIN',
  /** European University alliance */
  eunicoast: 'EUNICoast',
  /** University name */
  ulhn: 'Université Le Havre Normandie',
  /** Campus full name */
  cptmp: 'Campus Polytechnique des Territoires Maritimes et Portuaires',
  /** Campus short name */
  cptmpShort: 'CPTMP',

  /** External services */
  github: 'GitHub',
  zenodo: 'Zenodo',
  appwrite: 'Appwrite',
  openAlex: 'OpenAlex',
} as const;

/**
 * Common UI labels used across multiple components (French).
 */
export const commonLabels = {
  /** Color/variant labels */
  primary: 'Primaire',
  accent: 'Accent',
  secondary: 'Secondaire',
  success: 'Succès',
  warning: 'Attention',
  error: 'Erreur',
  info: 'Info',

  /** Font labels */
  heading: 'Titre',
  body: 'Corps',
  mono: 'Mono',

  /** Common actions */
  retry: 'Réessayer',
  home: 'Accueil',
  submitting: 'Envoi en cours...',

  /** Status labels */
  net: 'Net',

  /** Health status labels */
  statusLabels: {
    healthy: 'Opérationnel',
    degraded: 'Dégradé',
    unhealthy: 'Hors service',
  },
} as const;

/**
 * Helper to build page title with brand suffix.
 */
export const pageTitle = (page: string): string => `${page} ${brand.titleSuffix}`;
