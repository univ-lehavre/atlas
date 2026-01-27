<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Modal as BaseModal } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * Modal - Pre-configured modal with i18n labels.
   *
   * Wraps $lib/ui/Modal and injects accessibility labels from i18n.
   *
   * @example
   * ```svelte
   * <Modal bind:open title="Confirmation">
   *   <p>Are you sure?</p>
   * </Modal>
   * ```
   */
  interface Props {
    /** Whether the modal is open */
    open?: boolean;
    /** Modal title */
    title: string;
    /** Callback when modal is closed */
    onclose?: () => void;
    /** Modal body content */
    children: Snippet;
    /** Optional footer content */
    footer?: Snippet;
  }

  let { open = $bindable(false), title, onclose, children, footer }: Props = $props();

  const i18n = useI18n();
  const a11y = $derived(i18n.accessibility);
</script>

<BaseModal bind:open {title} closeLabel={a11y.closeModal} {onclose} {footer}>
  {@render children()}
</BaseModal>
