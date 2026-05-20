// User fixtures for level-1 (component) tests.
//
// `TUser` matches the shape returned by /api/v1/me and is the contract
// the UI components consume via `data.user` on +page.svelte.
import type { TUser } from '$lib/types/api/user';

export const signedUser: TUser = {
  id: 'fixture-user-001',
  email: 'tester@univ-lehavre.fr',
  labels: [],
};

export const anonymousUser: undefined = undefined;
