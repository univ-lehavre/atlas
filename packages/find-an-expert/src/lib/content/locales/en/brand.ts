/**
 * Brand constants for English locale.
 * Most brand names remain unchanged, only translated labels.
 */

import { brand as brandBase } from '$lib/content/core/brand';

/**
 * Brand names (unchanged across locales).
 */
export const brand = brandBase;

/**
 * Common UI labels in English.
 */
export const commonLabels = {
  /** Color/variant labels */
  primary: 'Primary',
  accent: 'Accent',
  secondary: 'Secondary',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',

  /** Font labels */
  heading: 'Heading',
  body: 'Body',
  mono: 'Mono',

  /** Common actions */
  retry: 'Retry',
  home: 'Home',
  submitting: 'Submitting...',

  /** Status labels */
  net: 'Net',

  /** Health status labels */
  statusLabels: {
    healthy: 'Healthy',
    degraded: 'Degraded',
    unhealthy: 'Unavailable',
  },
} as const;

/**
 * Helper to build page title with brand suffix.
 */
export const pageTitle = (page: string): string => `${page} ${brand.titleSuffix}`;
