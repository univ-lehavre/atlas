<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Button - Bouton interactif avec variantes
   *
   * Composant bouton pour les actions qui ne sont pas des navigations.
   * Pour les liens stylés comme boutons, utilisez LinkButton.
   *
   * @example Simple
   * ```svelte
   * <Button onclick={handleClick}>Cliquer</Button>
   * ```
   *
   * @example Avec icône et variante
   * ```svelte
   * <Button variant="outline" icon="lucide:arrow-left" onclick={goBack}>
   *   Retour
   * </Button>
   * ```
   *
   * @example Submit
   * ```svelte
   * <Button type="submit" variant="primary" loading={isLoading}>
   *   Envoyer
   * </Button>
   * ```
   */
  interface Props {
    /** Button type */
    type?: 'button' | 'submit' | 'reset';
    /** Button variant */
    variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Icon name (Iconify format) */
    icon?: string;
    /** Icon position */
    iconPosition?: 'left' | 'right';
    /** Loading state */
    loading?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Click handler */
    onclick?: (event: MouseEvent) => void;
    /** Button content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    type = 'button',
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    onclick,
    children,
    class: className = '',
  }: Props = $props();

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  const buttonClass = $derived(
    [variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(' ')
  );

  const isDisabled = $derived(disabled || loading);
</script>

<button {type} class={buttonClass} disabled={isDisabled} {onclick}>
  {#if loading}
    <span class="button-spinner"></span>
  {:else if icon && iconPosition === 'left'}
    <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} />
  {/if}
  <span class="button-text">
    {@render children()}
  </span>
  {#if !loading && icon && iconPosition === 'right'}
    <Icon {icon} width={iconSizes[size]} height={iconSizes[size]} />
  {/if}
</button>

<style>
  button {
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-text {
    white-space: nowrap;
  }

  .button-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
