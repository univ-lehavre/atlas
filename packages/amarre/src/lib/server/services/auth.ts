import type { Cookies } from '@sveltejs/kit';
import { ID, type Models } from 'node-appwrite';

import { SESSION_COOKIE } from '$lib/constants';
import { PUBLIC_LOGIN_URL } from '$env/static/public';
import { createAdminClient, createSessionClient } from '$lib/server/appwrite';
import {
  validateMagicUrlLogin,
  validateSignupEmail,
  validateUserId,
} from '$lib/server/validators/auth';
import { fetchUserId } from './surveys';
import type { Fetch } from '$lib/types';

export const signupWithEmail = async (
  unsecuredEmail: unknown,
  { fetch }: { fetch: Fetch }
): Promise<Models.Token> => {
  // Validate email
  const email: string = await validateSignupEmail(unsecuredEmail);

  // Fix redirect URL
  const url: string = `${PUBLIC_LOGIN_URL}/login`;

  // Create magic URL token
  const { account } = createAdminClient();
  let userId: string;
  try {
    const id = await fetchUserId(email, { fetch });
    userId = id ?? ID.unique();
  } catch (error) {
    console.error('Failed to fetch user ID from REDCap in signupWithEmail:', error);
    userId = ID.unique();
  }
  const token: Models.Token = await account.createMagicURLToken({ userId, email, url });

  return token;
};

export const login = async (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => {
  // Validate inputs
  const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

  // Create session
  const { account } = createAdminClient();
  const session: Models.Session = await account.createSession({ userId, secret });
  cookies.set(SESSION_COOKIE, session.secret, {
    sameSite: 'strict',
    expires: new Date(session.expire),
    secure: true,
    path: '/',
  });

  return session;
};

export const logout = async (unsecuredUserId: unknown, cookies: Cookies): Promise<void> => {
  // Validate userId
  validateUserId(unsecuredUserId);

  // Delete all sessions for the user
  const { account } = createSessionClient(cookies);
  await account.deleteSessions();
  cookies.delete(SESSION_COOKIE, { path: '/' });
};
