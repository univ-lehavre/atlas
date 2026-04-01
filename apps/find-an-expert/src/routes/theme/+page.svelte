<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Dropdown,
    Modal,
    Signup,
    ThemeToggle,
    Alert,
    Badge,
    Card,
    CodeExample,
    ColorScaleRow,
    ColorSwatch,
    DropdownCategory,
    DropdownItem,
    Icon,
    LoadingSpinner,
    PageHero,
    Section,
    StatCard,
  } from '$lib/components';
  import {
    paletteCategories,
    palettesByCategory,
    getPalettePreviewColors,
    type PaletteName,
  } from '$lib/palettes';
  import {
    createThemeStore,
    fontCategories,
    getFontsByCategory,
    clearThemePreferences,
    hasThemePreferences,
    setPalette,
    setFont,
  } from '$lib/stores';
  import { useI18n } from '$lib/content';

  const themeStore = createThemeStore();
  const i18n = useI18n();
  const themePage = $derived(i18n.themePage);

  let modalOpen = $state(false);
  let signupOpen = $state(false);
  let paletteDropdownOpen = $state(false);
  let fontDropdownOpen = $state(false);
  let appliedFeedback = $state(false);
  let resetFeedback = $state(false);
  let savedPreferences = $state({ palette: false, font: false });

  const selectPalette = (palette: PaletteName): void => {
    themeStore.palette = palette;
    paletteDropdownOpen = false;
  };

  const selectFont = (fontName: string): void => {
    themeStore.fontName = fontName;
    fontDropdownOpen = false;
  };

  /** Set both palette and font as fixed (saved to cookies) */
  const setTheme = (): void => {
    setPalette(themeStore.palette);
    setFont(themeStore.fontName);
    appliedFeedback = true;
    savedPreferences = hasThemePreferences();
    setTimeout(() => {
      appliedFeedback = false;
    }, 2000);
  };

  /** Reset both palette and font to random mode (clear cookies and randomize) */
  const resetTheme = (): void => {
    clearThemePreferences();
    resetFeedback = true;
    savedPreferences = hasThemePreferences();
    setTimeout(() => {
      resetFeedback = false;
    }, 2000);
  };

  onMount(() => {
    savedPreferences = hasThemePreferences();
  });

  // Color scale configuration
  const fullScaleColors = $derived([
    { name: themePage.colorScales.colorNames.primary, cssPrefix: 'primary' },
    { name: themePage.colorScales.colorNames.accent, cssPrefix: 'accent' },
    { name: themePage.colorScales.colorNames.secondary, cssPrefix: 'secondary' },
  ]);

  const sparseScaleColors = $derived([
    {
      name: themePage.colorScales.colorNames.success,
      cssPrefix: 'success',
      sparseShades: [50, 500, 600, 700],
    },
    {
      name: themePage.colorScales.colorNames.warning,
      cssPrefix: 'warning',
      sparseShades: [50, 500, 600, 700],
    },
    {
      name: themePage.colorScales.colorNames.error,
      cssPrefix: 'error',
      sparseShades: [50, 500, 600, 700],
    },
  ]);

  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
</script>

<svelte:head>
  <title>{themePage.meta.title}</title>
  <meta name="description" content={themePage.meta.description} />
</svelte:head>

<!-- Theme Selector Bar -->
<div
  class="border-b border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 sticky top-16 z-30 transition-colors duration-200"
>
  <div class="container-app py-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <Icon
          icon="lucide:palette"
          width="20"
          height="20"
          class="text-secondary-500 dark:text-secondary-400"
        />
        <span class="text-sm font-medium text-secondary-500 dark:text-secondary-400">
          {themePage.selectorBar.title}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <!-- Font Pairing Dropdown -->
        <Dropdown bind:open={fontDropdownOpen} width="w-96">
          {#snippet trigger()}
            <Icon icon="lucide:type" width="16" height="16" />
            <div class="flex flex-col items-start">
              <span class="capitalize font-medium">{themeStore.fontName}</span>
              <span class="text-xs text-secondary-500 dark:text-secondary-400">
                {themeStore.font.headingFamily} / {themeStore.font.bodyFamily}
              </span>
            </div>
          {/snippet}
          {#each fontCategories as category, index (category.id)}
            <DropdownCategory name={category.name} showDivider={index > 0} />
            {#each getFontsByCategory(category.id) as pairing (pairing.name)}
              <DropdownItem
                selected={themeStore.fontName === pairing.name}
                onclick={() => selectFont(pairing.name)}
              >
                <div class="flex-1 min-w-0">
                  <span
                    class="text-sm font-semibold capitalize text-secondary-900 dark:text-secondary-100"
                  >
                    {pairing.name}
                  </span>
                  <div class="grid grid-cols-3 gap-2 text-xs mt-1">
                    <div class="flex flex-col">
                      <span
                        class="text-[10px] uppercase tracking-wider text-secondary-400 dark:text-secondary-500"
                        >{themePage.selectorBar.fontLabels.heading}</span
                      >
                      <span
                        class="text-secondary-700 dark:text-secondary-300 truncate"
                        style="font-family: '{pairing.headingFamily}', sans-serif"
                      >
                        {pairing.headingFamily}
                      </span>
                    </div>
                    <div class="flex flex-col">
                      <span
                        class="text-[10px] uppercase tracking-wider text-secondary-400 dark:text-secondary-500"
                        >{themePage.selectorBar.fontLabels.body}</span
                      >
                      <span
                        class="text-secondary-700 dark:text-secondary-300 truncate"
                        style="font-family: '{pairing.bodyFamily}', sans-serif"
                      >
                        {pairing.bodyFamily}
                      </span>
                    </div>
                    <div class="flex flex-col">
                      <span
                        class="text-[10px] uppercase tracking-wider text-secondary-400 dark:text-secondary-500"
                        >{themePage.selectorBar.fontLabels.mono}</span
                      >
                      <span
                        class="text-secondary-700 dark:text-secondary-300 truncate"
                        style="font-family: '{pairing.monoFamily}', monospace"
                      >
                        {pairing.monoFamily}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownItem>
            {/each}
          {/each}
        </Dropdown>

        <!-- Palette Dropdown -->
        <Dropdown bind:open={paletteDropdownOpen}>
          {#snippet trigger()}
            <ColorSwatch
              colors={[
                'var(--color-primary-500)',
                'var(--color-accent-500)',
                'var(--color-secondary-500)',
              ]}
              size="sm"
            />
            <span class="capitalize">{themeStore.palette}</span>
          {/snippet}
          {#each paletteCategories as category, index (category.id)}
            <DropdownCategory name={category.name} showDivider={index > 0} />
            {#each palettesByCategory[category.id] as palette (palette)}
              {@const colors = getPalettePreviewColors(palette)}
              <DropdownItem
                selected={themeStore.palette === palette}
                onclick={() => selectPalette(palette)}
              >
                <div class="flex-1 min-w-0">
                  <span
                    class="text-sm font-semibold capitalize text-secondary-900 dark:text-secondary-100 mb-2 block"
                  >
                    {palette}
                  </span>
                  <ColorSwatch
                    colors={[
                      colors.primary,
                      colors.accent,
                      colors.secondary,
                      colors.success,
                      colors.warning,
                      colors.error,
                    ]}
                  />
                </div>
              </DropdownItem>
            {/each}
          {/each}
        </Dropdown>

        <!-- Reset Button -->
        {#if savedPreferences.palette || savedPreferences.font}
          <button
            type="button"
            class="h-[52px] px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 {resetFeedback
              ? 'bg-warning-600 text-white'
              : 'btn-outline'}"
            onclick={resetTheme}
            disabled={resetFeedback}
          >
            {#if resetFeedback}
              <Icon icon="lucide:shuffle" width="16" height="16" />
              {themePage.selectorBar.resetFeedback}
            {:else}
              <Icon icon="lucide:rotate-ccw" width="16" height="16" />
              {themePage.selectorBar.resetButton}
            {/if}
          </button>
        {/if}

        <!-- Set Button -->
        <button
          type="button"
          class="h-[52px] px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 {appliedFeedback
            ? 'bg-success-600 text-white'
            : 'btn-primary'}"
          onclick={setTheme}
          disabled={appliedFeedback}
        >
          {#if appliedFeedback}
            <Icon icon="lucide:check" width="16" height="16" />
            {themePage.selectorBar.setFeedback}
          {:else}
            <Icon icon="lucide:lock" width="16" height="16" />
            {themePage.selectorBar.setButton}
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Hero Section -->
<PageHero title={themePage.hero.title} description={themePage.hero.description} />

<!-- Current Settings Section -->
<Section title={themePage.currentSettings.title} icon="lucide:settings" variant="surface">
  <div class="grid md:grid-cols-2 gap-6">
    <!-- Palette Colors -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4 capitalize">
        {themeStore.palette}
        {themePage.currentSettings.paletteTitle}
      </h3>
      <div class="grid grid-cols-3 gap-3">
        <ColorSwatch
          color="var(--color-primary-500)"
          label={themePage.currentSettings.colorLabels.primary}
          size="lg"
        />
        <ColorSwatch
          color="var(--color-accent-500)"
          label={themePage.currentSettings.colorLabels.accent}
          size="lg"
        />
        <ColorSwatch
          color="var(--color-secondary-500)"
          label={themePage.currentSettings.colorLabels.neutral}
          size="lg"
        />
        <ColorSwatch
          color="var(--color-success-500)"
          label={themePage.currentSettings.colorLabels.success}
          size="lg"
        />
        <ColorSwatch
          color="var(--color-warning-500)"
          label={themePage.currentSettings.colorLabels.warning}
          size="lg"
        />
        <ColorSwatch
          color="var(--color-error-500)"
          label={themePage.currentSettings.colorLabels.error}
          size="lg"
        />
      </div>
    </div>

    <!-- Font Pairing -->
    <div class="card">
      <h3 class="text-lg font-semibold mb-4 capitalize">{themeStore.fontName}</h3>
      <p class="mb-4 text-secondary-600 dark:text-secondary-400">
        {themeStore.font.description}
      </p>
      <div class="space-y-3">
        <div>
          <span class="text-xs uppercase tracking-wide text-secondary-500 dark:text-secondary-400"
            >{themePage.currentSettings.fontLabels.heading}</span
          >
          <p class="text-xl font-semibold font-heading">
            {themePage.currentSettings.fontDemo.headingText}
          </p>
        </div>
        <div>
          <span class="text-xs uppercase tracking-wide text-secondary-500 dark:text-secondary-400"
            >{themePage.currentSettings.fontLabels.body}</span
          >
          <p>{themePage.currentSettings.fontDemo.bodyText}</p>
        </div>
        <div>
          <span class="text-xs uppercase tracking-wide text-secondary-500 dark:text-secondary-400"
            >{themePage.currentSettings.fontLabels.mono}</span
          >
          <p class="font-mono">{themePage.currentSettings.fontDemo.monoText}</p>
        </div>
      </div>
    </div>
  </div>
</Section>

<!-- Color Scale Section -->
<Section title={themePage.colorScales.title} icon="lucide:paintbrush">
  <div class="card overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-secondary-200 dark:border-secondary-700">
          <th class="py-3 px-2 text-left font-semibold text-secondary-700 dark:text-secondary-300"
            >{themePage.colorScales.scaleHeader}</th
          >
          {#each shades as shade (shade)}
            <th
              class="py-3 px-1 text-center font-medium text-secondary-500 dark:text-secondary-400 text-xs"
              >{shade}</th
            >
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each fullScaleColors as color (color.cssPrefix)}
          <ColorScaleRow name={color.name} cssPrefix={color.cssPrefix} {shades} />
        {/each}
        {#each sparseScaleColors as color, index (color.cssPrefix)}
          <ColorScaleRow
            name={color.name}
            cssPrefix={color.cssPrefix}
            {shades}
            sparseShades={color.sparseShades}
            isLast={index === sparseScaleColors.length - 1}
          />
        {/each}
      </tbody>
    </table>

    <!-- Usage Examples -->
    <div class="mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-700">
      <h4 class="text-sm font-semibold mb-3 text-secondary-700 dark:text-secondary-300">
        {themePage.colorScales.usageExamples.title}
      </h4>
      <div class="grid md:grid-cols-2 gap-4">
        <CodeExample
          comment={themePage.colorScales.usageExamples.background}
          keyword="class"
          value="bg-primary-500"
        />
        <CodeExample
          comment={themePage.colorScales.usageExamples.textColor}
          keyword="class"
          value="text-primary-600"
        />
        <CodeExample
          comment={themePage.colorScales.usageExamples.border}
          keyword="class"
          value="border-accent-300"
        />
        <CodeExample
          comment={themePage.colorScales.usageExamples.cssVariable}
          keyword="var"
          value="--color-primary-500"
        />
      </div>
    </div>
  </div>
</Section>

<!-- Buttons Section -->
<Section title={themePage.buttons.title} icon="lucide:mouse-pointer-click" variant="surface">
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">{themePage.buttons.variantsTitle}</h3>
    <div class="flex flex-wrap gap-4 mb-6">
      <button class="btn-primary">{themePage.buttons.variants.primary}</button>
      <button class="btn-secondary">{themePage.buttons.variants.secondary}</button>
      <button class="btn-accent">{themePage.buttons.variants.accent}</button>
      <button class="btn-outline">{themePage.buttons.variants.outline}</button>
      <button class="btn-ghost">{themePage.buttons.variants.ghost}</button>
    </div>

    <h3 class="text-lg font-semibold mb-4">{themePage.buttons.withIconsTitle}</h3>
    <div class="flex flex-wrap items-center gap-4">
      <button class="btn-primary">
        <Icon icon="lucide:plus" width="16" height="16" />
        {themePage.buttons.iconButtons.addItem}
      </button>
      <button class="btn-secondary">
        <Icon icon="lucide:download" width="16" height="16" />
        {themePage.buttons.iconButtons.download}
      </button>
      <button class="btn-outline">
        <Icon icon="lucide:settings" width="16" height="16" />
        {themePage.buttons.iconButtons.settings}
      </button>
    </div>
  </div>
</Section>

<!-- Alerts Section -->
<Section title={themePage.alerts.title} icon="lucide:bell">
  <div class="space-y-4">
    <Alert variant="info">
      <strong>{themePage.alerts.labels.info}</strong>
      {themePage.alerts.info}
    </Alert>
    <Alert variant="success">
      <strong>{themePage.alerts.labels.success}</strong>
      {themePage.alerts.success}
    </Alert>
    <Alert variant="warning">
      <strong>{themePage.alerts.labels.warning}</strong>
      {themePage.alerts.warning}
    </Alert>
    <Alert variant="error">
      <strong>{themePage.alerts.labels.error}</strong>
      {themePage.alerts.error}
    </Alert>
  </div>
</Section>

<!-- Modal & Signup Section -->
<Section title={themePage.modalSection.title} icon="lucide:square" variant="surface">
  <div class="grid md:grid-cols-2 gap-6">
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">{themePage.modalSection.modalCard.title}</h3>
      <p class="mb-4 text-secondary-600 dark:text-secondary-400">
        {themePage.modalSection.modalCard.description}
      </p>
      <button type="button" class="btn-primary" onclick={() => (modalOpen = true)}>
        {themePage.modalSection.modalCard.openButton}
      </button>
    </div>
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">{themePage.modalSection.signupCard.title}</h3>
      <p class="mb-4 text-secondary-600 dark:text-secondary-400">
        {themePage.modalSection.signupCard.description}
      </p>
      <button type="button" class="btn-primary" onclick={() => (signupOpen = true)}>
        {themePage.modalSection.signupCard.openButton}
      </button>
    </div>
  </div>
</Section>

<!-- Stat Cards Section -->
<Section title={themePage.statCards.title} icon="lucide:bar-chart-2">
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard label={themePage.statCards.labels.default} value={42} />
    <StatCard label={themePage.statCards.labels.success} value={128} variant="success" prefix="+" />
    <StatCard label={themePage.statCards.labels.danger} value={23} variant="danger" prefix="-" />
    <StatCard label={themePage.statCards.labels.net} value="1.2K" />
  </div>
</Section>

<!-- Badges Section -->
<Section title={themePage.badges.title} icon="lucide:tag" variant="surface">
  <div class="card">
    <div class="flex flex-wrap gap-3">
      <Badge>{themePage.badges.labels.primary}</Badge>
      <Badge variant="accent">{themePage.badges.labels.accent}</Badge>
      <Badge variant="success">{themePage.badges.labels.success}</Badge>
      <Badge variant="warning">{themePage.badges.labels.warning}</Badge>
      <Badge variant="error">{themePage.badges.labels.error}</Badge>
    </div>
  </div>
</Section>

<!-- Card Section -->
<Section title={themePage.cardSection.title} icon="lucide:square">
  <div class="grid md:grid-cols-2 gap-6">
    <Card>
      <h3 class="text-lg font-semibold mb-2">{themePage.cardSection.card1.title}</h3>
      <p class="text-secondary-600 dark:text-secondary-400 mb-4">
        {themePage.cardSection.card1.description}
      </p>
      <button class="btn-primary">{themePage.cardSection.card1.button}</button>
    </Card>
    <Card class="border-2 border-primary-500">
      <h3 class="text-lg font-semibold mb-2">{themePage.cardSection.card2.title}</h3>
      <p class="text-secondary-600 dark:text-secondary-400 mb-4">
        {themePage.cardSection.card2.description}
      </p>
      <button class="btn-accent">{themePage.cardSection.card2.button}</button>
    </Card>
  </div>
</Section>

<!-- LoadingSpinner Section -->
<Section title={themePage.loadingSpinner.title} icon="lucide:loader" variant="surface">
  <div class="card">
    <h3 class="text-lg font-semibold mb-4">{themePage.loadingSpinner.sizeVariants}</h3>
    <div class="flex flex-wrap items-center gap-8 mb-6">
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner size="sm" />
        <span class="text-xs text-secondary-500 dark:text-secondary-400"
          >{themePage.loadingSpinner.sizes.small}</span
        >
      </div>
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner size="md" />
        <span class="text-xs text-secondary-500 dark:text-secondary-400"
          >{themePage.loadingSpinner.sizes.medium}</span
        >
      </div>
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner size="lg" />
        <span class="text-xs text-secondary-500 dark:text-secondary-400"
          >{themePage.loadingSpinner.sizes.large}</span
        >
      </div>
    </div>

    <h3 class="text-lg font-semibold mb-4">{themePage.loadingSpinner.colorVariants}</h3>
    <div class="flex flex-wrap items-center gap-8">
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner variant="primary" />
        <span class="text-xs text-secondary-500 dark:text-secondary-400"
          >{themePage.loadingSpinner.colors.primary}</span
        >
      </div>
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner variant="accent" />
        <span class="text-xs text-secondary-500 dark:text-secondary-400"
          >{themePage.loadingSpinner.colors.accent}</span
        >
      </div>
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner variant="secondary" />
        <span class="text-xs text-secondary-500 dark:text-secondary-400"
          >{themePage.loadingSpinner.colors.secondary}</span
        >
      </div>
    </div>
  </div>
</Section>

<!-- ThemeToggle Section -->
<Section title={themePage.themeToggle.title} icon="lucide:moon">
  <div class="card">
    <p class="mb-4 text-secondary-600 dark:text-secondary-400">
      {themePage.themeToggle.description}
    </p>
    <div class="flex items-center gap-4">
      <ThemeToggle />
      <span class="text-sm text-secondary-500 dark:text-secondary-400">
        {themePage.themeToggle.hint}
      </span>
    </div>
  </div>
</Section>

<!-- Demo Modal -->
<Modal bind:open={modalOpen} title={themePage.modalSection.modalContent.title}>
  <p class="mb-4">
    {themePage.modalSection.modalContent.line1}
  </p>
  <p>{themePage.modalSection.modalContent.line2}</p>
  {#snippet footer()}
    <p class="text-xs text-center text-secondary-500 dark:text-secondary-400">
      {themePage.modalSection.modalContent.footer}
    </p>
  {/snippet}
</Modal>

<!-- Demo Signup Modal -->
<Signup form={null} bind:open={signupOpen} />
