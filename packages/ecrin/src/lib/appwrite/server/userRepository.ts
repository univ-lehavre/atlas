import { createAdminClient } from '$lib/appwrite/server';
import type { UserRepository, TUser } from '$lib/types/api/user';
import type { Models } from 'node-appwrite';

// Adaptateur Appwrite pour le domaine UserRepository
export class AppwriteUserRepository implements UserRepository {
  async getById(userId: string): Promise<TUser> {
    const { users } = createAdminClient();
    try {
      const user: Models.User = await users.get({ userId });
      if (!user) return { id: userId, email: null, labels: [] };
      return { id: user.$id, email: user.email ?? null, labels: user.labels ?? [] };
    } catch (error) {
      console.error('AppwriteUserRepository.getById error', error);
      // Normalisation d'erreur: on renvoie un profil minimal pour que l'appelant puisse continuer.
      return { id: userId, email: null, labels: [] };
    }
  }
}
