import type { Actions } from './$types';

import type { PageServerLoad } from './$types';
import type { TUser } from '$lib/types/api/user';

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const userId = locals.userId;
  if (!userId) return { pushed: null, url: null, user: null };
  const user = (await fetch('/api/v1/me').then((res) => res.json())) as { data: TUser } | null;
  const pushed = (await fetch(`/api/v1/account/pushed`).then((res) => res.json())) as {
    data: unknown;
  } | null;
  const url = (await fetch(`/api/v1/surveys/url`).then((res) => res.json())) as {
    data: { url: string };
  } | null;
  const result = { pushed: pushed?.data, url: url?.data?.url ?? null, user: user?.data };
  return result;
};

export const actions = {
  subscribe: (event) => event.fetch(`/api/v1/account/push`).then((res) => res.json()),
  signup: async (event) => {
    const form = await event.request.formData();
    return event
      .fetch(`/api/v1/auth/signup`, { method: 'POST', body: form })
      .then((res) => res.json());
  },
  logout: (event) =>
    event.fetch(`/api/v1/auth/logout`, { method: 'POST' }).then((res) => res.json()),
  deleteSurvey: (event) => event.fetch(`/api/v1/surveys/delete`).then((res) => res.json()),
  deleteAuth: (event) => event.fetch(`/api/v1/auth/delete`).then((res) => res.json()),
} satisfies Actions;
