/**
 * Dashboard route components.
 *
 * Components specific to the /dashboard route.
 * Generic UI components are re-exported from $lib/ui for consistency.
 */

// Profile
export { default as ProfileCard } from './ProfileCard.svelte';

// Theme
export { default as ThemePreferencesCard } from './ThemePreferencesCard.svelte';

// Domain-specific
export { default as ConsentStatusCard } from './ConsentStatusCard.svelte';
export { default as HealthStatusCard } from './HealthStatusCard.svelte';
export { default as ArticlesCountCard } from './ArticlesCountCard.svelte';
export { default as ResearchOrganizationSearch } from './ResearchOrganizationSearch.svelte';

// Sections
export { default as ComingSoonSection } from './ComingSoonSection.svelte';

// Generic UI re-exports (no i18n needed - content passed via props)
export { DashboardLinkCard, ExternalLinksCard } from '$lib/ui';
