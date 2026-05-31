import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import SignupModal from '@univ-lehavre/atlas-ui/SignupModal.svelte';

afterEach(cleanup);

// happy-dom's <dialog> exposes show/showModal/close, but `dialog.open`
// is not a reactive setter — the component drives the imperative API
// via $effect. For the visibility assertions below we read the actual
// `open` attribute that show/close toggles.

describe('<SignupModal>', () => {
  it('opens the dialog when the open prop is true', async () => {
    const { container } = render(SignupModal, {
      open: true,
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
  });

  it('keeps the dialog closed when open is false', async () => {
    const { container } = render(SignupModal, {
      open: false,
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    // The dialog should never have been shown.
    expect(dialog.open).toBe(false);
  });

  it('calls onSubmit with the typed email and closes on success', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(SignupModal, {
      open: true,
      onSubmit,
      onClose: vi.fn(),
    });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    const input = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'someone@example.org' } });
    const form = dialog.querySelector('form') as HTMLFormElement;
    await fireEvent.submit(form);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('someone@example.org'));
  });

  it('keeps the submit button disabled for an invalid email', async () => {
    const { container } = render(SignupModal, {
      open: true,
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    const input = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'not-an-email' } });
    const submit = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('surfaces the error message when onSubmit throws', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('Domaine non autorisé');
    });
    const { container } = render(SignupModal, {
      open: true,
      onSubmit,
      onClose: vi.fn(),
    });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    const input = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'someone@example.org' } });
    const form = dialog.querySelector('form') as HTMLFormElement;
    await fireEvent.submit(form);
    await waitFor(() => {
      const alert = dialog.querySelector('.alert-danger');
      expect(alert?.textContent).toContain('Domaine non autorisé');
    });
  });
});
