import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { validateMagicUrlLogin, signupWithEmail } from '$lib/server/auth';
import { ApplicationError } from '$lib/server/http';

/**
 * Load function for the login page.
 * Handles two scenarios:
 * 1. Magic link callback (with userId and secret params) - validates and redirects
 * 2. Direct access (no params) - shows the login form
 */
export const load: PageServerLoad = async ({ url, fetch, locals }) => {
  // If already logged in, redirect to dashboard
  if (locals.userId) {
    redirect(302, '/dashboard');
  }

  const unsecuredSecret = url.searchParams.get('secret');
  const unsecuredUserId = url.searchParams.get('userId');

  // No magic link params - show login form
  if (!unsecuredUserId && !unsecuredSecret) {
    return { isMagicLinkCallback: false };
  }

  // Magic link callback - validate and login
  try {
    const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, secret }),
    });

    if (!response.ok) {
      return {
        isMagicLinkCallback: true,
        error: true,
        code: 'invalid_magic_link',
      };
    }

    redirect(302, '/dashboard');
  } catch (error) {
    if (error instanceof ApplicationError) {
      return {
        isMagicLinkCallback: true,
        error: true,
        code: error.code,
      };
    }
    // Re-throw redirect errors
    throw error;
  }
};

/**
 * Form actions for authentication on login page.
 */
export const actions = {
  signup: async ({ request }) => {
    const data: FormData = await request.formData();
    const email: unknown = data.get('email')?.toString().trim();

    try {
      await signupWithEmail(email);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof ApplicationError) {
        return fail(error.httpStatus, {
          error: true,
          code: error.code,
        });
      }
      return fail(500, {
        error: true,
        code: 'signup_failed',
      });
    }
  },
} satisfies Actions;
