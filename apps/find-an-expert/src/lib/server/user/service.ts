import { ADMIN_LABEL } from '$lib/constants';
import { BaasUserRepository } from './repository';
import type { TUser } from './types';

// Instancié à l'APPEL (et non à l'import) : le constructeur lit les secrets
// Appwrite via `adminConfig()` → `$lib/server/env` (late-binding 12-factor,
// ADR 0045). Un `new BaasUserRepository()` top-level lirait les secrets à
// l'import du module. Mémoïsé pour conserver un repository unique par process.
let userRepoInstance: BaasUserRepository | undefined;
const userRepo = (): BaasUserRepository => (userRepoInstance ??= new BaasUserRepository());

/**
 * Retrieves a user profile by their ID.
 * @param userId - The unique identifier of the user
 * @returns A promise resolving to the user profile
 */
export const getProfile = async (userId: string): Promise<TUser> => userRepo().getById(userId);

/**
 * Checks if a user has the admin label.
 * @param user - The user to check, or null if not authenticated
 * @returns True if the user has the admin label
 */
export const isAdmin = (user: TUser | null): boolean => {
  if (!user) return false;
  return user.labels.includes(ADMIN_LABEL);
};
