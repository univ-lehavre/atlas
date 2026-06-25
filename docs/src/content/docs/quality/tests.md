---
title: Tests
---

**Pourquoi des tests ?** Un test est un bout de code qui vérifie automatiquement qu'un autre bout de code fait bien ce qu'il prétend. Sans tests, chaque modification est un pari : on ne sait pas si elle casse quelque chose ailleurs, et la peur de casser fige le code. Avec des tests, on modifie sereinement — la suite signale immédiatement une régression (un comportement correct qui redevient faux). Pour une base de code vouée à durer et à être reprise par d'autres, les tests sont le filet qui rend les refactorisations sûres, documentent le comportement attendu, et permettent à la CI de bloquer une régression _avant_ qu'elle n'atteigne `main`. C'est ce qui justifie l'ingénierie décrite ci-dessous.

Atlas s'appuie pour cela sur une **pyramide de tests** : un classement des tests par coût et par portée. On écrit beaucoup de petits tests rapides à la base, et peu de gros tests lents au sommet. Cette répartition garantit qu'on peut faire confiance au code sans payer un temps d'exécution énorme à chaque modification.

## Périmètre testé : tout le code exécutable

Atlas teste **tout type de code exécutable**, pas seulement les fonctions internes. Concrètement :

- **Fonctions et modules** des paquets (`packages/`) : logique métier, utilitaires, validateurs.
- **Services HTTP** (`services/`) : routes, en passant par la chaîne route → service → dépôt.
- **Composants d'interface** (`ui/`) : composants Svelte rendus et vérifiés.
- **Applications** (`apps/`) : tests intra-app (projets vitest unit/ui/integration) ; le parcours utilisateur de bout en bout dans un vrai navigateur vit, lui, dans les sandbox dédiées (`sandbox/<app>-sandbox/`, voir le tableau plus bas).
- **Outils en ligne de commande** (`cli/`) : les CLI sont testées comme les paquets dont elles dépendent.
- **Pipelines de données** (`dataops/`) : code Python (Dagster/dbt) testé avec [**pytest**](https://docs.pytest.org/) (le cadre de tests standard de Python), couverture à seuil (`--cov-fail-under=90`), property-based testing ([**Hypothesis**](https://hypothesis.readthedocs.io/), voir plus bas) et asset checks [**Great Expectations**](https://greatexpectations.io/) (validations déclaratives de qualité des données posées sur les actifs Dagster).

Autrement dit, du plus petit utilitaire jusqu'à l'application complète, chaque couche a ses tests ; le tableau « [Où écrire un test](#où-écrire-un-test) » plus bas indique où chacun vit.

### Pipelines de données (`dataops/`) : une chaîne d'outillage distincte

Le répertoire `dataops/` est en **Python natif** ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)) : il est **hors du graphe pnpm** et **hors du périmètre vitest/ESLint/Prettier/TypeScript**. Sa chaîne d'outillage lui est propre — `ruff` (linter et formateur Python) et `pytest`, avec un seuil de couverture **bloquant** (`--cov-fail-under=90`). Le property-based testing y est assuré par **Hypothesis** ([ADR 0072](/atlas/decisions/0072-property-based-testing-dataops-python/)) et la qualité des données par les **asset checks Great Expectations** sur les actifs Dagster. En intégration continue, le job « DataOps quality (ruff + pytest + coverage + manifests) » exécute cette chaîne indépendamment de la suite Node.

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

### Le modèle général : la base (tests unitaires)

C'est la base qui porte la pyramide : la grande majorité des tests sont **unitaires**, et ils suivent partout le **même modèle**. Une fonction est testée isolément ; ses dépendances externes (réseau, base de données, horloge…) sont remplacées par des _mocks_ (objets factices qui imitent le comportement attendu) ou, dans le code Effect, par des _layers_ de test ; on appelle la fonction avec une entrée connue et on vérifie sa sortie. Rapides (de l'ordre de la milliseconde) et sans dépendance externe, ils s'exécutent à chaque commit. Ce modèle est le plus courant — un test **par l'exemple** : on choisit soi-même les cas (entrée connue → sortie attendue) — mais il n'est pas le seul ; le _property-based testing_ ci-dessous le complète au même niveau. Tout paquet qui s'écarte de ce modèle général — montage particulier, fixture lourde, convention propre — le documente dans le **`README.md` de son paquet**, là où vit la spécificité ; cette page ne décrit que le cas général.

### Une technique transverse : le property-based testing

Le **property-based testing** (PBT, « tests par propriétés ») n'est pas un sixième niveau de la pyramide : c'est une **technique** qui s'applique au niveau **unitaire**. Au lieu d'écrire des exemples choisis à la main, on déclare une **propriété** que la fonction doit respecter pour _toute_ entrée valide (par exemple : « décoder puis encoder redonne l'entrée d'origine »), et l'outil génère automatiquement des centaines de cas — y compris des cas-limites qu'on n'aurait pas pensé à écrire — puis réduit tout contre-exemple trouvé à sa forme minimale. C'est complémentaire des tests par l'exemple, pas un remplacement. Atlas l'emploie des deux côtés de la frontière de langage : **fast-check** côté TypeScript et **Hypothesis** côté Python ([ADR 0072](/atlas/decisions/0072-property-based-testing-dataops-python/)).

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

La **couverture de code** indique quelle proportion du code source est exécutée par les tests : pour quatre métriques distinctes — **lignes**, **branches** (les embranchements `if`/`else`, ternaires…), **fonctions** et **instructions** (_statements_) —, le pourcentage du total qui a effectivement été parcouru pendant les tests. Atlas la mesure avec `@vitest/coverage-v8`.

```bash
pnpm test:coverage           # Exécute les tests + agrège la couverture
pnpm coverage:report         # Rapport consolidé (script maison)
```

Le rapport s'écrit dans `coverage/` à la racine de chaque sous-projet, au format HTML et JSON. Le script `coverage:report` (`scripts/audit/coverage-report.mjs`) produit en plus un résumé tabulaire dans le terminal.

### Seuils et chiffres réels

Atlas ne fixe pas un chiffre unique pour tout le dépôt : **chaque paquet déclare ses propres seuils** dans son `vitest.config.ts`, et la suite **échoue** si la couverture passe sous l'un d'eux. C'est cette barre, propre à chaque paquet, qui est la « couverture réelle » exigée — un paquet à 100 % et un autre plus jeune à 50 % cohabitent, chacun tenu à son niveau.

| Paquet                       | Statements | Branches | Functions | Lines |
| ---------------------------- | ---------: | -------: | --------: | ----: |
| `packages/sveltekit-handler` |        100 |      100 |       100 |   100 |
| `packages/effect-socle`      |        100 |      100 |       100 |   100 |
| `cli/biblio`                 |         95 |       95 |        95 |    95 |
| `cli/citation`               |         95 |       90 |        93 |    95 |
| `packages/citation`          |         90 |       90 |        90 |    90 |
| `cli/crf`                    |         62 |       62 |        76 |    60 |
| `cli/net`                    |         48 |       42 |        38 |    49 |

> Extrait des `vitest.config.ts` (instantané au 7 juin 2026, non exhaustif) ; la liste complète et à jour est dans les fichiers de configuration de chaque paquet. Les seuils montent au fil du temps : ils encadrent le code existant sans figer un paquet récent à un niveau qu'il ne tient pas encore.

Le chiffre **consolidé et vivant** n'est pas recopié ici (il deviendrait faux à la première modification) : il est produit par `pnpm coverage:report` et vérifié en CI. Le script vise par défaut **80 %** par paquet (option `--strict` pour lister les fichiers à 0 %). En intégration continue, la commande `pnpm test:coverage` est un point de contrôle bloquant — du _hook_ pre-push (voir [Hooks Git](/atlas/quality/hooks/#pre-push-plus-lent)) jusqu'à la suite `ci:checks` — : une couverture sous les seuils empêche l'intégration dans `main`.

## Où écrire un test

| Type de code                             | Où placer le test                                                 |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Fonction utilitaire dans `packages/foo/` | `packages/foo/src/<module>.test.ts`                               |
| Route HTTP dans `services/crf/`          | `services/crf/src/<route>.test.ts`                                |
| Composant Svelte dans `ui/atlas-ui/`     | `ui/atlas-ui/src/<component>.test.ts`                             |
| Tests intra-app dans `apps/<app>/`       | `apps/<app>/tests/{unit,ui,integration}/` (projets vitest)        |
| Smoke utilisateur de bout en bout        | `sandbox/<app>-sandbox/tests/e2e/<scenario>.spec.ts` (Playwright) |

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
