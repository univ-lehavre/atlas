import { BaasUserRepository as SharedBaasUserRepository } from '@univ-lehavre/atlas-baas';
import { adminConfig } from '$lib/server/baas';

// Thin subclass autour de l'implémentation partagée pour préserver
// l'API à constructeur sans argument (consumers : `new BaasUserRepository()`).
export class BaasUserRepository extends SharedBaasUserRepository {
  constructor() {
    super(adminConfig);
  }
}
