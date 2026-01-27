<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * PageLayout - Structure de mise en page standard
   *
   * Fournit une mise en page cohérente pour les pages avec
   * background, padding et container centralisé.
   *
   * @example Simple
   * ```svelte
   * <PageLayout>
   *   <h1>Ma page</h1>
   *   <p>Contenu de la page</p>
   * </PageLayout>
   * ```
   *
   * @example Avec variante et container personnalisé
   * ```svelte
   * <PageLayout variant="surface" maxWidth="lg" padding="lg">
   *   <DashboardContent />
   * </PageLayout>
   * ```
   */
  interface Props {
    /** Background variant */
    variant?: 'default' | 'surface' | 'transparent';
    /** Vertical padding */
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    /** Max width of content container */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none';
    /** Page content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    variant = 'default',
    padding = 'lg',
    maxWidth = 'lg',
    children,
    class: className = '',
  }: Props = $props();
</script>

<div class="page-layout {className}" data-variant={variant} data-padding={padding}>
  <div class="page-container" data-max-width={maxWidth}>
    {@render children()}
  </div>
</div>

<style>
  .page-layout {
    --page-bg: var(--color-secondary-50);
    --page-py: var(--spacing-lg);

    min-height: 100vh;
    background-color: var(--page-bg);
    padding-block: var(--page-py);
    transition: background-color var(--transition-normal);
  }

  /* Variants */
  .page-layout[data-variant='surface'] {
    --page-bg: white;
  }

  .page-layout[data-variant='transparent'] {
    --page-bg: transparent;
  }

  /* Dark mode */
  :global(.dark) .page-layout {
    --page-bg: var(--color-secondary-900);
  }

  :global(.dark) .page-layout[data-variant='surface'] {
    --page-bg: var(--color-secondary-800);
  }

  /* Padding */
  .page-layout[data-padding='none'] {
    --page-py: 0;
  }

  .page-layout[data-padding='sm'] {
    --page-py: var(--spacing-md);
  }

  .page-layout[data-padding='md'] {
    --page-py: var(--spacing-lg);
  }

  .page-layout[data-padding='xl'] {
    --page-py: var(--spacing-2xl);
  }

  /* Container */
  .page-container {
    width: 100%;
    margin-inline: auto;
    padding-inline: var(--spacing-md);
  }

  .page-container[data-max-width='sm'] {
    max-width: 640px;
  }

  .page-container[data-max-width='md'] {
    max-width: 768px;
  }

  .page-container[data-max-width='lg'] {
    max-width: 1024px;
  }

  .page-container[data-max-width='xl'] {
    max-width: 1280px;
  }

  .page-container[data-max-width='full'] {
    max-width: 100%;
  }

  .page-container[data-max-width='none'] {
    max-width: none;
    padding-inline: 0;
  }
</style>
