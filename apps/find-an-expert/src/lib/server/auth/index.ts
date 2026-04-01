/**
 * Authentication module
 * Handles magic link authentication with Appwrite.
 */

// Service functions
export { signupWithEmail, login, logout } from './service';

// Validators
export {
  validateMagicUrlLogin,
  validateUserId,
  ensureJsonContentType,
  parseJsonBody,
  checkRequestBody,
} from './validators';
