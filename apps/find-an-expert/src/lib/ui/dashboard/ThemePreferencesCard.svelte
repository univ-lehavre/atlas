<script lang="ts">
  import { InfoCard, ThemeToggleRow, Icon } from '$lib/ui';

  /**
   * ThemePreferencesCard - Card displaying theme settings with toggles
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/ThemePreferencesCard.
   *
   * @example
   * ```svelte
   * <ThemePreferencesCard
   *   palette="ocean"
   *   fontName="Inter"
   *   darkMode="system"
   *   savedPreferences={{ palette: true, font: false }}
   *   onPaletteToggle={togglePalette}
   *   onFontToggle={toggleFont}
   *   content={themePreferencesContent}
   * />
   * ```
   */
  interface ThemePreferencesContent {
    /** Card title */
    title: string;
    /** Palette label */
    paletteLabel: string;
    /** Font label */
    fontLabel: string;
    /** Mode label */
    modeLabel: string;
    /** Customize link text */
    customizeLabel: string;
  }

  interface Props {
    /** Current palette name */
    palette: string;
    /** Current font name */
    fontName: string;
    /** Current dark mode setting */
    darkMode: 'dark' | 'light' | 'system';
    /** Saved preferences state */
    savedPreferences: { palette: boolean; font: boolean };
    /** Palette toggle callback */
    onPaletteToggle: () => void;
    /** Font toggle callback */
    onFontToggle: () => void;
    /** Whether to show the customize link */
    showCustomizeLink?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Content for the card (required) */
    content: ThemePreferencesContent;
  }

  let {
    palette,
    fontName,
    darkMode,
    savedPreferences,
    onPaletteToggle,
    onFontToggle,
    showCustomizeLink = false,
    class: className = '',
    content,
  }: Props = $props();

  const darkModeIcon = $derived(
    darkMode === 'dark' ? 'lucide:moon' : darkMode === 'light' ? 'lucide:sun' : 'lucide:monitor'
  );
</script>

<InfoCard title={content.title} icon="lucide:palette" class={className}>
  {#snippet trailing()}
    {#if showCustomizeLink}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- internal navigation link -->
      <a href="/theme" class="customize-link">
        <Icon icon="lucide:settings" width="14" height="14" />
        {content.customizeLabel}
      </a>
    {/if}
  {/snippet}

  <div class="theme-settings">
    <!-- Palette -->
    <ThemeToggleRow
      label={content.paletteLabel}
      value={palette}
      isSaved={savedPreferences.palette}
      onToggle={onPaletteToggle}
    >
      {#snippet leading()}
        <div class="palette-preview">
          <div class="color-swatch primary"></div>
          <div class="color-swatch accent"></div>
          <div class="color-swatch secondary"></div>
        </div>
      {/snippet}
    </ThemeToggleRow>

    <!-- Font -->
    <ThemeToggleRow
      label={content.fontLabel}
      value={fontName}
      isSaved={savedPreferences.font}
      onToggle={onFontToggle}
    >
      {#snippet leading()}
        <div class="icon-box">
          <Icon icon="lucide:type" width="20" height="20" class="theme-icon" />
        </div>
      {/snippet}
    </ThemeToggleRow>

    <!-- Dark Mode (read-only display) -->
    <div class="dark-mode-row">
      <div class="row-left">
        <div class="icon-box">
          <Icon icon={darkModeIcon} width="20" height="20" class="theme-icon" />
        </div>
        <div class="row-info">
          <span class="row-label">{content.modeLabel}</span>
          <p class="row-value">{darkMode}</p>
        </div>
      </div>
    </div>
  </div>
</InfoCard>

<style>
  .theme-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .palette-preview {
    display: flex;
    gap: 2px;
  }

  .color-swatch {
    width: 20px;
    height: 20px;
  }

  .color-swatch:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  .color-swatch:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .color-swatch.primary {
    background-color: var(--color-primary-500);
  }

  .color-swatch.accent {
    background-color: var(--color-accent-500);
  }

  .color-swatch.secondary {
    background-color: var(--color-secondary-500);
  }

  .icon-box {
    width: 62px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    background-color: var(--color-secondary-100);
  }

  :global(.dark) .icon-box {
    background-color: var(--color-secondary-700);
  }

  :global(.theme-icon) {
    color: var(--color-secondary-600);
  }

  :global(.dark) :global(.theme-icon) {
    color: var(--color-secondary-300);
  }

  .dark-mode-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .row-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .row-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }

  .row-label {
    font-size: var(--text-sm);
    color: var(--color-secondary-500);
  }

  :global(.dark) .row-label {
    color: var(--color-secondary-400);
  }

  .row-value {
    margin: 0;
    font-weight: 500;
    text-transform: capitalize;
    color: var(--color-secondary-900);
  }

  :global(.dark) .row-value {
    color: var(--color-secondary-100);
  }

  .customize-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2xs);
    font-size: var(--text-sm);
    color: var(--color-primary-600);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .customize-link:hover {
    text-decoration: underline;
  }

  :global(.dark) .customize-link {
    color: var(--color-primary-400);
  }
</style>
