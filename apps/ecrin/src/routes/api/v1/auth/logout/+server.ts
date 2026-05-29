import { createLogoutHandler } from '@univ-lehavre/atlas-auth';
import { logout } from '$lib/server/services/authService';

export const POST = createLogoutHandler({ logout });
