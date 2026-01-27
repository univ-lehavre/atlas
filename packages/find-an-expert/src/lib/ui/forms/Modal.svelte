<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Modal - Generic modal dialog component
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/Modal.
   *
   * @example
   * ```svelte
   * <Modal bind:open title="Confirmation" closeLabel="Close">
   *   <p>Are you sure?</p>
   * </Modal>
   * ```
   */
  interface Props {
    /** Whether the modal is open */
    open?: boolean;
    /** Modal title */
    title: string;
    /** Close button aria-label */
    closeLabel: string;
    /** Callback when modal is closed */
    onclose?: () => void;
    /** Modal body content */
    children: Snippet;
    /** Optional footer content */
    footer?: Snippet;
  }

  let { open = $bindable(false), title, closeLabel, onclose, children, footer }: Props = $props();

  const closeModal = (): void => {
    open = false;
    onclose?.();
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-secondary-900/50 z-40"
    onclick={closeModal}
    onkeydown={(e) => e.key === 'Enter' && closeModal()}
    role="button"
    tabindex="-1"
    aria-label={closeLabel}
  ></div>

  <!-- Modal Container -->
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <!-- Modal Content -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="relative rounded-lg shadow-xl overflow-hidden bg-white dark:bg-secondary-800"
        style="width: min(28rem, calc(100vw - 2rem))"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700"
        >
          <h2 id="modal-title" class="text-lg font-semibold text-secondary-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            class="transition-colors p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
            onclick={closeModal}
            aria-label={closeLabel}
          >
            <Icon icon="lucide:x" width="20" height="20" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 text-secondary-600 dark:text-secondary-400">
          {@render children()}
        </div>

        <!-- Footer -->
        {#if footer}
          <div
            class="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900"
          >
            {@render footer()}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
