<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Footer as BaseFooter } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * Footer - Pre-configured footer with i18n labels.
   *
   * Wraps $lib/ui/Footer and injects attribution text from i18n.
   *
   * @example
   * ```svelte
   * <Footer partners={[...]} version="1.0.0" />
   * ```
   */
  interface Partner {
    href: string;
    src: string;
    alt: string;
  }

  interface Props {
    /** List of partner logos to display */
    partners?: Partner[];
    /** Version string to display */
    version?: string;
    /** Additional content (rendered below partners) */
    children?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { partners = [], version, children, class: className = '' }: Props = $props();

  const i18n = useI18n();
  const navigation = $derived(i18n.navigation);
</script>

<BaseFooter attribution={navigation.footer.attribution} {partners} {version} class={className}>
  {#if children}
    {@render children()}
  {/if}
</BaseFooter>
