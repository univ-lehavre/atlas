<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * ErrorState - État d'erreur avec icône, code et message
   *
   * Composant centralisé pour afficher les erreurs de manière cohérente.
   * Utilisable pour les pages 404, 500, ou tout autre état d'erreur.
   *
   * @example Simple
   * ```svelte
   * <ErrorState
   *   code={404}
   *   title="Page not found"
   *   message="The page you're looking for doesn't exist."
   * />
   * ```
   *
   * @example Avec actions
   * ```svelte
   * <ErrorState code={500} title="Server error" message="Something went wrong.">
   *   {#snippet actions()}
   *     <a href="/" class="btn-primary">Go home</a>
   *   {/snippet}
   * </ErrorState>
   * ```
   */
  interface Props {
    /** Error code (e.g., 404, 500) */
    code?: number;
    /** Error title */
    title: string;
    /** Error message/description */
    message?: string;
    /** Custom icon (defaults based on code) */
    icon?: string;
    /** Variant affects icon background color */
    variant?: 'default' | 'warning' | 'error';
    /** Size of the error display */
    size?: 'sm' | 'md' | 'lg';
    /** Action buttons area */
    actions?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    code,
    title,
    message,
    icon,
    variant = 'default',
    size = 'lg',
    actions,
    class: className = '',
  }: Props = $props();

  /** Get default icon based on error code */
  const getDefaultIcon = (errorCode?: number): string => {
    if (!errorCode) return 'lucide:alert-triangle';
    if (errorCode === 404) return 'lucide:search-x';
    if (errorCode >= 500) return 'lucide:server-crash';
    if (errorCode >= 400) return 'lucide:alert-triangle';
    return 'lucide:info';
  };

  const displayIcon = $derived(icon ?? getDefaultIcon(code));

  const sizeClasses = {
    sm: {
      container: 'py-8 md:py-12',
      iconWrapper: 'w-16 h-16 mb-4',
      icon: 32,
      code: 'text-4xl mb-2',
      title: 'text-lg mb-2',
      message: 'text-sm mb-4',
    },
    md: {
      container: 'py-12 md:py-20',
      iconWrapper: 'w-20 h-20 mb-6',
      icon: 40,
      code: 'text-5xl mb-3',
      title: 'text-xl mb-3',
      message: 'text-base mb-6',
    },
    lg: {
      container: 'py-20 md:py-32',
      iconWrapper: 'w-24 h-24 mb-8',
      icon: 48,
      code: 'text-6xl mb-4',
      title: 'text-2xl mb-4',
      message: 'text-base mb-8',
    },
  };
</script>

<div class="error-state {sizeClasses[size].container} {className}" data-variant={variant}>
  <div class="error-state-content">
    <div class="error-state-icon-wrapper {sizeClasses[size].iconWrapper}">
      <Icon
        icon={displayIcon}
        width={sizeClasses[size].icon}
        height={sizeClasses[size].icon}
        class="error-state-icon"
      />
    </div>

    {#if code}
      <p class="error-state-code {sizeClasses[size].code}">
        {code}
      </p>
    {/if}

    <h1 class="error-state-title {sizeClasses[size].title}">
      {title}
    </h1>

    {#if message}
      <p class="error-state-message {sizeClasses[size].message}">
        {message}
      </p>
    {/if}

    {#if actions}
      <div class="error-state-actions">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>

<style>
  .error-state {
    --error-icon-bg: var(--color-secondary-100);
    --error-icon-color: var(--color-secondary-400);
    --error-code-color: var(--color-primary-600);
    --error-title-color: var(--color-secondary-800);
    --error-message-color: var(--color-secondary-600);
  }

  /* Variants */
  .error-state[data-variant='warning'] {
    --error-icon-bg: var(--color-warning-100);
    --error-icon-color: var(--color-warning-500);
    --error-code-color: var(--color-warning-600);
  }

  .error-state[data-variant='error'] {
    --error-icon-bg: var(--color-error-100);
    --error-icon-color: var(--color-error-500);
    --error-code-color: var(--color-error-600);
  }

  /* Dark mode */
  :global(.dark) .error-state {
    --error-icon-bg: var(--color-secondary-800);
    --error-icon-color: var(--color-secondary-500);
    --error-code-color: var(--color-primary-400);
    --error-title-color: var(--color-secondary-200);
    --error-message-color: var(--color-secondary-400);
  }

  :global(.dark) .error-state[data-variant='warning'] {
    --error-icon-bg: var(--color-warning-900);
    --error-icon-color: var(--color-warning-400);
    --error-code-color: var(--color-warning-400);
  }

  :global(.dark) .error-state[data-variant='error'] {
    --error-icon-bg: var(--color-error-900);
    --error-icon-color: var(--color-error-400);
    --error-code-color: var(--color-error-400);
  }

  .error-state-content {
    text-align: center;
  }

  .error-state-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-inline: auto;
    border-radius: 9999px;
    background-color: var(--error-icon-bg);
    transition: background-color var(--transition-normal);
  }

  :global(.error-state-icon) {
    color: var(--error-icon-color);
    transition: color var(--transition-normal);
  }

  .error-state-code {
    font-weight: 700;
    color: var(--error-code-color);
    transition: color var(--transition-normal);
  }

  .error-state-title {
    font-weight: 600;
    color: var(--error-title-color);
    transition: color var(--transition-normal);
  }

  .error-state-message {
    color: var(--error-message-color);
    max-width: 32rem;
    margin-inline: auto;
    transition: color var(--transition-normal);
  }

  .error-state-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-md);
  }
</style>
