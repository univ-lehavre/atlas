import { createAdminClient } from '$lib/server/appwrite';
import type { UserRepository, TUser } from './types';
import type { Models } from 'node-appwrite';

/**
 * Appwrite implementation of the UserRepository interface.
 * Fetches user data from Appwrite Users API.
 */
export class AppwriteUserRepository implements UserRepository {
  /**
   * Retrieves a user by their ID from Appwrite.
   * @param userId - The unique identifier of the user
   * @returns The user data, or a minimal profile if fetch fails
   */
  async getById(userId: string): Promise<TUser> {
    const { users } = createAdminClient();
    try {
      const user: Models.User = await users.get({ userId });
      if (!user) {
        return { id: userId, email: null, labels: [] };
      }
      return {
        id: user.$id,
        email: user.email ?? null,
        labels: user.labels ?? [],
      };
    } catch (error) {
      console.error('AppwriteUserRepository.getById error', error);
      return { id: userId, email: null, labels: [] };
    }
  }
}
