/**
 * Authentication content - English.
 */

import { brand, commonLabels, pageTitle } from '$lib/content/locales/en/brand';
import type { AuthContent } from '$lib/content/types';

/**
 * English authentication content.
 */
export const en: AuthContent = {
  login: {
    title: pageTitle('Login'),
    description: `Sign in to your ${brand.ecrin} ${brand.appName} account`,
    loading: {
      title: 'Signing in...',
      message: 'Please wait while we verify your credentials.',
    },
    error: {
      title: 'Login failed',
      message: 'The login link is invalid or has expired.',
    },
    buttons: {
      retry: commonLabels.retry,
      home: commonLabels.home,
    },
  },
  form: {
    title: 'Sign in',
    description: 'Enter your professional email address to receive a secure login link.',
    emailLabel: 'Email address',
    emailPlaceholder: 'firstname.lastname@university.edu',
    emailHint: 'Only university email addresses are accepted',
    submitButton: 'Send login link',
    submitting: commonLabels.submitting,
    error: {
      prefix: 'Error:',
      default: 'An error occurred',
    },
    success: {
      title: 'Email sent!',
      message: 'A login link has been sent to you. Check your inbox.',
    },
    footer: 'By signing in, you agree to our',
    termsLink: 'terms of service',
  },
  modal: {
    title: 'Sign in to your account',
    closeLabel: 'Close',
    description:
      'To access my requests, I will authenticate. This action will store a cookie necessary for the proper functioning of the site in your browser. To delete it after authentication, simply sign out.',
    emailLabel: 'Email',
    emailPlaceholder: 'firstname.lastname@univ-lehavre.fr',
    emailHint: 'Enter your university email address',
    submitButton: 'Sign in',
    submitting: commonLabels.submitting,
    error: {
      prefix: 'Error:',
      default: 'An error occurred',
    },
    closeAlert: 'Close alert',
    success: 'An authentication email has been sent to you. Please check your inbox.',
    footer: 'By signing in, you agree to our terms of service.',
  },
  errorCodes: {
    invalid_email: 'The email address is not valid or does not belong to an allowed domain.',
    magicurl_login_validation_error: 'The login link parameters are invalid.',
    signup_failed: 'Signup failed.',
    login_failed: 'Login failed.',
    invalid_magic_link: 'The login link is invalid or has expired.',
    unexpected_error: 'An unexpected error occurred.',
  },
};
