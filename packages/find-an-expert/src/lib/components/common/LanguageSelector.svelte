<script lang="ts">
  import { LanguageSelector as BaseLanguageSelector } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * LanguageSelector - Pre-configured language selector with i18n labels.
   *
   * Wraps $lib/ui/LanguageSelector and injects accessibility labels from i18n.
   *
   * @example
   * ```svelte
   * <LanguageSelector />
   * <LanguageSelector compact />
   * ```
   */
  interface Props {
    /** Compact mode (only shows flag) */
    compact?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let { compact = false, class: className = '' }: Props = $props();

  const i18n = useI18n();
  const a11y = $derived(i18n.accessibility);
</script>

<BaseLanguageSelector
  {compact}
  selectorLabel={a11y.languageSelector}
  closeMenuLabel={a11y.closeMenu}
  changeLanguageLabel={a11y.changeLanguage}
  class={className}
/>
