<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Dropdown - Menu déroulant générique
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/Dropdown.
   *
   * @example Basic usage
   * ```svelte
   * <Dropdown bind:open={isOpen} closeMenuLabel="Close">
   *   {#snippet trigger()}
   *     <span>Select option</span>
   *   {/snippet}
   *   <DropdownItem onclick={() => select('a')}>Option A</DropdownItem>
   * </Dropdown>
   * ```
   */
  interface Props {
    /** Whether the dropdown is open */
    open?: boolean;
    /** Width of the dropdown panel */
    width?: string;
    /** Maximum height of the dropdown panel */
    maxHeight?: string;
    /** Horizontal alignment */
    align?: 'left' | 'right';
    /** Close button aria-label */
    closeMenuLabel: string;
    /** Trigger button content */
    trigger: Snippet;
    /** Dropdown content (items, categories, etc.) */
    children: Snippet;
    /** Additional CSS classes for the trigger button */
    triggerClass?: string;
    /** Additional CSS classes for the panel */
    panelClass?: string;
  }

  let {
    open = $bindable(false),
    width = 'w-80',
    maxHeight = 'max-h-[32rem]',
    align = 'right',
    closeMenuLabel,
    trigger,
    children,
    triggerClass = '',
    panelClass = '',
  }: Props = $props();

  /** Scroll to selected item when dropdown opens */
  const scrollToSelected = (node: HTMLElement): void => {
    const selected = node.querySelector('[data-selected="true"]') as HTMLElement | null;
    if (selected) {
      const containerHeight = node.clientHeight;
      const selectedTop = selected.offsetTop;
      const selectedHeight = selected.offsetHeight;
      node.scrollTop = selectedTop - containerHeight / 2 + selectedHeight / 2;
    }
  };

  const close = (): void => {
    open = false;
  };

  const toggle = (): void => {
    open = !open;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      close();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative">
  <button
    type="button"
    class="h-[52px] flex items-center gap-3 px-3 py-2 text-sm border border-secondary-200 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 transition-colors {triggerClass}"
    onclick={toggle}
    aria-expanded={open}
    aria-haspopup="listbox"
  >
    {@render trigger()}
    <Icon
      icon="lucide:chevron-down"
      width="16"
      height="16"
      class="transition-transform {open ? 'rotate-180' : ''}"
    />
  </button>

  {#if open}
    <button type="button" class="fixed inset-0 z-10" onclick={close} aria-label={closeMenuLabel}
    ></button>

    <div
      class="{width} {maxHeight} absolute mt-2 overflow-y-auto border border-secondary-200 dark:border-secondary-600 rounded-lg shadow-lg z-20 bg-white dark:bg-secondary-800 {align ===
      'left'
        ? 'left-0'
        : 'right-0'} {panelClass}"
      use:scrollToSelected
      role="listbox"
    >
      {@render children()}
    </div>
  {/if}
</div>
