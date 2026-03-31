<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Grid - Grille responsive avec gestion d'état vide
   *
   * @example Simple
   * ```svelte
   * <Grid cols={3}>
   *   {#each items as item}
   *     <Card>{item.name}</Card>
   *   {/each}
   * </Grid>
   * ```
   *
   * @example Avec header et état vide
   * ```svelte
   * <Grid cols={2} isEmpty={items.length === 0}>
   *   {#each items as item}
   *     <ItemCard {item} />
   *   {/each}
   *   {#snippet header()}
   *     <h3>Mes items</h3>
   *   {/snippet}
   *   {#snippet empty()}
   *     <EmptyState message="Aucun item" />
   *   {/snippet}
   * </Grid>
   * ```
   */
  interface Props {
    /** Number of columns (responsive: 1 on mobile, then this value) */
    cols?: 1 | 2 | 3 | 4 | 5 | 6;
    /** Gap between items */
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Show empty state */
    isEmpty?: boolean;
    /** Main content (grid items) */
    children: Snippet;
    /** Optional header above grid */
    header?: Snippet;
    /** Empty state content */
    empty?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    cols = 3,
    gap = 'md',
    isEmpty = false,
    children,
    header,
    empty,
    class: className = '',
  }: Props = $props();
</script>

{#if header}
  <div class="grid-header">
    {@render header()}
  </div>
{/if}

{#if isEmpty && empty}
  <div class="grid-empty">
    {@render empty()}
  </div>
{:else}
  <div class="grid {className}" data-cols={cols} data-gap={gap}>
    {@render children()}
  </div>
{/if}

<style>
  .grid {
    --grid-cols: 3;
    --grid-gap: var(--spacing-md);

    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: var(--grid-gap);
  }

  /* Responsive columns */
  @media (min-width: 640px) {
    .grid[data-cols='2'],
    .grid[data-cols='3'],
    .grid[data-cols='4'],
    .grid[data-cols='5'],
    .grid[data-cols='6'] {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 768px) {
    .grid[data-cols='3'] {
      grid-template-columns: repeat(3, 1fr);
    }
    .grid[data-cols='4'],
    .grid[data-cols='5'],
    .grid[data-cols='6'] {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .grid[data-cols='4'] {
      grid-template-columns: repeat(4, 1fr);
    }
    .grid[data-cols='5'] {
      grid-template-columns: repeat(5, 1fr);
    }
    .grid[data-cols='6'] {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  /* Gap variants */
  .grid[data-gap='xs'] {
    --grid-gap: var(--spacing-xs);
  }
  .grid[data-gap='sm'] {
    --grid-gap: var(--spacing-sm);
  }
  .grid[data-gap='lg'] {
    --grid-gap: var(--spacing-lg);
  }
  .grid[data-gap='xl'] {
    --grid-gap: var(--spacing-xl);
  }

  /* Header */
  .grid-header {
    margin-bottom: var(--spacing-lg);
  }

  /* Empty state */
  .grid-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl) var(--spacing-md);
    text-align: center;
    color: var(--color-secondary-500);
  }

  :global(.dark) .grid-empty {
    color: var(--color-secondary-400);
  }
</style>
