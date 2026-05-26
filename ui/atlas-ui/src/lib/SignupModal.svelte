<script lang="ts">
  interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (email: string) => void | Promise<void>;
    title?: string;
    description?: string;
  }

  let {
    open,
    onClose,
    onSubmit,
    title = "Discover more profiles",
    description = "Enter your email address and we will send you a magic link to sign in.",
  }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let email = $state("");
  let submitting = $state(false);
  let errorMessage = $state<string | undefined>();
  let isValidEmail = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  $effect(() => {
    const shouldOpen = open;
    const el = dialog;
    if (!el) return;
    if (shouldOpen && !el.open) {
      el.showModal();
    } else if (!shouldOpen && el.open) {
      el.close();
    }
  });

  function handleClose() {
    submitting = false;
    errorMessage = undefined;
    onClose();
  }

  function requestClose() {
    onClose();
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!isValidEmail || submitting) return;
    submitting = true;
    errorMessage = undefined;
    try {
      await onSubmit(email);
      email = "";
      onClose();
    } catch (err) {
      errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
    } finally {
      submitting = false;
    }
  }
</script>

<dialog bind:this={dialog} onclose={handleClose} class="signup-dialog">
  <form onsubmit={handleSubmit} class="m-0 p-4 d-flex flex-column gap-3">
    <header class="d-flex justify-content-between align-items-start gap-3">
      <h2 class="h5 m-0 text-primary-emphasis">{title}</h2>
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        onclick={requestClose}
      ></button>
    </header>
    <p class="text-secondary small m-0">{description}</p>
    <div>
      <label for="signup-email" class="form-label small fw-semibold"
        >Email</label
      >
      <input
        id="signup-email"
        type="email"
        class="form-control"
        bind:value={email}
        required
        autocomplete="email"
        placeholder="you@example.org"
        disabled={submitting}
      />
    </div>
    {#if errorMessage}
      <div class="alert alert-danger m-0 small" role="alert">
        {errorMessage}
      </div>
    {/if}
    <div class="d-flex justify-content-end gap-2">
      <button
        type="button"
        class="btn btn-outline-secondary"
        onclick={requestClose}
        disabled={submitting}
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        disabled={!isValidEmail || submitting}
      >
        {submitting ? "Sending…" : "Send the link"}
      </button>
    </div>
  </form>
</dialog>

<style>
  /* Bootstrap fournit `.form-control`, `.btn*`, `.alert*`, `.btn-close`,
     `.h5`, etc. Le custom restant : la chrome du <dialog> natif (border,
     shadow, backdrop) que Bootstrap ne couvre pas — `.modal` Bootstrap
     suit un autre pattern (`<div class="modal fade">` + data-bs-*),
     incompatible avec notre API callback. */

  .signup-dialog {
    border: none;
    border-radius: 0.75rem;
    padding: 0;
    max-width: 28rem;
    width: calc(100% - 2rem);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  .signup-dialog::backdrop {
    background: rgba(10, 37, 64, 0.55);
    backdrop-filter: blur(2px);
  }
</style>
