<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Selectable item for dropdown menus.
   * Displays content with optional selection indicator.
   *
   * @example
   * ```svelte
   * <DropdownItem selected={currentValue === 'a'} onclick={() => select('a')}>
   *   Option A
   * </DropdownItem>
   * ```
   */
  interface Props {
    /** Whether this item is selected */
    selected?: boolean;
    /** Click handler */
    onclick?: () => void;
    /** Item content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { selected = false, onclick, children, class: className = '' }: Props = $props();
</script>

<button
  type="button"
  class="w-full px-4 py-3 flex items-start gap-3 transition-colors text-left hover:bg-secondary-50 dark:hover:bg-secondary-700 {selected
    ? 'bg-secondary-100 dark:bg-secondary-700'
    : ''} {className}"
  {onclick}
  role="option"
  aria-selected={selected}
  data-selected={selected}
>
  {@render children()}
  {#if selected}
    <Icon icon="lucide:check" width="14" height="14" class="text-primary-500 flex-shrink-0 mt-1" />
  {/if}
</button>
