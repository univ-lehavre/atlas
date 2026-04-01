/**
 * Common components shared across multiple routes.
 *
 * These components wrap generic UI components from $lib/ui
 * and inject i18n content from $lib/content.
 *
 * Generic UI components are re-exported from $lib/ui for consistency.
 */

// Navigation (with i18n)
export { default as Navbar } from './Navbar.svelte';
export { default as Footer } from './Footer.svelte';
export { default as Dropdown } from './Dropdown.svelte';

// Feedback (with i18n)
export { default as Modal } from './Modal.svelte';
export { default as Alert } from './Alert.svelte';
export { default as ConnectivityBanner } from './ConnectivityBanner.svelte';

// Layout (with i18n)
export { default as PageHeader } from './PageHeader.svelte';

// Theme (with i18n)
export { default as ThemeToggle } from './ThemeToggle.svelte';

// Generic UI re-exports (no i18n needed - content passed via props)
export {
  // Actions
  Button,
  ButtonGroup,
  LinkButton,
  // Feedback
  ErrorState,
  LoadingState,
  LoadingSpinner,
  Badge,
  // Layout
  Grid,
  CenteredLayout,
  PageLayout,
  Section,
  PageHero,
  Hero,
  LandingSection,
  CTASection,
  PartnerSection,
  // Data display
  Card,
  InfoCard,
  StatCard,
  StepCard,
  ChallengeCard,
  TagCard,
  FeatureCard,
  KeyValue,
  DataTable,
  // Navigation
  DropdownCategory,
  DropdownItem,
  // Utils
  Icon,
  ColorSwatch,
  ColorScaleRow,
  CodeExample,
} from '$lib/ui';
