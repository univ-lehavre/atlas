// Level-1 UI test : Signup + CreateRequest modal forms.
//
// We don't drive Bootstrap's modal JS here (that's level 5 territory).
// We mount the components directly and assert on the rendered DOM —
// form action attributes, input bindings, submit-disabled state and
// the success/error alerts driven by `form?.data` / `form?.wrongSignupEmail`.

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

// Bootstrap modals (.modal.fade) carry `aria-hidden="true"` on the root.
// Testing Library hides elements behind aria-hidden by default; we pass
// `{ hidden: true }` so the queries reach inside the modal scaffold.
const inModal = { hidden: true } as const;

import Signup from '$lib/ui/Signup.svelte';
import CreateRequest from '$lib/ui/CreateRequest.svelte';
import { signupSuccess, signupWrongEmail } from '../fixtures/forms';

describe('Signup.svelte', () => {
  it('renders the modal scaffold with form pointing at ?/signup', () => {
    const { container } = render(Signup, { form: null });
    const modal = container.querySelector('#SignUp');
    expect(modal).not.toBeNull();
    const formEl = modal!.querySelector('form');
    expect(formEl).not.toBeNull();
    expect(formEl!.getAttribute('action')).toBe('?/signup');
    expect(formEl!.getAttribute('method')).toBe('post');
  });

  it('starts with the submit button disabled until a valid email is typed', async () => {
    const { container } = render(Signup, { form: null });
    const submit = screen.getByRole('button', { name: /s'authentifier/i, ...inModal });
    expect(submit).toHaveClass('disabled');

    const input = container.querySelector('#email') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'someone@univ-lehavre.fr' } });

    expect(submit).not.toHaveClass('disabled');
  });

  it('keeps submit disabled when the input is not a valid email', async () => {
    const { container } = render(Signup, { form: null });
    const submit = screen.getByRole('button', { name: /s'authentifier/i, ...inModal });
    const input = container.querySelector('#email') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'not-an-email' } });
    expect(submit).toHaveClass('disabled');
  });

  it('shows the success alert when form.data is present', () => {
    const { container } = render(Signup, { form: signupSuccess });
    expect(container).toHaveTextContent(/courriel d'authentification vous a été envoyé/i);
  });

  it('shows the error alert when form.wrongSignupEmail is true', () => {
    // Signup.svelte renders the error using `form.message` + `form.cause`.
    // We supply both so the rendered text is non-empty.
    const { container } = render(Signup, {
      form: { ...signupWrongEmail, cause: 'invalid_email' },
    });
    const danger = container.querySelector('.alert-danger');
    expect(danger).not.toBeNull();
    expect(danger).toHaveTextContent(/email invalide/i);
  });

  it('renders no alert when form is null', () => {
    const { container } = render(Signup, { form: null });
    expect(container.querySelector('.alert-success')).toBeNull();
    expect(container.querySelector('.alert-danger')).toBeNull();
  });

  it('renders no alert when form is undefined', () => {
    const { container } = render(Signup, { form: undefined });
    expect(container.querySelector('.alert-success')).toBeNull();
    expect(container.querySelector('.alert-danger')).toBeNull();
  });

  it('keeps submit disabled when the email input is empty', () => {
    render(Signup, { form: null });
    const submit = screen.getByRole('button', { name: /s'authentifier/i, ...inModal });
    expect(submit).toHaveClass('disabled');
  });
});

describe('Signup trigger ↔ modal contract', () => {
  // Bootstrap JS handles the actual open/close (data-bs-toggle="modal"
  // + data-bs-target="#SignUp"). We can't drive that here without a
  // real browser — that lives in the level-5 Playwright smoke test.
  //
  // What we CAN check at level 1 is the static contract: the modal
  // must exist with the exact id (#SignUp) that the triggers in
  // Collaborate.svelte and Administrate.svelte declare via
  // `data-bs-target="#SignUp"`. If the modal id ever drifts, level 1
  // catches it before level 5 even has a chance to run.
  //
  // We don't render Administrate / Collaborate themselves here —
  // they pull in `$app/paths` and other SvelteKit-server-only
  // modules that aren't trivially mockable in happy-dom. Those flows
  // are covered by the level-5 smoke test (real Bootstrap + real
  // browser navigation).

  it('Signup.svelte exposes a modal with id="SignUp" (matches data-bs-target in triggers)', () => {
    const { container } = render(Signup, { form: null });
    const modal = container.querySelector('#SignUp');
    expect(modal).not.toBeNull();
    expect(modal!.classList.contains('modal')).toBe(true);
  });

  it('Signup.svelte modal carries the close button with data-bs-dismiss="modal"', () => {
    const { container } = render(Signup, { form: null });
    const closeBtn = container.querySelector('#SignUp [data-bs-dismiss="modal"]');
    expect(closeBtn).not.toBeNull();
  });
});

describe('CreateRequest.svelte', () => {
  it('renders the modal scaffold with form pointing at ?/newSurvey', () => {
    const { container } = render(CreateRequest);
    const modal = container.querySelector('#CreateRequest');
    expect(modal).not.toBeNull();
    const formEl = modal!.querySelector('form');
    expect(formEl).not.toBeNull();
    expect(formEl!.getAttribute('action')).toBe('?/newSurvey');
  });

  it('keeps the submit button disabled until the consent checkbox is ticked', async () => {
    render(CreateRequest);
    const submit = screen.getByRole('button', { name: /créer une demande/i, ...inModal });
    const checkbox = screen.getByRole('checkbox', inModal);

    expect(submit).toHaveClass('disabled');
    await fireEvent.click(checkbox);
    expect(submit).not.toHaveClass('disabled');
  });
});
