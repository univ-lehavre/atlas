import { ADMIN_LABEL } from '$lib/constants';
import { AppwriteUserRepository } from './repository';
import type { TUser } from './types';

const userRepo = new AppwriteUserRepository();

/**
 * Retrieves a user profile by their ID.
 * @param userId - The unique identifier of the user
 * @returns A promise resolving to the user profile
 */
export const getProfile = async (userId: string): Promise<TUser> => userRepo.getById(userId);

/**
 * Checks if a user has the admin label.
 * @param user - The user to check, or null if not authenticated
 * @returns True if the user has the admin label
 */
export const isAdmin = (user: TUser | null): boolean => {
  if (!user) return false;
  return user.labels.includes(ADMIN_LABEL);
};
