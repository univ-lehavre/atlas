<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button } from '$lib/ui';

  /**
   * ThemeToggleRow - Row for displaying theme settings with toggle button
   *
   * Displays a leading visual element, label with value, and a toggle button
   * to switch between fixed and random modes.
   *
   * @example
   * ```svelte
   * <ThemeToggleRow
   *   label="Palette"
   *   value="ocean"
   *   isSaved={true}
   *   onToggle={togglePaletteMode}
   * >
   *   {#snippet leading()}
   *     <div class="palette-preview">...</div>
   *   {/snippet}
   * </ThemeToggleRow>
   * ```
   */
  interface Props {
    /** Setting label */
    label: string;
    /** Current value to display */
    value: string;
    /** Whether the preference is saved (fixed mode) */
    isSaved: boolean;
    /** Toggle callback */
    onToggle: () => void;
    /** Leading visual element (icon, preview, etc.) */
    leading?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let { label, value, isSaved, onToggle, leading, class: className = '' }: Props = $props();
</script>

<div class="theme-toggle-row {className}">
  <div class="toggle-left">
    {#if leading}
      <div class="toggle-leading">
        {@render leading()}
      </div>
    {/if}
    <div class="toggle-info">
      <span class="toggle-label">{label}</span>
      <p class="toggle-value">{value}</p>
    </div>
  </div>
  <Button
    variant={isSaved ? 'primary' : 'ghost'}
    size="sm"
    onclick={onToggle}
    icon={isSaved ? 'lucide:lock' : 'lucide:shuffle'}
    class="toggle-button"
  >
    {isSaved ? 'Fixed' : 'Random'}
  </Button>
</div>

<style>
  .theme-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .toggle-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .toggle-leading {
    flex-shrink: 0;
  }

  .toggle-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
  }

  .toggle-label {
    font-size: var(--text-sm);
    color: var(--color-secondary-500);
  }

  :global(.dark) .toggle-label {
    color: var(--color-secondary-400);
  }

  .toggle-value {
    margin: 0;
    font-weight: 500;
    text-transform: capitalize;
    color: var(--color-secondary-900);
  }

  :global(.dark) .toggle-value {
    color: var(--color-secondary-100);
  }

  :global(.toggle-button) {
    flex-shrink: 0;
  }
</style>
