<script lang="ts">
  import { LoadingSpinner } from '$lib/ui';

  /**
   * LoadingState - État de chargement avec titre et message
   *
   * Affiche un état de chargement élégant avec un titre optionnel,
   * un spinner et un message descriptif.
   *
   * @example Simple
   * ```svelte
   * <LoadingState message="Chargement des données..." />
   * ```
   *
   * @example Avec titre
   * ```svelte
   * <LoadingState
   *   title="Connexion en cours..."
   *   message="Vérification de vos identifiants"
   * />
   * ```
   *
   * @example Avec variante et taille personnalisées
   * ```svelte
   * <LoadingState
   *   title="Traitement"
   *   message="Veuillez patienter..."
   *   size="lg"
   *   variant="accent"
   * />
   * ```
   */
  interface Props {
    /** Title displayed above the spinner */
    title?: string;
    /** Message displayed below the spinner */
    message?: string;
    /** Spinner size */
    size?: 'sm' | 'md' | 'lg';
    /** Spinner variant */
    variant?: 'primary' | 'accent' | 'secondary';
    /** Additional CSS classes */
    class?: string;
  }

  let { title, message, size = 'md', variant = 'primary', class: className = '' }: Props = $props();
</script>

<div class="loading-state {className}">
  {#if title}
    <h1 class="loading-state-title">{title}</h1>
  {/if}
  <LoadingSpinner {size} {variant} label={message} />
  {#if message}
    <p class="loading-state-message">{message}</p>
  {/if}
</div>

<style>
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    text-align: center;
  }

  .loading-state-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-secondary-900);
    margin: 0;
  }

  :global(.dark) .loading-state-title {
    color: var(--color-secondary-100);
  }

  .loading-state-message {
    font-size: var(--text-base);
    color: var(--color-secondary-600);
    margin: 0;
  }

  :global(.dark) .loading-state-message {
    color: var(--color-secondary-400);
  }
</style>
