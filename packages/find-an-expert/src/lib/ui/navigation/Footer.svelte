<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PartnerLogo } from '$lib/ui';

  /**
   * Footer - Pied de page avec logos partenaires
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/Footer.
   *
   * @example
   * ```svelte
   * <Footer attribution="© 2024 MyApp" partners={[...]} />
   * ```
   */
  interface Partner {
    href: string;
    src: string;
    alt: string;
  }

  interface Props {
    /** Attribution text (e.g., "© 2024 Company") */
    attribution: string;
    /** List of partner logos to display */
    partners?: Partner[];
    /** Version string to display */
    version?: string;
    /** Additional content (rendered below partners) */
    children?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { attribution, partners = [], version, children, class: className = '' }: Props = $props();

  const versionText = $derived(version ? `${attribution} (v${version})` : attribution);
</script>

<footer
  class="
		bg-secondary-100 dark:bg-secondary-800
		border-t border-secondary-200 dark:border-secondary-700
		py-8 transition-colors duration-200
		{className}
	"
>
  <div class="container-app">
    {#if partners.length > 0}
      <div class="flex flex-col md:flex-row items-center justify-center gap-8">
        {#each partners as partner (partner.href)}
          <PartnerLogo
            href={partner.href}
            src={partner.src}
            alt={partner.alt}
            maxHeight="max-h-12"
          />
        {/each}
      </div>
    {/if}

    {#if children}
      <div class="mt-6">
        {@render children()}
      </div>
    {/if}

    <p class="text-center text-sm text-secondary-500 dark:text-secondary-400 mt-6">
      {versionText}
    </p>
  </div>
</footer>
