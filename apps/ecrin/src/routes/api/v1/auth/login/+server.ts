import { createLoginHandler } from '@univ-lehavre/atlas-auth';
import { login } from '$lib/server/services/authService';

export const POST = createLoginHandler({ login });
