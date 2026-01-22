import type { Handle } from '@sveltejs/kit';

/**
 * Server hooks for ecrin
 * Reads authentication headers injected by Authelia after forward-auth
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Headers injected by Authelia after successful forward-auth
  const username = event.request.headers.get('remote-user');
  const email = event.request.headers.get('remote-email');
  const name = event.request.headers.get('remote-name');
  const groups = event.request.headers.get('remote-groups');

  if (username && email) {
    event.locals.user = {
      username,
      email,
      name: name ?? undefined,
      groups: groups?.split(',').map((g) => g.trim()) ?? [],
    };
  }

  return resolve(event);
};
