# Tests

_(à rédiger pour un public non-expert dans une PR ultérieure)_

Atlas s'appuie sur une **pyramide de tests à 5 niveaux** pour garantir que les changements n'introduisent pas de régression :

1. **Unitaires** (vitest) — logique pure, mocks complets
2. **Intégration** (vitest) — composants traversant plusieurs modules
3. **REDCap** (vitest, self-skipping) — contrats avec un REDCap local
4. **Auth magic-link** (vitest, self-skipping) — flux Appwrite local
5. **Smoke e2e** (Playwright, self-skipping) — parcours utilisateur complet

Les suites « self-skipping » se désactivent automatiquement quand la sandbox n'est pas démarrée, pour ne pas bloquer la CI ni le développeur sans Docker.
