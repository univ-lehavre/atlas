<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Call-to-action section component.
   * Features centered title, subtitle, and action button(s).
   */
  interface Props {
    /** Section title */
    title: string;
    /** Supporting text */
    subtitle?: string;
    /** Background variant */
    variant?: 'default' | 'surface' | 'gradient';
    /** Vertical padding variant */
    spacing?: 'sm' | 'md' | 'lg';
    /** Action buttons */
    actions?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    subtitle,
    variant = 'surface',
    spacing = 'md',
    actions,
    class: className = '',
  }: Props = $props();

  const variantClasses = {
    default: 'bg-white dark:bg-secondary-900',
    surface: 'bg-secondary-50 dark:bg-secondary-800',
    gradient: 'bg-gradient-to-br from-primary-700 to-primary-900 text-white',
  };

  const spacingClasses = {
    sm: 'py-12',
    md: 'py-16',
    lg: 'py-20 md:py-24',
  };

  const isGradient = $derived(variant === 'gradient');
</script>

<section
  class="{variantClasses[variant]} {spacingClasses[
    spacing
  ]} transition-colors duration-200 {className}"
>
  <div class="container-app text-center">
    <h2
      class="text-3xl font-bold mb-4 {isGradient
        ? 'text-white'
        : 'text-secondary-900 dark:text-white'}"
    >
      {title}
    </h2>
    {#if subtitle}
      <p
        class="mb-8 max-w-3xl mx-auto {isGradient
          ? 'text-primary-100'
          : 'text-secondary-600 dark:text-secondary-400'}"
      >
        {subtitle}
      </p>
    {/if}
    {#if actions}
      {@render actions()}
    {/if}
  </div>
</section>
