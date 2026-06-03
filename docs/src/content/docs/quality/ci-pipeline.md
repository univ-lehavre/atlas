---
title: "Pipeline d'intégration continue (CI)"
---

L'**intégration continue** (CI) désigne l'ensemble des vérifications automatiques exécutées chaque fois qu'un contributeur pousse du code. Atlas l'orchestre via **[GitHub Actions](https://github.com/features/actions)**, le service intégré à GitHub qui exécute des _workflows_ (suites de commandes décrites dans des fichiers `.github/workflows/*.yml`) sur des machines virtuelles.

Objectif : aucun code non vérifié n'entre dans `main`. Si une vérification échoue, la pull request est bloquée tant que l'auteur n'a pas corrigé.

## Vue d'ensemble

Six _workflows_ s'exécutent en parallèle à chaque pull request :

| Workflow                                                                                                           | Rôle                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [`ci.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/ci.yml)                               | Lint, typecheck, tests, build, documentation, audits                 |
| [`codeql.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/codeql.yml)                       | Analyse statique de sécurité (CodeQL)                                |
| [`gitleaks.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/gitleaks.yml)                   | Détection de secrets dans le diff                                    |
| [`dependency-review.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/dependency-review.yml) | Revue des nouvelles dépendances (versions, licences, vulnérabilités) |
| [`sbom.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/sbom.yml)                           | Génération du SBOM (inventaire détaillé des dépendances)             |
| [`zap-baseline.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/zap-baseline.yml)           | Scan dynamique OWASP ZAP (déclenchement manuel)                      |

Deux autres tournent sur `main` :

| Workflow                                                                                                                   | Rôle                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`docs.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/docs.yml)                                   | Publication du site de documentation sur GitHub Pages |
| [`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml)                             | Publication des paquets sur npm via Changesets        |
| [`dependabot-auto-merge.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/dependabot-auto-merge.yml) | Auto-merge des bumps Dependabot patch/minor           |

## Le workflow `ci.yml` en détail

`ci.yml` regroupe six _jobs_ qui s'exécutent en parallèle (sauf `build` et `docs` qui attendent les précédents) :

```
              ┌──────────┐
              │  lint    │
              ├──────────┤
push ─────▶   │ typecheck│ ─┐
              ├──────────┤  │
              │   test   │ ─┴──▶ build ─▶ docs
              ├──────────┤
              │  audit   │
              └──────────┘
```

### `lint`

Le [_lint_](../glossary) analyse le code **sans l'exécuter** pour repérer les erreurs de style et les motifs dangereux (variables non utilisées, expressions régulières coûteuses, oublis de formatage). C'est la première barrière : elle attrape les défauts les moins chers à corriger.

```bash
pnpm format:check     # Prettier vérifie le formatage
pnpm lint             # ESLint applique les règles de style/sécurité
```

### `typecheck`

Le [_typecheck_](../glossary) vérifie que tous les types TypeScript sont cohérents (une valeur déclarée comme texte n'est jamais utilisée comme nombre). Il attrape une classe entière de bugs avant même l'exécution.

```bash
pnpm typecheck        # TypeScript vérifie les types
pnpm svelte:check     # Vérification supplémentaire pour les fichiers .svelte
```

### `test`

Les **tests** exécutent le code avec des données connues pour vérifier qu'il produit le résultat attendu (voir [Tests](./tests)). On mesure en plus la [_couverture_](../glossary) : la proportion du code réellement exercée par au moins un test.

```bash
pnpm test:coverage    # Tous les tests avec mesure de couverture
```

### `build`

```bash
pnpm build            # Compilation de chaque sous-projet
pnpm audit:size       # Vérifie les budgets de taille de bundle
```

`build` attend que `lint`, `typecheck` et `test` aient réussi — pas la peine de compiler si l'un d'eux échoue.

### `audit`

L'**audit** inspecte les dépendances et le code à la recherche de vulnérabilités, de licences incompatibles, de code mort, de duplication ou de versions obsolètes. C'est le contrôle d'hygiène : il garde le projet sain dans la durée.

```bash
pnpm audit:security    # Vulnérabilités npm connues (CVE)
pnpm audit:licenses    # Compatibilité des licences des dépendances
pnpm audit:unused      # Exports, imports et fichiers jamais utilisés (knip)
pnpm audit:duplicates  # Blocs de code dupliqués, seuil 5 % (jscpd)
pnpm audit:versions    # Dépendances avec une mise à jour disponible (taze)
```

### `docs`

```bash
pnpm docs:build        # Construit le site VitePress
```

Sur `main`, ce _job_ est suivi du déploiement sur GitHub Pages via `docs.yml`.

## Reproduire la CI en local

Tout ce que fait la CI est reproductible en local. Le raccourci global :

```bash
pnpm ci:checks
```

Lance dans l'ordre, _fail-fast_ :

1. `format:check` — formatage (le plus rapide, le plus probable à échouer)
2. `check` (svelte) — vérification SvelteKit
3. `lint` — ESLint
4. `typecheck` — TypeScript
5. `test:coverage` — tests
6. `build` — compilation (le plus long, en dernier)

Les _hooks Git_ locaux ([lefthook](../quality/hooks)) exécutent automatiquement les étapes 1–4 sur les fichiers modifiés avant chaque commit, et un sous-ensemble plus large avant chaque push. Voir [Hooks Git](./hooks).

## Si la CI échoue

1. Cliquer sur le _job_ rouge dans la pull request → onglet **Details**.
2. Le log GitHub Actions s'ouvre. Identifier le _step_ qui a échoué.
3. Reproduire localement la commande exacte (`pnpm lint`, `pnpm test:coverage`, etc.).
4. Corriger, recommitter, repousser — la CI relance automatiquement.

Tous les _workflows_ échouent **vite** : la dépendance entre _jobs_ (`build` après `lint`/`typecheck`/`test`) évite d'attendre 5 min de build pour découvrir qu'une virgule manque dans un commentaire.

## Cache distribué

Pour accélérer la CI, Atlas utilise le **cache distribué Turborepo** (`TURBO_TOKEN` côté secrets). Quand un _job_ construit un projet, son résultat est mis en cache ; si le code source du projet n'a pas changé, le _job_ suivant le réutilise tel quel.

Conséquence : une pull request qui modifie un seul sous-projet ne reconstruit pas tout le dépôt, seulement ce qui est touché.
