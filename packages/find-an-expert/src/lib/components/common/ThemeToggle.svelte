<script lang="ts">
  import { ThemeToggle as BaseThemeToggle } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * ThemeToggle - Pre-configured theme toggle button with i18n labels.
   *
   * Wraps $lib/ui/ThemeToggle and injects content from i18n.
   *
   * @example
   * ```svelte
   * <ThemeToggle />
   * ```
   */
  interface Props {
    /** Additional CSS classes */
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    light: ui.theme.light,
    dark: ui.theme.dark,
    changeTheme: ui.theme.changeTheme,
  });
</script>

<BaseThemeToggle {content} class={className} />
