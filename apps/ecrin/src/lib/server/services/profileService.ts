import { BaasUserRepository } from '$lib/baas/server/userRepository';

// Service métier: s'appuie sur le repository de domaine
const userRepo = new BaasUserRepository();

export const getProfile = async (userId: string) => userRepo.getById(userId);
