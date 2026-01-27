<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Badge - Indicateur visuel avec variants sémantiques
   *
   * Optimisé avec data-variant + CSS custom properties
   * (suppression des $derived pour meilleure performance)
   *
   * @example
   * ```svelte
   * <Badge variant="success">Actif</Badge>
   * <Badge variant="error">Erreur</Badge>
   * ```
   */
  interface Props {
    /** Semantic color variant */
    variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Badge content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { variant = 'primary', size = 'md', children, class: className = '' }: Props = $props();
</script>

<span class="badge {className}" data-variant={variant} data-size={size}>
  {@render children()}
</span>

<style>
  .badge {
    --badge-bg: var(--color-primary-100);
    --badge-text: var(--color-primary-700);
    --badge-font-size: var(--text-xs);
    --badge-padding-x: 0.625rem;
    --badge-padding-y: 0.125rem;

    display: inline-flex;
    align-items: center;
    padding: var(--badge-padding-y) var(--badge-padding-x);
    font-size: var(--badge-font-size);
    font-weight: 500;
    line-height: 1.4;
    border-radius: var(--radius-full);
    background-color: var(--badge-bg);
    color: var(--badge-text);
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);
  }

  /* Size variants */
  .badge[data-size='sm'] {
    --badge-font-size: 0.65rem;
    --badge-padding-x: 0.5rem;
    --badge-padding-y: 0.0625rem;
  }

  .badge[data-size='lg'] {
    --badge-font-size: var(--text-sm);
    --badge-padding-x: 0.875rem;
    --badge-padding-y: 0.25rem;
  }

  /* Color variants */
  .badge[data-variant='accent'] {
    --badge-bg: var(--color-accent-100);
    --badge-text: var(--color-accent-700);
  }

  .badge[data-variant='success'] {
    --badge-bg: var(--color-success-50);
    --badge-text: var(--color-success-700);
  }

  .badge[data-variant='warning'] {
    --badge-bg: var(--color-warning-50);
    --badge-text: var(--color-warning-700);
  }

  .badge[data-variant='error'] {
    --badge-bg: var(--color-error-50);
    --badge-text: var(--color-error-700);
  }

  /* Dark mode */
  :global(.dark) .badge {
    --badge-bg: var(--color-primary-900);
    --badge-text: var(--color-primary-200);
  }

  :global(.dark) .badge[data-variant='accent'] {
    --badge-bg: var(--color-accent-900);
    --badge-text: var(--color-accent-200);
  }

  :global(.dark) .badge[data-variant='success'] {
    --badge-bg: oklch(from var(--color-success-500) 25% 0.1 h);
    --badge-text: var(--color-success-500);
  }

  :global(.dark) .badge[data-variant='warning'] {
    --badge-bg: oklch(from var(--color-warning-500) 25% 0.1 h);
    --badge-text: var(--color-warning-500);
  }

  :global(.dark) .badge[data-variant='error'] {
    --badge-bg: oklch(from var(--color-error-500) 25% 0.1 h);
    --badge-text: var(--color-error-500);
  }
</style>
