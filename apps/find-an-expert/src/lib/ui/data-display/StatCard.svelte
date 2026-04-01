<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * StatCard - Card affichant une statistique avec label et valeur
   *
   * Supporte les variantes de couleurs sémantiques et le dark mode.
   * Peut afficher une icône et un préfixe/suffixe.
   *
   * @example Simple
   * ```svelte
   * <StatCard label="Commits" value={42} />
   * ```
   *
   * @example Avec variante et préfixe
   * ```svelte
   * <StatCard label="Additions" value={128} variant="success" prefix="+" />
   * <StatCard label="Deletions" value={23} variant="error" prefix="-" />
   * ```
   *
   * @example Avec icône et suffixe
   * ```svelte
   * <StatCard label="Croissance" value={15} suffix="%" icon="lucide:trending-up" variant="success" />
   * ```
   */
  interface Props {
    /** Stat label/title */
    label: string;
    /** Stat value (can be string or number) */
    value: string | number;
    /** Color variant */
    variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'danger';
    /** Prefix before value (e.g., "+", "-", "$") */
    prefix?: string;
    /** Suffix after value (e.g., "%", "K") */
    suffix?: string;
    /** Icon name (Iconify format) */
    icon?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Optional footer content */
    footer?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    label,
    value,
    variant = 'default',
    prefix = '',
    suffix = '',
    icon,
    size = 'md',
    footer,
    class: className = '',
  }: Props = $props();

  // Map 'danger' to 'error' for backwards compatibility
  const normalizedVariant = $derived(variant === 'danger' ? 'error' : variant);

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
</script>

<div class="stat-card {className}" data-variant={normalizedVariant} data-size={size}>
  <div class="stat-header">
    {#if icon}
      <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} class="stat-icon" />
    {/if}
    <span class="stat-label">{label}</span>
  </div>
  <div class="stat-value">
    {prefix}{value}{suffix}
  </div>
  {#if footer}
    <div class="stat-footer">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .stat-card {
    --stat-bg: white;
    --stat-border: var(--color-secondary-200);
    --stat-label-color: var(--color-secondary-500);
    --stat-value-color: var(--color-secondary-900);
    --stat-icon-color: var(--color-secondary-400);

    background-color: var(--stat-bg);
    border: 1px solid var(--stat-border);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  /* Sizes */
  .stat-card[data-size='sm'] {
    padding: var(--spacing-md);
  }

  .stat-card[data-size='lg'] {
    padding: var(--spacing-xl);
  }

  /* Variants */
  .stat-card[data-variant='success'] {
    --stat-value-color: var(--color-success-600);
    --stat-icon-color: var(--color-success-500);
  }

  .stat-card[data-variant='error'] {
    --stat-value-color: var(--color-error-600);
    --stat-icon-color: var(--color-error-500);
  }

  .stat-card[data-variant='warning'] {
    --stat-value-color: var(--color-warning-600);
    --stat-icon-color: var(--color-warning-500);
  }

  .stat-card[data-variant='info'] {
    --stat-value-color: var(--color-primary-600);
    --stat-icon-color: var(--color-primary-500);
  }

  /* Dark mode */
  :global(.dark) .stat-card {
    --stat-bg: var(--color-secondary-800);
    --stat-border: var(--color-secondary-700);
    --stat-label-color: var(--color-secondary-400);
    --stat-value-color: var(--color-secondary-100);
    --stat-icon-color: var(--color-secondary-500);
  }

  :global(.dark) .stat-card[data-variant='success'] {
    --stat-value-color: var(--color-success-500);
    --stat-icon-color: var(--color-success-400);
  }

  :global(.dark) .stat-card[data-variant='error'] {
    --stat-value-color: var(--color-error-500);
    --stat-icon-color: var(--color-error-400);
  }

  :global(.dark) .stat-card[data-variant='warning'] {
    --stat-value-color: var(--color-warning-500);
    --stat-icon-color: var(--color-warning-400);
  }

  :global(.dark) .stat-card[data-variant='info'] {
    --stat-value-color: var(--color-primary-400);
    --stat-icon-color: var(--color-primary-400);
  }

  /* Header */
  .stat-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);
  }

  :global(.stat-icon) {
    flex-shrink: 0;
    color: var(--stat-icon-color);
  }

  .stat-label {
    font-size: var(--text-sm);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--stat-label-color);
  }

  .stat-card[data-size='sm'] .stat-label {
    font-size: var(--text-xs);
  }

  .stat-card[data-size='lg'] .stat-label {
    font-size: var(--text-base);
  }

  /* Value */
  .stat-value {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--stat-value-color);
    line-height: 1.2;
  }

  .stat-card[data-size='sm'] .stat-value {
    font-size: var(--text-2xl);
  }

  .stat-card[data-size='lg'] .stat-value {
    font-size: var(--text-4xl);
  }

  /* Footer */
  .stat-footer {
    margin-top: var(--spacing-sm);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--stat-border);
    font-size: var(--text-xs);
    color: var(--stat-label-color);
  }
</style>
