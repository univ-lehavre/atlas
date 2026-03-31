import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
  const userId = locals.userId;
  if (!userId) redirect(302, '/');
  const response = await fetch(`/api/v1/users`).then((res) => res.json());
  const users = response.data;
  return { users, userId };
};
