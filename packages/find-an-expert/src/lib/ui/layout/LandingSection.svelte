<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Landing section component with centered title and description.
   * Designed for marketing/landing pages with prominent headings.
   */
  interface Props {
    /** Section ID for anchor links */
    id?: string;
    /** Section title */
    title: string;
    /** Optional description below title */
    description?: string;
    /** Background variant */
    variant?: 'default' | 'surface';
    /** Vertical padding */
    spacing?: 'sm' | 'md' | 'lg';
    /** Main content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    id,
    title,
    description,
    variant = 'default',
    spacing = 'lg',
    children,
    class: className = '',
  }: Props = $props();

  const variantClasses = {
    default: 'bg-white dark:bg-secondary-900',
    surface: 'bg-secondary-50 dark:bg-secondary-800',
  };

  const spacingClasses = {
    sm: 'py-12 md:py-16',
    md: 'py-16 md:py-20',
    lg: 'py-16 md:py-24',
  };
</script>

<section
  {id}
  class="{variantClasses[variant]} {spacingClasses[
    spacing
  ]} transition-colors duration-200 {className}"
>
  <div class="container-app">
    <h2 class="text-3xl font-bold text-center mb-4 text-secondary-900 dark:text-white">
      {title}
    </h2>
    {#if description}
      <p class="text-secondary-600 dark:text-secondary-400 text-center mb-12 max-w-3xl mx-auto">
        {description}
      </p>
    {/if}
    {@render children()}
  </div>
</section>
