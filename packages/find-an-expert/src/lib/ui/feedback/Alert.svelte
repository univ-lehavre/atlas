<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Alert - Message d'alerte avec variants sémantiques
   *
   * Pure UI component with no i18n dependency.
   * Optimized with data-variant + CSS custom properties.
   *
   * For a pre-configured version with i18n, use $lib/components/Alert.
   *
   * @example
   * ```svelte
   * <Alert variant="success">Opération réussie!</Alert>
   * <Alert variant="error" dismissible closeLabel="Fermer">Une erreur</Alert>
   * ```
   */
  interface Props {
    /** Semantic variant */
    variant?: 'info' | 'success' | 'warning' | 'error';
    /** Show dismiss button */
    dismissible?: boolean;
    /** Dismiss button aria-label (required if dismissible) */
    closeLabel?: string;
    /** Callback when dismissed */
    ondismiss?: () => void;
    /** Custom icon (overrides default) */
    icon?: string;
    /** Alert content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    variant = 'info',
    dismissible = false,
    closeLabel = '',
    ondismiss,
    icon,
    children,
    class: className = '',
  }: Props = $props();

  let dismissed = $state(false);

  // Map des icônes par défaut (simple objet, pas de $derived)
  const defaultIcons: Record<string, string> = {
    info: 'lucide:info',
    success: 'lucide:check-circle',
    warning: 'lucide:alert-triangle',
    error: 'lucide:x-circle',
  };

  const handleDismiss = (): void => {
    dismissed = true;
    ondismiss?.();
  };
</script>

{#if !dismissed}
  <div class="alert {className}" data-variant={variant} role="alert">
    <span class="alert-icon">
      <Icon icon={icon ?? defaultIcons[variant]} width="20" height="20" />
    </span>
    <div class="alert-content">
      {@render children()}
    </div>
    {#if dismissible}
      <button type="button" class="alert-dismiss" onclick={handleDismiss} aria-label={closeLabel}>
        <Icon icon="lucide:x" width="16" height="16" />
      </button>
    {/if}
  </div>
{/if}

<style>
  .alert {
    --alert-bg: var(--color-primary-50);
    --alert-border: var(--color-primary-200);
    --alert-text: var(--color-primary-800);
    --alert-icon-color: var(--color-primary-600);

    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
    border: 1px solid var(--alert-border);
    background-color: var(--alert-bg);
    color: var(--alert-text);
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  /* Variants */
  .alert[data-variant='success'] {
    --alert-bg: var(--color-success-50);
    --alert-border: oklch(from var(--color-success-500) l c h / 0.3);
    --alert-text: var(--color-success-700);
    --alert-icon-color: var(--color-success-600);
  }

  .alert[data-variant='warning'] {
    --alert-bg: var(--color-warning-50);
    --alert-border: oklch(from var(--color-warning-500) l c h / 0.3);
    --alert-text: var(--color-warning-700);
    --alert-icon-color: var(--color-warning-600);
  }

  .alert[data-variant='error'] {
    --alert-bg: var(--color-error-50);
    --alert-border: oklch(from var(--color-error-500) l c h / 0.3);
    --alert-text: var(--color-error-700);
    --alert-icon-color: var(--color-error-600);
  }

  /* Dark mode */
  :global(.dark) .alert {
    --alert-bg: oklch(from var(--color-primary-500) 20% 0.05 h);
    --alert-border: var(--color-primary-800);
    --alert-text: var(--color-primary-200);
    --alert-icon-color: var(--color-primary-400);
  }

  :global(.dark) .alert[data-variant='success'] {
    --alert-bg: oklch(from var(--color-success-500) 20% 0.05 h);
    --alert-border: var(--color-success-800);
    --alert-text: var(--color-success-200);
    --alert-icon-color: var(--color-success-400);
  }

  :global(.dark) .alert[data-variant='warning'] {
    --alert-bg: oklch(from var(--color-warning-500) 20% 0.05 h);
    --alert-border: var(--color-warning-800);
    --alert-text: var(--color-warning-200);
    --alert-icon-color: var(--color-warning-400);
  }

  :global(.dark) .alert[data-variant='error'] {
    --alert-bg: oklch(from var(--color-error-500) 20% 0.05 h);
    --alert-border: var(--color-error-800);
    --alert-text: var(--color-error-200);
    --alert-icon-color: var(--color-error-400);
  }

  /* Icon */
  .alert-icon {
    flex-shrink: 0;
    color: var(--alert-icon-color);
  }

  /* Content */
  .alert-content {
    flex: 1;
    min-width: 0;
  }

  /* Dismiss button */
  .alert-dismiss {
    flex-shrink: 0;
    padding: 0;
    background: none;
    border: none;
    color: var(--alert-icon-color);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity var(--transition-fast);
  }

  .alert-dismiss:hover {
    opacity: 1;
  }

  .alert-dismiss:focus-visible {
    outline: 2px solid var(--alert-icon-color);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
</style>
