<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Alert as BaseAlert } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * Alert - Pre-configured alert with i18n labels.
   *
   * Wraps $lib/ui/Alert and injects accessibility labels from i18n.
   *
   * @example
   * ```svelte
   * <Alert variant="success">Opération réussie!</Alert>
   * <Alert variant="error" dismissible>Une erreur est survenue</Alert>
   * ```
   */
  interface Props {
    /** Semantic variant */
    variant?: 'info' | 'success' | 'warning' | 'error';
    /** Show dismiss button */
    dismissible?: boolean;
    /** Callback when dismissed */
    ondismiss?: () => void;
    /** Custom icon (overrides default) */
    icon?: string;
    /** Alert content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    variant = 'info',
    dismissible = false,
    ondismiss,
    icon,
    children,
    class: className = '',
  }: Props = $props();

  const i18n = useI18n();
  const a11y = $derived(i18n.accessibility);
</script>

<BaseAlert
  {variant}
  {dismissible}
  closeLabel={a11y.closeAlert}
  {ondismiss}
  {icon}
  class={className}
>
  {@render children()}
</BaseAlert>
