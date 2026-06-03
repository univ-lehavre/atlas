---
title: Tests
---

Atlas s'appuie sur une **pyramide de tests** : on écrit beaucoup de petits tests rapides à la base, et peu de gros tests lents au sommet. Cette répartition garantit qu'on peut faire confiance au code sans payer un temps d'exécution énorme à chaque modification.

## La pyramide à cinq niveaux

| Niveau                  | Outil                                                  | Quoi                                                             | Coût d'exécution      |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | --------------------- |
| **1. Unitaires**        | [vitest](https://vitest.dev/)                          | Logique pure ; chaque fonction testée isolément avec des _mocks_ | ms par test           |
| **2. Intégration**      | vitest                                                 | Modules combinés (par exemple : route HTTP → service → repo)     | dizaines de ms        |
| **3. Contrats REDCap**  | vitest, _self-skipping_                                | Vérifient que le client REDCap parle bien à une instance REDCap  | ~secondes             |
| **4. Authentification** | vitest, _self-skipping_                                | Flux complet de _magic link_ contre une instance Appwrite locale | ~secondes             |
| **5. Smoke end-to-end** | [Playwright](https://playwright.dev/), _self-skipping_ | Parcours utilisateur complet dans un navigateur réel             | ~dizaines de secondes |

> **Trois outils externes apparaissent ici.** [**REDCap**](/atlas/glossary/) est la plateforme généraliste de saisie de formulaires structurés qu'Atlas pilote ; [**Appwrite**](/atlas/glossary/) est le _backend-as-a-service_ qui gère l'authentification et le stockage ; [**Docker**](/atlas/glossary/) est la plateforme de conteneurs qui fait tourner ces deux services en local, à l'identique sur chaque machine. Les définitions complètes sont au [glossaire](/atlas/glossary/).

Les niveaux 3, 4 et 5 sont dits _self-skipping_ : ils se désactivent automatiquement quand l'environnement requis (REDCap local, Appwrite local, navigateur Playwright) n'est pas démarré. Cela permet à un contributeur sans Docker installé de lancer `pnpm test` sans erreur — les tests adaptés s'exécutent, les autres sont skippés avec un message clair.

## Lancer les tests

```bash
# Tous les tests, à travers tous les sous-projets
pnpm test

# Avec mesure de couverture
pnpm test:coverage

# Sur un sous-projet précis
pnpm -F @univ-lehavre/atlas-crf-client test
```

## Mesure de couverture

La **couverture de code** indique quelle proportion du code source est exécutée par les tests (lignes, branches, fonctions). Atlas la mesure avec `@vitest/coverage-v8`.

```bash
pnpm test:coverage           # Exécute les tests + agrège la couverture
pnpm coverage:report         # Rapport consolidé (script maison)
```

Le rapport agrégé s'écrit dans `coverage/` à la racine de chaque sous-projet, au format HTML et JSON. Le script `coverage-report.mjs` produit en plus un résumé tabulaire dans le terminal.

## Où écrire un test

| Type de code                             | Où placer le test                                      |
| ---------------------------------------- | ------------------------------------------------------ |
| Fonction utilitaire dans `packages/foo/` | `packages/foo/src/<module>.test.ts`                    |
| Route HTTP dans `services/crf/`          | `services/crf/src/<route>.test.ts`                     |
| Composant Svelte dans `ui/atlas-ui/`     | `ui/atlas-ui/src/<component>.test.ts`                  |
| Parcours utilisateur dans `apps/<app>/`  | `apps/<app>/tests/e2e/<scenario>.spec.ts` (Playwright) |

Les fichiers `*.test.ts` et `*.spec.ts` bénéficient de règles ESLint relâchées (mocks, assertions, `any` autorisé en local) — voir [Style de code → Fichiers de test](/atlas/quality/code-style/#fichiers-de-test).

## Convention pour les _self-skipping_

Un test _self-skipping_ commence par une vérification d'environnement et sort proprement si la dépendance manque :

```ts
import { describe, it, beforeAll } from "vitest";

const REDCAP_AVAILABLE = process.env.REDCAP_URL !== undefined;

describe.skipIf(!REDCAP_AVAILABLE)("REDCap contract", () => {
  it("exports records", async () => {
    // …
  });
});
```

Au lieu d'échouer, le test est marqué _skipped_ avec un libellé clair dans le rapport. La CI distingue les vrais skips (intentionnels) des échecs (à corriger).
