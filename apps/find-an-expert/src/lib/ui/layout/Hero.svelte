<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Hero section component for landing pages.
   * Features a gradient background, title, subtitle, and action buttons.
   */
  interface Props {
    /** Main heading text */
    title: string;
    /** Supporting text below the title */
    subtitle?: string;
    /** Maximum width class for content (default: max-w-3xl) */
    maxWidth?: string;
    /** Vertical padding variant */
    spacing?: 'sm' | 'md' | 'lg';
    /** Action buttons area */
    actions?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    subtitle,
    maxWidth = 'max-w-3xl',
    spacing = 'lg',
    actions,
    class: className = '',
  }: Props = $props();

  const spacingClasses = {
    sm: 'py-12 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-20 md:py-32',
  };
</script>

<header
  class="bg-gradient-to-br from-primary-600 to-primary-800 text-white {spacingClasses[
    spacing
  ]} {className}"
>
  <div class="container-app">
    <div class={maxWidth}>
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
        {title}
      </h1>
      {#if subtitle}
        <p class="text-xl text-primary-100 mb-8">
          {subtitle}
        </p>
      {/if}
      {#if actions}
        <div class="flex flex-wrap gap-4">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
</header>
