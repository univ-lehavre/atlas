<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * LinkButton - Lien stylé comme un bouton
   *
   * Utilisé pour les actions de navigation qui ressemblent à des boutons.
   * Supporte les icônes et plusieurs variantes de couleurs.
   *
   * Note: This component accepts any href string (internal or external).
   * Route resolution is handled by the caller when needed.
   *
   * @example Simple
   * ```svelte
   * <LinkButton href="/dashboard" variant="primary">Dashboard</LinkButton>
   * ```
   *
   * @example Avec icône
   * ```svelte
   * <LinkButton href="https://github.com" icon="mdi:github" external>
   *   GitHub
   * </LinkButton>
   * ```
   *
   * @example Variantes
   * ```svelte
   * <LinkButton href="/new" variant="primary">Nouveau</LinkButton>
   * <LinkButton href="/list" variant="secondary">Liste</LinkButton>
   * <LinkButton href="/success" variant="success">Succès</LinkButton>
   * ```
   */
  interface Props {
    /** Target URL */
    href: string;
    /** Button variant */
    variant?: 'primary' | 'secondary' | 'success' | 'accent' | 'warning' | 'error' | 'dark';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Icon name (Iconify format) */
    icon?: string;
    /** Icon position */
    iconPosition?: 'left' | 'right';
    /** Open in new tab (adds rel="noopener noreferrer") */
    external?: boolean;
    /** Disabled state (renders as span) */
    disabled?: boolean;
    /** Button content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    href,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    external = false,
    disabled = false,
    children,
    class: className = '',
  }: Props = $props();

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
</script>

{#if disabled}
  <span
    class="link-button {className}"
    data-variant={variant}
    data-size={size}
    data-disabled="true"
  >
    {#if icon && iconPosition === 'left'}
      <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} class="link-button-icon" />
    {/if}
    <span class="link-button-text">
      {@render children()}
    </span>
    {#if icon && iconPosition === 'right'}
      <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} class="link-button-icon" />
    {/if}
  </span>
{:else}
  <!-- eslint-disable svelte/no-navigation-without-resolve -- generic navigation component accepts any href -->
  <a
    {href}
    class="link-button {className}"
    data-variant={variant}
    data-size={size}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {#if icon && iconPosition === 'left'}
      <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} class="link-button-icon" />
    {/if}
    <span class="link-button-text">
      {@render children()}
    </span>
    {#if icon && iconPosition === 'right'}
      <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} class="link-button-icon" />
    {/if}
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
{/if}

<style>
  .link-button {
    --btn-bg: var(--color-primary-600);
    --btn-bg-hover: var(--color-primary-500);
    --btn-text: white;

    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    background-color: var(--btn-bg);
    color: var(--btn-text);
    font-weight: 500;
    text-decoration: none;
    transition:
      background-color var(--transition-fast),
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .link-button:hover {
    background-color: var(--btn-bg-hover);
  }

  .link-button:focus-visible {
    outline: 2px solid var(--btn-bg);
    outline-offset: 2px;
  }

  .link-button:active {
    transform: scale(0.98);
  }

  /* Sizes */
  .link-button[data-size='sm'] {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--text-sm);
    border-radius: var(--radius-md);
  }

  .link-button[data-size='lg'] {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--text-lg);
  }

  /* Variants */
  .link-button[data-variant='secondary'] {
    --btn-bg: var(--color-secondary-600);
    --btn-bg-hover: var(--color-secondary-500);
  }

  .link-button[data-variant='success'] {
    --btn-bg: var(--color-success-600);
    --btn-bg-hover: var(--color-success-500);
  }

  .link-button[data-variant='accent'] {
    --btn-bg: var(--color-accent-600);
    --btn-bg-hover: var(--color-accent-500);
  }

  .link-button[data-variant='warning'] {
    --btn-bg: var(--color-warning-600);
    --btn-bg-hover: var(--color-warning-500);
  }

  .link-button[data-variant='error'] {
    --btn-bg: var(--color-error-600);
    --btn-bg-hover: var(--color-error-500);
  }

  .link-button[data-variant='dark'] {
    --btn-bg: var(--color-secondary-900);
    --btn-bg-hover: var(--color-secondary-700);
  }

  /* Dark mode */
  :global(.dark) .link-button[data-variant='dark'] {
    --btn-bg: var(--color-secondary-700);
    --btn-bg-hover: var(--color-secondary-600);
  }

  /* Disabled */
  .link-button[data-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Icon styling */
  :global(.link-button-icon) {
    flex-shrink: 0;
  }

  .link-button-text {
    white-space: nowrap;
  }
</style>
