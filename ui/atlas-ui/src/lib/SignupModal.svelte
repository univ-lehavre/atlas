<script lang="ts">
  interface Props {
    /** Two-way binding for the visibility of the dialog. Set to `true`
     *  to open programmatically ; the component sets it back to `false`
     *  when the user closes via ESC, the backdrop, or the close button. */
    open?: boolean;
    /** Callback invoked when the user submits a syntactically valid
     *  email. Should return a promise that resolves on success (the
     *  modal then closes) or rejects (the modal stays open and the
     *  error message is surfaced). */
    onSubmit: (email: string) => void | Promise<void>;
    /** Optional override of the heading copy. */
    title?: string;
    /** Optional override of the descriptive paragraph above the field. */
    description?: string;
  }

  let {
    open = $bindable(false),
    onSubmit,
    title = "Discover more profiles",
    description = "Enter your email address and we will send you a magic link to sign in.",
  }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let email = $state("");
  let submitting = $state(false);
  let errorMessage = $state<string | undefined>();
  let isValidEmail = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  // Sync `open` prop with the imperative <dialog> API. Native dialog
  // exposes show/close but no reactive `open` setter — the attribute
  // alone does not trigger the showModal() effect we want.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function handleClose() {
    open = false;
    // Reset the transient state when the modal goes away.
    submitting = false;
    errorMessage = undefined;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!isValidEmail || submitting) return;
    submitting = true;
    errorMessage = undefined;
    try {
      await onSubmit(email);
      email = "";
      open = false;
    } catch (err) {
      errorMessage =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Réessayez.";
    } finally {
      submitting = false;
    }
  }
</script>

<dialog bind:this={dialog} onclose={handleClose}>
  <form onsubmit={handleSubmit}>
    <header>
      <h2>{title}</h2>
      <button
        type="button"
        class="close"
        aria-label="Fermer"
        onclick={() => (open = false)}
      >
        ×
      </button>
    </header>
    <p class="description">{description}</p>
    <label>
      <span>Email</span>
      <input
        type="email"
        bind:value={email}
        required
        autocomplete="email"
        placeholder="you@example.org"
        disabled={submitting}
      />
    </label>
    {#if errorMessage}
      <p class="error" role="alert">{errorMessage}</p>
    {/if}
    <div class="actions">
      <button
        type="button"
        class="secondary"
        onclick={() => (open = false)}
        disabled={submitting}
      >
        Annuler
      </button>
      <button
        type="submit"
        class="primary"
        disabled={!isValidEmail || submitting}
      >
        {submitting ? "Envoi…" : "Envoyer le lien"}
      </button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    border: none;
    border-radius: 0.75rem;
    padding: 0;
    max-width: 28rem;
    width: calc(100% - 2rem);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  dialog::backdrop {
    background: rgba(10, 37, 64, 0.55);
    backdrop-filter: blur(2px);
  }
  form {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #0a2540;
  }
  .close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 1.75rem;
    height: 1.75rem;
  }
  .close:hover,
  .close:focus-visible {
    color: #0a2540;
  }
  .description {
    margin: 0;
    color: #4b5563;
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  label span {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }
  input {
    padding: 0.625rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-family: inherit;
  }
  input:focus {
    outline: none;
    border-color: #0a2540;
    box-shadow: 0 0 0 3px rgba(10, 37, 64, 0.15);
  }
  .error {
    margin: 0;
    color: #b91c1c;
    font-size: 0.875rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  .actions button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 0.9375rem;
  }
  .primary {
    background: #0a2540;
    color: white;
  }
  .primary:hover:not(:disabled),
  .primary:focus-visible:not(:disabled) {
    background: #1e3a8a;
  }
  .primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  .secondary {
    background: white;
    color: #1f2937;
    border-color: #d1d5db;
  }
  .secondary:hover:not(:disabled),
  .secondary:focus-visible:not(:disabled) {
    background: #f3f4f6;
  }
  .secondary:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }
</style>
