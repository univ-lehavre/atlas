/**
 * UI Components module
 * Exports all reusable Svelte components organized by category.
 *
 * Categories:
 * - layout: Page structure and section components
 * - data-display: Cards, tables, lists for presenting data
 * - feedback: Alerts, badges, loading states
 * - actions: Buttons and interactive elements
 * - forms: Modal, forms, dialogs
 * - theme: Theme-related components
 * - utils: Utility and helper components
 * - navigation: Navigation and menu components
 * - dashboard: Dashboard-specific components
 * - domain: Domain-specific business components
 */

// Layout components
export { default as Section } from './layout/Section.svelte';
export { default as Grid } from './layout/Grid.svelte';
export { default as PageHeader } from './layout/PageHeader.svelte';
export { default as PageHero } from './layout/PageHero.svelte';
export { default as PageLayout } from './layout/PageLayout.svelte';
export { default as CenteredLayout } from './layout/CenteredLayout.svelte';
export { default as Hero } from './layout/Hero.svelte';
export { default as CTASection } from './layout/CTASection.svelte';
export { default as PartnerSection } from './layout/PartnerSection.svelte';
export { default as LandingSection } from './layout/LandingSection.svelte';

// Navigation components
export { default as Navbar } from './navigation/Navbar.svelte';
export { default as Footer } from './navigation/Footer.svelte';
export { default as Drawer } from './navigation/Drawer.svelte';
export { default as NavLink } from './navigation/NavLink.svelte';
export { default as IconLink } from './navigation/IconLink.svelte';
export { default as LanguageSelector } from './navigation/LanguageSelector.svelte';
export { default as Dropdown } from './navigation/Dropdown.svelte';
export { default as DropdownCategory } from './navigation/DropdownCategory.svelte';
export { default as DropdownItem } from './navigation/DropdownItem.svelte';

// Data display components
export { default as Card } from './data-display/Card.svelte';
export { default as InfoCard } from './data-display/InfoCard.svelte';
export { default as DataTable } from './data-display/DataTable.svelte';
export { default as StatCard } from './data-display/StatCard.svelte';
export { default as KeyValue } from './data-display/KeyValue.svelte';
export { default as StepCard } from './data-display/StepCard.svelte';
export { default as ChallengeCard } from './data-display/ChallengeCard.svelte';
export { default as TagCard } from './data-display/TagCard.svelte';
export { default as FeatureCard } from './data-display/FeatureCard.svelte';
export { default as PartnerLogo } from './data-display/PartnerLogo.svelte';

// Feedback components
export { default as Alert } from './feedback/Alert.svelte';
export { default as Badge } from './feedback/Badge.svelte';
export { default as LoadingSpinner } from './feedback/LoadingSpinner.svelte';
export { default as LoadingState } from './feedback/LoadingState.svelte';
export { default as ErrorState } from './feedback/ErrorState.svelte';

// Action components
export { default as Button } from './actions/Button.svelte';
export { default as ButtonGroup } from './actions/ButtonGroup.svelte';
export { default as LinkButton } from './actions/LinkButton.svelte';

// Form and dialog components
export { default as Modal } from './forms/Modal.svelte';
export { default as Signup } from './forms/Signup.svelte';
export { default as LoginForm } from './forms/LoginForm.svelte';

// Theme components
export { default as ThemeToggle } from './theme/ThemeToggle.svelte';
export { default as ThemeToggleRow } from './theme/ThemeToggleRow.svelte';

// Utility components
export { default as Icon } from './utils/Icon.svelte';
export { default as ConnectivityBanner } from './utils/ConnectivityBanner.svelte';
export { default as Tooltip } from './utils/Tooltip.svelte';
export { default as ColorSwatch } from './utils/ColorSwatch.svelte';
export { default as ColorScaleRow } from './utils/ColorScaleRow.svelte';
export { default as CodeExample } from './utils/CodeExample.svelte';

// Dashboard components
export { default as ProfileCard } from './dashboard/ProfileCard.svelte';
export { default as ThemePreferencesCard } from './dashboard/ThemePreferencesCard.svelte';
export { default as DashboardLinkCard } from './dashboard/DashboardLinkCard.svelte';
export { default as ExternalLinkCard } from './dashboard/ExternalLinkCard.svelte';
export { default as ExternalLinksCard } from './dashboard/ExternalLinksCard.svelte';
export { default as ComingSoonSection } from './dashboard/ComingSoonSection.svelte';

// Domain-specific components
export { default as ResearchOrganizationSearch } from './domain/ResearchOrganizationSearch.svelte';
export { default as ArticlesCountCard } from './domain/ArticlesCountCard.svelte';
export { default as HealthStatusCard } from './domain/HealthStatusCard.svelte';
export { default as ConsentStatusCard } from './domain/ConsentStatusCard.svelte';
