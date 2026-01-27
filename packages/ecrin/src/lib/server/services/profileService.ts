import { AppwriteUserRepository } from '$lib/appwrite/server/userRepository';

// Service métier: s'appuie sur le repository de domaine
const userRepo = new AppwriteUserRepository();

export const getProfile = async (userId: string) => userRepo.getById(userId);
