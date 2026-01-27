<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PartnerLogo } from '$lib/ui';

  /**
   * Partner section component displaying a logo, title, and description.
   * Supports left or right logo alignment and optional additional content.
   */
  interface Props {
    /** External URL for the partner */
    href: string;
    /** Logo image source path */
    logoSrc: string;
    /** Logo alt text */
    logoAlt: string;
    /** Partner name/title */
    title: string;
    /** Background variant */
    variant?: 'default' | 'surface';
    /** Logo position */
    logoPosition?: 'left' | 'right';
    /** Main description content */
    children: Snippet;
    /** Additional content below the description (e.g., cards grid) */
    extra?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    href,
    logoSrc,
    logoAlt,
    title,
    variant = 'default',
    logoPosition = 'left',
    children,
    extra,
    class: className = '',
  }: Props = $props();

  const variantClasses = {
    default: 'bg-white dark:bg-secondary-900',
    surface: 'bg-secondary-50 dark:bg-secondary-800',
  };

  const flexDirection = $derived(logoPosition === 'right' ? 'md:flex-row-reverse' : 'md:flex-row');
</script>

<section
  class="{variantClasses[variant]} py-16 md:py-24 transition-colors duration-200 {className}"
>
  <div class="container-app">
    <div class="flex flex-col {flexDirection} items-center gap-8">
      <div class="md:w-1/3 flex justify-center">
        <PartnerLogo {href} src={logoSrc} alt={logoAlt} />
      </div>
      <div class="md:w-2/3">
        <h2 class="text-2xl font-bold mb-4 text-secondary-900 dark:text-white">
          <!-- eslint-disable svelte/no-navigation-without-resolve -- external link with target="_blank" -->
          <a
            {href}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {title}
          </a>
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        </h2>
        <div class="text-secondary-600 dark:text-secondary-400 mb-4">
          {@render children()}
        </div>
      </div>
    </div>
    {#if extra}
      <div class="mt-8">
        {@render extra()}
      </div>
    {/if}
  </div>
</section>
