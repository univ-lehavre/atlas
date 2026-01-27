<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * ButtonGroup - Container for grouping action buttons
   *
   * Provides consistent spacing and layout for button groups.
   * Supports horizontal, vertical, and responsive orientations.
   *
   * @example Horizontal (default)
   * ```svelte
   * <ButtonGroup>
   *   <button class="btn-primary">Save</button>
   *   <button class="btn-outline">Cancel</button>
   * </ButtonGroup>
   * ```
   *
   * @example Centered with wrap
   * ```svelte
   * <ButtonGroup justify="center">
   *   <a href="/" class="btn-primary">Home</a>
   *   <button class="btn-outline">Go back</button>
   * </ButtonGroup>
   * ```
   *
   * @example Stacked on mobile
   * ```svelte
   * <ButtonGroup orientation="responsive">
   *   <button class="btn-primary">Primary action</button>
   *   <button class="btn-secondary">Secondary action</button>
   * </ButtonGroup>
   * ```
   */
  interface Props {
    /** Layout orientation */
    orientation?: 'horizontal' | 'vertical' | 'responsive';
    /** Horizontal alignment */
    justify?: 'start' | 'center' | 'end' | 'between';
    /** Gap between buttons */
    gap?: 'sm' | 'md' | 'lg';
    /** Button content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    orientation = 'horizontal',
    justify = 'start',
    gap = 'md',
    children,
    class: className = '',
  }: Props = $props();
</script>

<div
  class="button-group {className}"
  data-orientation={orientation}
  data-justify={justify}
  data-gap={gap}
>
  {@render children()}
</div>

<style>
  .button-group {
    --button-group-gap: var(--spacing-md);

    display: flex;
    flex-wrap: wrap;
    gap: var(--button-group-gap);
  }

  /* Orientation */
  .button-group[data-orientation='horizontal'] {
    flex-direction: row;
  }

  .button-group[data-orientation='vertical'] {
    flex-direction: column;
  }

  .button-group[data-orientation='responsive'] {
    flex-direction: column;
  }

  @media (min-width: 640px) {
    .button-group[data-orientation='responsive'] {
      flex-direction: row;
    }
  }

  /* Justify */
  .button-group[data-justify='start'] {
    justify-content: flex-start;
  }

  .button-group[data-justify='center'] {
    justify-content: center;
  }

  .button-group[data-justify='end'] {
    justify-content: flex-end;
  }

  .button-group[data-justify='between'] {
    justify-content: space-between;
  }

  /* Gap */
  .button-group[data-gap='sm'] {
    --button-group-gap: var(--spacing-sm);
  }

  .button-group[data-gap='lg'] {
    --button-group-gap: var(--spacing-lg);
  }
</style>
