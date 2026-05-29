import { createLoginHandler } from '@univ-lehavre/atlas-auth';
import { login } from '$lib/server/services/auth';

export const POST = createLoginHandler({ login });
