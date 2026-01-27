import { ID, type Models } from 'node-appwrite';

import type { SignupContext } from '$lib/types/auth';
import { PUBLIC_LOGIN_URL } from '$env/static/public';
import { createAdminClient, createSessionClient } from '$lib/appwrite/server';
import { fetchUserId } from '$lib/server/services/userService';
import {
  validateMagicUrlLogin,
  validateSignupEmail,
  validateUserId,
} from '$lib/validators/server/auth';
import type { Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/constants';

export const signupWithEmail = async (
  unsecuredEmail: unknown,
  ctx: SignupContext
): Promise<Models.Token> => {
  // Validate email
  const email: string = await validateSignupEmail(unsecuredEmail);

  // Fetch REDCap user ID
  const id = await fetchUserId(ctx.fetch, email);
  const userId: string = id ?? ID.unique();

  // Fix redirect URL
  const url: string = `${PUBLIC_LOGIN_URL}/login`;

  // Create magic URL token
  const { account } = createAdminClient();
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

export const deleteUser = async (unsecuredUserId: string, cookies: Cookies): Promise<void> => {
  const userId = validateUserId(unsecuredUserId);
  await logout(userId, cookies);
  const { users } = createAdminClient();
  await users.delete({ userId });
};
