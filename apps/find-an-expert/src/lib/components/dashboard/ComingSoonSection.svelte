<script lang="ts">
  import { ComingSoonSection as BaseComingSoonSection } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * ComingSoonSection - Pre-configured coming soon section with i18n labels.
   *
   * Wraps $lib/ui/ComingSoonSection and injects default content from i18n.
   *
   * @example
   * ```svelte
   * <ComingSoonSection features={['Feature 1', 'Feature 2']} />
   * ```
   */
  interface Props {
    /** Section title (optional, defaults to i18n) */
    title?: string;
    /** Section description (optional, defaults to i18n) */
    description?: string;
    /** List of upcoming features */
    features: string[];
    /** Additional CSS classes */
    class?: string;
  }

  let { title, description, features, class: className = '' }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const derivedTitle = $derived(title ?? ui.comingSoon.defaultTitle);
  const derivedDescription = $derived(description ?? ui.comingSoon.defaultDescription);
</script>

<BaseComingSoonSection
  title={derivedTitle}
  description={derivedDescription}
  {features}
  class={className}
/>
