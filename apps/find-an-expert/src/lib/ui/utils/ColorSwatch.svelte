<script lang="ts">
  /**
   * Color swatch component for displaying color previews.
   * Can display a single color or a group of colors.
   *
   * @example Single color
   * ```svelte
   * <ColorSwatch color="var(--color-primary-500)" label="Primary" />
   * ```
   *
   * @example Group of colors
   * ```svelte
   * <ColorSwatch colors={['#ff0000', '#00ff00', '#0000ff']} />
   * ```
   */
  interface Props {
    /** Single color value (CSS color) */
    color?: string;
    /** Multiple colors for a grouped swatch */
    colors?: string[];
    /** Color label (shown below single color) */
    label?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show rounded corners on edges */
    rounded?: boolean;
    /** Title for tooltip */
    title?: string;
    /** Whether this swatch has a highlight ring */
    highlighted?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    color,
    colors,
    label,
    size = 'md',
    rounded = true,
    title,
    highlighted = false,
    class: className = '',
  }: Props = $props();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-12 h-12',
  };

  const sizeClass = $derived(sizeClasses[size]);
  const highlightClass = $derived(
    highlighted ? 'ring-2 ring-secondary-300 dark:ring-secondary-600' : ''
  );
</script>

{#if colors && colors.length > 0}
  <!-- Group of colors -->
  <div class="flex gap-0.5 {className}">
    {#each colors as c, i (i)}
      {@const isFirst = i === 0}
      {@const isLast = i === colors.length - 1}
      {@const roundedClass =
        rounded && isFirst ? 'rounded-l' : rounded && isLast ? 'rounded-r' : ''}
      <div
        class="{sizeClass} {roundedClass} {highlightClass}"
        style="background-color: {c}"
        {title}
      ></div>
    {/each}
  </div>
{:else if color}
  <!-- Single color -->
  <div class="flex flex-col items-center gap-2 {className}">
    <div
      class="{sizeClass} {rounded ? 'rounded-lg' : ''} {highlightClass}"
      style="background-color: {color}"
      title={title || label}
    ></div>
    {#if label}
      <span class="text-xs text-secondary-500 dark:text-secondary-400">{label}</span>
    {/if}
  </div>
{/if}
