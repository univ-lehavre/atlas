<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dropdown as BaseDropdown } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * Dropdown - Pre-configured dropdown with i18n labels.
   *
   * Wraps $lib/ui/Dropdown and injects accessibility labels from i18n.
   *
   * @example
   * ```svelte
   * <Dropdown bind:open>
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
    width,
    maxHeight,
    align,
    trigger,
    children,
    triggerClass,
    panelClass,
  }: Props = $props();

  const i18n = useI18n();
  const a11y = $derived(i18n.accessibility);
</script>

<BaseDropdown
  bind:open
  {width}
  {maxHeight}
  {align}
  closeMenuLabel={a11y.closeMenu}
  {trigger}
  {triggerClass}
  {panelClass}
>
  {@render children()}
</BaseDropdown>
