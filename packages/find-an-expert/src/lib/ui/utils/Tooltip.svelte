<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Tooltip component with hover activation.
   * Displays a tooltip below the trigger element on hover.
   */
  interface Props {
    /** Tooltip title (bold) */
    title?: string;
    /** Tooltip description */
    description?: string;
    /** Position of the tooltip relative to trigger */
    position?: 'top' | 'bottom';
    /** Trigger element */
    children: Snippet;
    /** Additional CSS classes for the wrapper */
    class?: string;
  }

  let {
    title,
    description,
    position = 'bottom',
    children,
    class: className = '',
  }: Props = $props();

  const positionClasses = $derived(position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2');

  const arrowClasses = $derived(
    position === 'top'
      ? 'top-full border-t-secondary-800 dark:border-t-secondary-700'
      : 'bottom-full border-b-secondary-800 dark:border-b-secondary-700'
  );
</script>

<div class="group relative inline-block {className}">
  {@render children()}
  {#if title || description}
    <div
      role="tooltip"
      class="
				absolute left-1/2 -translate-x-1/2 {positionClasses}
				px-3 py-2 rounded-md shadow-lg z-50
				bg-secondary-800 dark:bg-secondary-700
				text-xs text-secondary-100
				whitespace-nowrap
				opacity-0 invisible
				group-hover:opacity-100 group-hover:visible
				transition-[opacity,visibility] duration-150
				pointer-events-none
				flex flex-col gap-0.5
			"
    >
      {#if title}
        <span class="font-semibold">{title}</span>
      {/if}
      {#if description}
        <span class="text-secondary-400 dark:text-secondary-500">{description}</span>
      {/if}
      <!-- Arrow -->
      <span
        class="
					absolute left-1/2 -translate-x-1/2 {arrowClasses}
					border-[6px] border-transparent
				"
      ></span>
    </div>
  {/if}
</div>
