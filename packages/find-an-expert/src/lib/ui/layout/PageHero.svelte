<script lang="ts">
  /**
   * Simple page hero section with title and description.
   * Unlike Hero, this has a subtle background without gradient.
   *
   * @example
   * ```svelte
   * <PageHero
   *   title="Theme Customization"
   *   description="Customize colors and fonts to preview how your application will look."
   * />
   * ```
   */
  interface Props {
    /** Main heading text */
    title: string;
    /** Supporting text below the title */
    description?: string;
    /** Vertical padding variant */
    spacing?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    class?: string;
  }

  let { title, description, spacing = 'md', class: className = '' }: Props = $props();

  const spacingClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };
</script>

<header
  class="bg-secondary-50 dark:bg-secondary-900 transition-colors duration-200 {spacingClasses[
    spacing
  ]} {className}"
>
  <div class="container-app">
    <h1 class="text-4xl font-bold mb-4 text-secondary-900 dark:text-secondary-100">
      {title}
    </h1>
    {#if description}
      <p class="text-lg text-secondary-600 dark:text-secondary-400">
        {description}
      </p>
    {/if}
  </div>
</header>
