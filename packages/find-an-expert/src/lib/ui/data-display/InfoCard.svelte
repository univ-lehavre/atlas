<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon, LoadingSpinner } from '$lib/ui';

  /**
   * InfoCard - Card composable avec zones leading/trailing/meta
   *
   * @example Simple
   * ```svelte
   * <InfoCard title="Profil" icon="lucide:user">
   *   <p>John Doe - Chercheur</p>
   * </InfoCard>
   * ```
   *
   * @example Complet avec toutes les zones
   * ```svelte
   * <InfoCard title="Organisation" variant="info">
   *   <p>ECRIN - European Clinical Research</p>
   *   {#snippet leading()}
   *     <Avatar src={org.logo} />
   *   {/snippet}
   *   {#snippet trailing()}
   *     <Badge variant="success">Active</Badge>
   *   {/snippet}
   *   {#snippet meta()}
   *     <span>Dernière mise à jour: {date}</span>
   *   {/snippet}
   * </InfoCard>
   * ```
   */
  interface Props {
    /** Card title */
    title: string;
    /** Lucide icon name */
    icon?: string;
    /** Semantic variant */
    variant?: 'default' | 'info' | 'success' | 'warning' | 'error';
    /** Loading state */
    isLoading?: boolean;
    /** Error message (shows error state) */
    error?: string;
    /** Main content */
    children: Snippet;
    /** Leading area (left side - avatar, icon, image) */
    leading?: Snippet;
    /** Trailing area (right side - badge, action, value) */
    trailing?: Snippet;
    /** Meta area (footer - timestamps, metadata) */
    meta?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    icon,
    variant = 'default',
    isLoading = false,
    error,
    children,
    leading,
    trailing,
    meta,
    class: className = '',
  }: Props = $props();

  const iconMap: Record<string, string> = {
    info: 'lucide:info',
    success: 'lucide:check-circle',
    warning: 'lucide:alert-triangle',
    error: 'lucide:x-circle',
  };
</script>

<article class="info-card {className}" data-variant={variant}>
  {#if isLoading}
    <div class="loading-state">
      <LoadingSpinner size="md" />
      <span>Chargement...</span>
    </div>
  {:else if error}
    <div class="error-state">
      <Icon icon="lucide:alert-circle" width="20" height="20" />
      <div>
        <p class="error-title">{title}</p>
        <p class="error-message">{error}</p>
      </div>
    </div>
  {:else}
    <header class="card-header">
      <div class="header-left">
        {#if icon}
          <Icon {icon} width="20" height="20" class="header-icon" />
        {:else if variant !== 'default' && iconMap[variant]}
          <Icon icon={iconMap[variant]} width="20" height="20" class="header-icon" />
        {/if}
        <h3 class="card-title">{title}</h3>
      </div>
      {#if trailing}
        <div class="header-right">
          {@render trailing()}
        </div>
      {/if}
    </header>

    <div class="card-body">
      {#if leading}
        <div class="body-leading">
          {@render leading()}
        </div>
      {/if}
      <div class="body-content">
        {@render children()}
      </div>
    </div>

    {#if meta}
      <footer class="card-meta">
        {@render meta()}
      </footer>
    {/if}
  {/if}
</article>

<style>
  .info-card {
    --card-bg: white;
    --card-border: var(--color-secondary-200);
    --card-title-color: var(--color-secondary-900);
    --card-icon-color: var(--color-secondary-600);

    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  /* Variants */
  .info-card[data-variant='info'] {
    --card-border: var(--color-primary-200);
    --card-icon-color: var(--color-primary-600);
  }

  .info-card[data-variant='success'] {
    --card-border: var(--color-success-500);
    --card-icon-color: var(--color-success-600);
  }

  .info-card[data-variant='warning'] {
    --card-border: var(--color-warning-500);
    --card-icon-color: var(--color-warning-600);
  }

  .info-card[data-variant='error'] {
    --card-border: var(--color-error-500);
    --card-icon-color: var(--color-error-600);
  }

  /* Dark mode */
  :global(.dark) .info-card {
    --card-bg: var(--color-secondary-800);
    --card-border: var(--color-secondary-700);
    --card-title-color: var(--color-secondary-100);
    --card-icon-color: var(--color-secondary-400);
  }

  :global(.dark) .info-card[data-variant='info'] {
    --card-border: var(--color-primary-800);
    --card-icon-color: var(--color-primary-400);
  }

  :global(.dark) .info-card[data-variant='success'] {
    --card-border: var(--color-success-700);
    --card-icon-color: var(--color-success-500);
  }

  :global(.dark) .info-card[data-variant='warning'] {
    --card-border: var(--color-warning-700);
    --card-icon-color: var(--color-warning-500);
  }

  :global(.dark) .info-card[data-variant='error'] {
    --card-border: var(--color-error-700);
    --card-icon-color: var(--color-error-500);
  }

  /* Loading state */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
    color: var(--color-secondary-500);
  }

  /* Error state */
  .error-state {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    color: var(--color-error-600);
  }

  :global(.dark) .error-state {
    color: var(--color-error-400);
  }

  .error-title {
    font-weight: 600;
    margin: 0;
  }

  .error-message {
    font-size: var(--text-sm);
    margin: var(--spacing-xs) 0 0;
    opacity: 0.9;
  }

  /* Header */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--card-border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  :global(.header-icon) {
    flex-shrink: 0;
    color: var(--card-icon-color);
  }

  .card-title {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--card-title-color);
    margin: 0;
  }

  .header-right {
    flex-shrink: 0;
  }

  /* Body */
  .card-body {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }

  .body-leading {
    flex-shrink: 0;
  }

  .body-content {
    flex: 1;
    min-width: 0;
    color: var(--color-secondary-700);
  }

  :global(.dark) .body-content {
    color: var(--color-secondary-300);
  }

  /* Meta footer */
  .card-meta {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--color-secondary-50);
    border-top: 1px solid var(--card-border);
    font-size: var(--text-xs);
    color: var(--color-secondary-600);
  }

  :global(.dark) .card-meta {
    background-color: var(--color-secondary-900);
    color: var(--color-secondary-400);
  }
</style>
