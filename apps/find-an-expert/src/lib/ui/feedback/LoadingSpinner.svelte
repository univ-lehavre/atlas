<script lang="ts">
  /**
   * LoadingSpinner - Indicateur de chargement animé
   *
   * Optimisé avec data-* + CSS custom properties
   * (suppression de 2 $derived pour meilleure performance)
   *
   * @example
   * ```svelte
   * <LoadingSpinner />
   * <LoadingSpinner size="lg" variant="accent" />
   * ```
   */
  interface Props {
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Color variant */
    variant?: 'primary' | 'accent' | 'secondary';
    /** Accessible label for screen readers */
    label?: string;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    size = 'md',
    variant = 'primary',
    label = 'Chargement...',
    class: className = '',
  }: Props = $props();
</script>

<div class="spinner {className}" data-size={size} data-variant={variant} role="status">
  <span class="sr-only">{label}</span>
</div>

<style>
  .spinner {
    --spinner-size: 2rem;
    --spinner-border-width: 3px;
    --spinner-border-color: var(--color-primary-200);
    --spinner-active-color: var(--color-primary-600);

    display: inline-block;
    width: var(--spinner-size);
    height: var(--spinner-size);
    border: var(--spinner-border-width) solid var(--spinner-border-color);
    border-top-color: var(--spinner-active-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Size variants */
  .spinner[data-size='sm'] {
    --spinner-size: 1rem;
    --spinner-border-width: 2px;
  }

  .spinner[data-size='lg'] {
    --spinner-size: 3rem;
    --spinner-border-width: 4px;
  }

  /* Color variants */
  .spinner[data-variant='accent'] {
    --spinner-border-color: var(--color-accent-200);
    --spinner-active-color: var(--color-accent-600);
  }

  .spinner[data-variant='secondary'] {
    --spinner-border-color: var(--color-secondary-200);
    --spinner-active-color: var(--color-secondary-600);
  }

  /* Dark mode */
  :global(.dark) .spinner {
    --spinner-border-color: var(--color-primary-800);
    --spinner-active-color: var(--color-primary-400);
  }

  :global(.dark) .spinner[data-variant='accent'] {
    --spinner-border-color: var(--color-accent-800);
    --spinner-active-color: var(--color-accent-400);
  }

  :global(.dark) .spinner[data-variant='secondary'] {
    --spinner-border-color: var(--color-secondary-700);
    --spinner-active-color: var(--color-secondary-400);
  }

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
