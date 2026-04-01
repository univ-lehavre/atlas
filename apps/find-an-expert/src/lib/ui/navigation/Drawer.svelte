<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Drawer - Panneau coulissant (offcanvas)
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/Drawer.
   *
   * @example
   * ```svelte
   * <Drawer bind:open title="Menu" closeLabel="Fermer le menu">
   *   <nav>...</nav>
   * </Drawer>
   * ```
   */
  interface Props {
    /** Whether the drawer is open */
    open?: boolean;
    /** Drawer title */
    title: string;
    /** Close button aria-label */
    closeLabel: string;
    /** Position of the drawer */
    position?: 'left' | 'right';
    /** Width class */
    width?: string;
    /** Close handler */
    onclose?: () => void;
    /** Header content (rendered after title) */
    header?: Snippet;
    /** Main content */
    children: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    open = $bindable(false),
    title,
    closeLabel,
    position = 'right',
    width = 'w-72',
    onclose,
    header,
    children,
    class: className = '',
  }: Props = $props();

  const closeDrawer = (): void => {
    open = false;
    onclose?.();
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && open) {
      closeDrawer();
    }
  };

  const positionClasses = $derived(position === 'left' ? 'left-0' : 'right-0');
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <button
    type="button"
    class="fixed inset-0 bg-black/50 z-40 md:hidden"
    onclick={closeDrawer}
    aria-label={closeLabel}
  ></button>

  <!-- Drawer Panel -->
  <div
    class="
			fixed top-0 {positionClasses} h-full {width}
			bg-white dark:bg-secondary-800
			shadow-xl z-50 md:hidden
			transition-colors duration-200
			{className}
		"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <!-- Header -->
    <div
      class="p-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between"
    >
      <span class="text-lg font-bold text-primary-700 dark:text-primary-400">{title}</span>
      <div class="flex items-center gap-2">
        {#if header}
          {@render header()}
        {/if}
        <button
          type="button"
          class="p-2 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400"
          onclick={closeDrawer}
          aria-label={closeLabel}
        >
          <Icon icon="lucide:x" width="24" height="24" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 flex flex-col gap-4">
      {@render children()}
    </div>
  </div>
{/if}
