<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ResearchOrganizationSearch,
    ArticlesCountCard,
    HealthStatusCard,
    ConsentStatusCard,
    ProfileCard,
    ThemePreferencesCard,
    ComingSoonSection,
    DashboardLinkCard,
    ExternalLinksCard,
    Grid,
  } from '$lib/components';
  import {
    createThemeStore,
    hasThemePreferences,
    clearPalettePreference,
    clearFontPreference,
    setPalette,
    setFont,
  } from '$lib/stores';
  import type { TInstitution } from '$lib/server/openalex';
  import { useI18n } from '$lib/content';

  const themeStore = createThemeStore();
  const i18n = useI18n();
  const dashboard = $derived(i18n.dashboard);

  let savedPreferences = $state({ palette: false, font: false });

  /** Shared state for selected organizations */
  let selectedOrganizations = $state<TInstitution[]>([]);

  /** Whether user has granted consent for OpenAlex (shared between components) */
  let hasOpenAlexConsent = $state(false);

  /** Toggle palette between fixed (saved) and random */
  const togglePaletteMode = (): void => {
    if (savedPreferences.palette) {
      // Currently fixed -> switch to random (clear cookie only)
      clearPalettePreference();
    } else {
      // Currently random -> switch to fixed (save to cookie)
      setPalette(themeStore.palette);
    }
    savedPreferences = hasThemePreferences();
  };

  /** Toggle font between fixed (saved) and random */
  const toggleFontMode = (): void => {
    if (savedPreferences.font) {
      // Currently fixed -> switch to random (clear cookie only)
      clearFontPreference();
    } else {
      // Currently random -> switch to fixed (save to cookie)
      setFont(themeStore.fontName);
    }
    savedPreferences = hasThemePreferences();
  };

  onMount(() => {
    // initTheme is called in +layout.svelte, just check preferences
    savedPreferences = hasThemePreferences();
  });

  interface Props {
    data: {
      user: { email: string } | null;
      isAdmin: boolean;
    };
  }

  let { data }: Props = $props();

  const externalLinks = $derived([
    {
      href: 'https://ecrin.sites.chasset.net',
      icon: 'lucide:globe',
      title: dashboard.externalLinks.ecrin.title,
      description: dashboard.externalLinks.ecrin.description,
    },
    {
      href: 'https://github.com/univ-lehavre/talent-finder',
      icon: 'mdi:github',
      title: dashboard.externalLinks.github.title,
      description: dashboard.externalLinks.github.description,
    },
    {
      href: 'https://doi.org/10.5281/zenodo.18241663',
      icon: 'lucide:archive',
      title: dashboard.externalLinks.zenodo.title,
      description: dashboard.externalLinks.zenodo.description,
    },
  ]);
</script>

<svelte:head>
  <title>{dashboard.meta.title}</title>
  <meta name="description" content={dashboard.meta.description} />
</svelte:head>

<div class="container-app py-12">
  <div class="max-w-4xl mx-auto">
    <header class="dashboard-header">
      <h1 class="text-3xl font-bold mb-2">{dashboard.header.title}</h1>
      <p class="text-secondary-600 dark:text-secondary-400 mb-8">
        {dashboard.header.welcomeBack}{data.user ? `, ${data.user.email}` : ''}.
      </p>
    </header>

    <Grid cols={2} gap="lg">
      <!-- Consent Status Card (shown first if not granted) -->
      {#if !hasOpenAlexConsent}
        <ConsentStatusCard userEmail={data.user?.email} bind:hasConsent={hasOpenAlexConsent} />
      {/if}

      <!-- Research Organization Search Card -->
      <ResearchOrganizationSearch bind:selectedOrganizations hasConsent={hasOpenAlexConsent} />

      <!-- Articles Count Card -->
      <ArticlesCountCard {selectedOrganizations} hasConsent={hasOpenAlexConsent} />

      <!-- Consent Status Card (shown after research cards if granted) -->
      {#if hasOpenAlexConsent}
        <ConsentStatusCard userEmail={data.user?.email} bind:hasConsent={hasOpenAlexConsent} />
      {/if}

      <!-- Profile Card -->
      <ProfileCard email={data.user?.email} isComplete={false} />

      <!-- Theme Preferences Card -->
      <ThemePreferencesCard
        palette={themeStore.palette}
        fontName={themeStore.fontName}
        darkMode={themeStore.darkMode}
        {savedPreferences}
        onPaletteToggle={togglePaletteMode}
        onFontToggle={toggleFontMode}
        showCustomizeLink={data.isAdmin}
      />

      <!-- Repository Card (Admin only) -->
      {#if data.isAdmin}
        <DashboardLinkCard
          title={dashboard.cards.repository.title}
          description={dashboard.cards.repository.description}
          icon="lucide:bar-chart-2"
          href="/repository"
          linkText={dashboard.cards.repository.linkText}
        />
      {/if}

      <!-- API Documentation Card (Admin only) -->
      {#if data.isAdmin}
        <DashboardLinkCard
          title={dashboard.cards.apiDocs.title}
          description={dashboard.cards.apiDocs.description}
          icon="lucide:code"
          href="/api/docs"
          linkText={dashboard.cards.apiDocs.linkText}
        />
      {/if}

      <!-- External Links Card -->
      <ExternalLinksCard links={externalLinks} />

      <!-- System Health Card (Admin only) -->
      {#if data.isAdmin}
        <HealthStatusCard />
      {/if}
    </Grid>

    <!-- Coming Soon Section -->
    <ComingSoonSection
      title={dashboard.comingSoon.title}
      description={dashboard.comingSoon.description}
      features={dashboard.comingSoon.features}
    />
  </div>
</div>
