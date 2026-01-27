<script lang="ts">
  /**
   * Category header for dropdown menus.
   * Displays a sticky header with a colored indicator dot.
   *
   * @example
   * ```svelte
   * <DropdownCategory name="Professional" showDivider />
   * ```
   */
  interface Props {
    /** Category name to display */
    name: string;
    /** Whether to show a divider above the category */
    showDivider?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let { name, showDivider = false, class: className = '' }: Props = $props();
</script>

<div class={className}>
  {#if showDivider}
    <div class="mx-3 border-t border-secondary-200 dark:border-secondary-700"></div>
  {/if}
  <div
    class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider sticky top-0 flex items-center gap-2 bg-secondary-100 dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
  >
    <span class="w-2 h-2 rounded-full bg-primary-500"></span>
    {name}
  </div>
</div>
