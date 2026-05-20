// SvelteKit form-action result fixtures.
//
// Components like Signup.svelte read `form` prop and react to:
//   - `form?.data` → render the success alert
//   - `form?.wrongSignupEmail` → render the error alert
// We expose typed-ish helpers so tests don't accidentally drift from
// the contract.

export const signupSuccess = {
  data: { signedUp: true, createdAt: '2026-01-01T00:00:00.000Z' },
};

export const signupWrongEmail = {
  wrongSignupEmail: true,
  code: 'invalid_email',
  message: 'Email invalide',
};

export const signupRateLimited = {
  wrongSignupEmail: true,
  code: 'rate_limited',
  message: 'Trop de tentatives',
};
