import { createMeHandler } from '@univ-lehavre/atlas-auth';
import { getProfile } from '$lib/server/services/profileService';

// La factory remplace le précédent handler qui (a) loggait l'erreur
// brute via console.log et (b) renvoyait toujours 500 sur erreur ; elle
// passe désormais par mapErrorToApiResponse — les ApplicationError
// remontent avec leur vrai statut HTTP.
export const GET = createMeHandler({ getProfile });
