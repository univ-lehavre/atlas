<script lang="ts">
  /**
   * Color scale row for displaying a complete color palette.
   * Shows the color name, Tailwind class, and all shade variations.
   *
   * @example
   * ```svelte
   * <ColorScaleRow
   *   name="Primary"
   *   cssPrefix="primary"
   *   shades={[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]}
   *   highlightShade={500}
   * />
   * ```
   */
  interface Props {
    /** Display name of the color */
    name: string;
    /** CSS variable prefix (e.g., 'primary' for --color-primary-*) */
    cssPrefix: string;
    /** Array of shade values to display */
    shades?: number[];
    /** Which shade to highlight (usually 500) */
    highlightShade?: number;
    /** Whether to show all shades or only specific ones */
    sparseShades?: number[];
    /** Whether this is the last row (no border) */
    isLast?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    name,
    cssPrefix,
    shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
    highlightShade = 500,
    sparseShades,
    isLast = false,
    class: className = '',
  }: Props = $props();

  const shouldShowShade = (shade: number): boolean => {
    if (!sparseShades) return true;
    return sparseShades.includes(shade);
  };
</script>

<tr class="{isLast ? '' : 'border-b border-secondary-100 dark:border-secondary-800'} {className}">
  <td class="py-3 px-2">
    <div class="font-medium text-secondary-900 dark:text-secondary-100">{name}</div>
    <div class="text-xs text-secondary-500 dark:text-secondary-400 font-mono">
      bg-{cssPrefix}-*
    </div>
  </td>
  {#each shades as shade (shade)}
    <td class="py-3 px-1">
      {#if shouldShowShade(shade)}
        <div
          class="w-8 h-8 rounded mx-auto {shade === highlightShade
            ? 'ring-2 ring-secondary-300 dark:ring-secondary-600'
            : ''}"
          style="background-color: var(--color-{cssPrefix}-{shade})"
          title="bg-{cssPrefix}-{shade}"
        ></div>
      {/if}
    </td>
  {/each}
</tr>
