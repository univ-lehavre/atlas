import { createSignupHandler } from '@univ-lehavre/atlas-auth';

import { signupWithEmail } from '$lib/server/services/authService';
import { validateSignupEmail } from '$lib/validators/server/auth';

// Spécificités ecrin :
//   - le formulaire poste un `multipart/form-data` (pas du JSON comme amarre)
//   - validateSignupEmail est local (lookup async `isAlliance`)
//   - signupWithEmail attend `{ fetch, cookies }`
//
// La factory ajoute `createdAt` à la réponse (vs `{ data: { signedUp: true } }`
// précédemment). Champ supplémentaire purement additif — non-breaking.
export const POST = createSignupHandler({
  extractEmail: async (request) => {
    const form = await request.formData();
    return String(form.get('email') || '').trim();
  },
  validateEmail: validateSignupEmail,
  signupWithEmail: (email, event) =>
    signupWithEmail(email, { fetch: event.fetch, cookies: event.cookies }),
});
