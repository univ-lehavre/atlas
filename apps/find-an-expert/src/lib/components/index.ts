/**
 * Application-specific components module.
 *
 * This module contains components that are specific to the talent-finder application.
 * They wrap generic UI components from $lib/ui and inject i18n content from $lib/content.
 *
 * Components are organized by route:
 * - common/    : Shared across multiple routes (Navbar, Footer, Modal, etc.)
 * - home/      : Components for / route
 * - login/     : Components for /login route
 * - dashboard/ : Components for /dashboard route
 * - theme/     : Components for /theme route
 * - repository/: Components for /repository route
 * - api-docs/  : Components for /api/docs route
 *
 * Use these components in pages/routes for convenience - they come pre-configured
 * with localized content.
 *
 * Generic UI components are also re-exported here for consistency - routes should
 * import all components from $lib/components, never directly from $lib/ui.
 */

// Common components (shared across routes)
export {
  // With i18n
  Navbar,
  Footer,
  Dropdown,
  Modal,
  Alert,
  ConnectivityBanner,
  PageHeader,
  ThemeToggle,
  // Generic UI re-exports
  Button,
  ButtonGroup,
  LinkButton,
  ErrorState,
  LoadingState,
  LoadingSpinner,
  Badge,
  Grid,
  CenteredLayout,
  PageLayout,
  Section,
  PageHero,
  Hero,
  LandingSection,
  CTASection,
  PartnerSection,
  Card,
  InfoCard,
  StatCard,
  StepCard,
  ChallengeCard,
  TagCard,
  FeatureCard,
  KeyValue,
  DataTable,
  DropdownCategory,
  DropdownItem,
  Icon,
  ColorSwatch,
  ColorScaleRow,
  CodeExample,
} from './common';

// Login route components
export { LoginForm, Signup } from './login';

// Dashboard route components
export {
  ProfileCard,
  ThemePreferencesCard,
  ConsentStatusCard,
  HealthStatusCard,
  ArticlesCountCard,
  ResearchOrganizationSearch,
  ComingSoonSection,
  // Generic UI re-exports
  DashboardLinkCard,
  ExternalLinksCard,
} from './dashboard';
