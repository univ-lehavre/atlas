import { createLogoutHandler } from '@univ-lehavre/atlas-auth';
import { logout } from '$lib/server/services/auth';

export const POST = createLogoutHandler({ logout });
