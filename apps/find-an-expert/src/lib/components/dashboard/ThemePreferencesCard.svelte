<script lang="ts">
  import { ThemePreferencesCard as BaseThemePreferencesCard } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * ThemePreferencesCard - Pre-configured theme preferences card with i18n labels.
   *
   * Wraps $lib/ui/ThemePreferencesCard and injects content from i18n.
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
   * />
   * ```
   */
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
  }

  let {
    palette,
    fontName,
    darkMode,
    savedPreferences,
    onPaletteToggle,
    onFontToggle,
    showCustomizeLink,
    class: className = '',
  }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    title: ui.theme.title,
    paletteLabel: ui.theme.palette,
    fontLabel: ui.theme.font,
    modeLabel: ui.theme.mode,
    customizeLabel: ui.common.customize,
  });
</script>

<BaseThemePreferencesCard
  {palette}
  {fontName}
  {darkMode}
  {savedPreferences}
  {onPaletteToggle}
  {onFontToggle}
  {showCustomizeLink}
  {content}
  class={className}
/>
