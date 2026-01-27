<script lang="ts">
  /**
   * KeyValue - Affichage de paire label/valeur
   *
   * Composant simple pour afficher des données clé-valeur
   * de manière cohérente et responsive.
   *
   * @example Simple
   * ```svelte
   * <KeyValue label="Fichiers" value="42" />
   * ```
   *
   * @example Avec variante de couleur
   * ```svelte
   * <KeyValue label="Ouvertes" value={5} variant="success" />
   * <KeyValue label="Fermées" value={12} variant="muted" />
   * ```
   *
   * @example Layout vertical
   * ```svelte
   * <KeyValue label="Premier commit" value="12 janvier 2024" direction="vertical" />
   * ```
   */
  interface Props {
    /** Label/key text */
    label: string;
    /** Value to display */
    value: string | number;
    /** Color variant for the value */
    variant?: 'default' | 'success' | 'error' | 'warning' | 'muted' | 'accent';
    /** Layout direction */
    direction?: 'horizontal' | 'vertical';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    class?: string;
  }

  let {
    label,
    value,
    variant = 'default',
    direction = 'horizontal',
    size = 'md',
    class: className = '',
  }: Props = $props();
</script>

<div class="key-value {className}" data-direction={direction} data-size={size}>
  <span class="kv-label">{label}</span>
  <span class="kv-value" data-variant={variant}>{value}</span>
</div>

<style>
  .key-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .key-value[data-direction='vertical'] {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }

  /* Label */
  .kv-label {
    font-size: var(--text-sm);
    color: var(--color-secondary-600);
  }

  :global(.dark) .kv-label {
    color: var(--color-secondary-400);
  }

  .key-value[data-size='sm'] .kv-label {
    font-size: var(--text-xs);
  }

  .key-value[data-size='lg'] .kv-label {
    font-size: var(--text-base);
  }

  /* Value */
  .kv-value {
    font-weight: 600;
    color: var(--color-secondary-900);
  }

  :global(.dark) .kv-value {
    color: var(--color-secondary-100);
  }

  .key-value[data-size='sm'] .kv-value {
    font-size: var(--text-sm);
  }

  .key-value[data-size='lg'] .kv-value {
    font-size: var(--text-lg);
  }

  /* Variants */
  .kv-value[data-variant='success'] {
    color: var(--color-success-600);
  }

  :global(.dark) .kv-value[data-variant='success'] {
    color: var(--color-success-500);
  }

  .kv-value[data-variant='error'] {
    color: var(--color-error-600);
  }

  :global(.dark) .kv-value[data-variant='error'] {
    color: var(--color-error-500);
  }

  .kv-value[data-variant='warning'] {
    color: var(--color-warning-600);
  }

  :global(.dark) .kv-value[data-variant='warning'] {
    color: var(--color-warning-500);
  }

  .kv-value[data-variant='accent'] {
    color: var(--color-accent-600);
  }

  :global(.dark) .kv-value[data-variant='accent'] {
    color: var(--color-accent-500);
  }

  .kv-value[data-variant='muted'] {
    color: var(--color-secondary-500);
  }

  :global(.dark) .kv-value[data-variant='muted'] {
    color: var(--color-secondary-400);
  }
</style>
