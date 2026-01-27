<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * CenteredLayout - Layout pleine page avec contenu centré
   *
   * Idéal pour les pages d'authentification, d'erreur, ou de confirmation
   * qui nécessitent un contenu centré verticalement et horizontalement.
   *
   * @example Simple
   * ```svelte
   * <CenteredLayout>
   *   <LoginForm />
   * </CenteredLayout>
   * ```
   *
   * @example Avec variante surface
   * ```svelte
   * <CenteredLayout variant="surface">
   *   <ErrorState title="Page non trouvée" />
   * </CenteredLayout>
   * ```
   */
  interface Props {
    /** Background variant */
    variant?: 'default' | 'surface' | 'transparent';
    /** Padding horizontal */
    padding?: 'sm' | 'md' | 'lg';
    /** Main content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { variant = 'default', padding = 'md', children, class: className = '' }: Props = $props();
</script>

<div class="centered-layout {className}" data-variant={variant} data-padding={padding}>
  {@render children()}
</div>

<style>
  .centered-layout {
    --layout-bg: var(--color-secondary-50);
    --layout-px: var(--spacing-md);

    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding-inline: var(--layout-px);
    background-color: var(--layout-bg);
    transition: background-color var(--transition-normal);
  }

  /* Variants */
  .centered-layout[data-variant='surface'] {
    --layout-bg: white;
  }

  .centered-layout[data-variant='transparent'] {
    --layout-bg: transparent;
  }

  /* Padding */
  .centered-layout[data-padding='sm'] {
    --layout-px: var(--spacing-sm);
  }

  .centered-layout[data-padding='lg'] {
    --layout-px: var(--spacing-lg);
  }

  /* Dark mode */
  :global(.dark) .centered-layout {
    --layout-bg: var(--color-secondary-900);
  }

  :global(.dark) .centered-layout[data-variant='surface'] {
    --layout-bg: var(--color-secondary-800);
  }
</style>
