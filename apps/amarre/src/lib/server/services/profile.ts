import { BaasUserRepository } from '$lib/server/baas/userRepository';

// Service métier : s'appuie sur le repository de domaine. Instancié à l'APPEL
// (et non à l'import) — le constructeur lit la clé Appwrite via `adminConfig()`
// → `$lib/server/env` (late-binding 12-factor, ADR 0045). Mémoïsé pour conserver
// un repository unique par process.
let userRepoInstance: BaasUserRepository | undefined;
const userRepo = (): BaasUserRepository => (userRepoInstance ??= new BaasUserRepository());

export const getProfile = async (userId: string) => userRepo().getById(userId);
