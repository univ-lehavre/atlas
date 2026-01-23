# Audit des vérifications (hooks, CI, tests)

Date : 2026-01-23

## Configuration actuelle

### Lefthook (hooks Git)

| Hook         | Vérifications                                                       | Mode           |
| ------------ | ------------------------------------------------------------------- | -------------- |
| `commit-msg` | commitlint                                                          | -              |
| `pre-commit` | prettier, eslint                                                    | parallel       |
| `pre-push`   | install, check-majors, typecheck, test, audit:all, build, knip, cpd | priority-based |

### CI GitHub Actions

| Workflow      | Jobs                                              | Déclencheur      |
| ------------- | ------------------------------------------------- | ---------------- |
| `ci.yml`      | lint, typecheck, test, build, audit, check-majors | push/PR sur main |
| `release.yml` | changesets publish                                | push sur main    |

---

## Matrice de couverture

| Vérification        | pre-commit | pre-push | CI  | pre-release |
| ------------------- | :--------: | :------: | :-: | :---------: |
| Format (prettier)   |     ✅     |    -     | ✅  |      -      |
| Lint (eslint)       |     ✅     |    -     | ✅  |      -      |
| Typecheck           |     -      |    ✅    | ✅  |      -      |
| Tests unitaires     |     -      |    ✅    | ✅  |      -      |
| Build               |     -      |    ✅    | ✅  |      -      |
| Audit sécurité      |     -      |    ✅    | ✅  |      -      |
| Audit licences      |     -      |    ✅    | ✅  |      -      |
| Code dupliqué (cpd) |     -      |    ✅    | ✅  |      -      |
| Code mort (knip)    |     -      |    ✅    | ✅  |      -      |
| Versions majeures   |     -      |    ✅    | ✅  |      -      |
| Commitlint          |     ✅     |    -     | ❌  |      -      |
| Coverage 80%        |     -      |    ❌    | ❌  |      -      |
| Tests intégration   |     -      |    ❌    | ❌  |      -      |
| Tests API           |     -      |    ❌    | ❌  |      -      |

---

## Inventaire des tests

| Package        | Fichiers de test |  Script `test`  |
| -------------- | :--------------: | :-------------: |
| `packages/net` |   3 `.spec.ts`   | ✅ `vitest run` |
| `packages/crf` |   1 `.test.ts`   | ✅ `vitest run` |
| `apps/ecrin`   |      **0**       |    ❌ absent    |
| `cli/net`      |      **0**       |    ❌ absent    |

**Scripts existants mais non automatisés** :

- `packages/crf` → `test:integration`, `test:api`
- Root → `test:coverage`

---

## Problèmes identifiés

### Priorité haute

1. **Zones sans tests**
   - `apps/ecrin` : 0 tests, pas de script `test`
   - `cli/net` : 0 tests, pas de script `test`

2. **Coverage non vérifié**
   - Seuil de 80% configuré dans `vitest.config.ts`
   - Jamais validé (ni pre-push ni CI)

3. **Release non protégé**
   - `release.yml` publie sans relancer les tests
   - Risque de publier du code cassé si CI a été bypassée

### Priorité moyenne

4. **Commitlint bypassable**
   - Validé en local (hook commit-msg)
   - Absent de la CI → contournable avec `--no-verify`

5. **Tests d'intégration orphelins**
   - Scripts `test:integration` et `test:api` existent
   - Jamais lancés automatiquement

### Priorité basse

6. **Pas de hook pre-release**
   - Pourrait garantir une vérification complète avant publication

---

## Recommandations

| Action                        | Fichier(s) à modifier               | Effort |
| ----------------------------- | ----------------------------------- | ------ |
| Ajouter tests `apps/ecrin`    | Créer `apps/ecrin/src/**/*.test.ts` | Moyen  |
| Ajouter tests `cli/net`       | Créer `cli/net/src/**/*.test.ts`    | Faible |
| Vérifier coverage en CI       | `.github/workflows/ci.yml`          | Faible |
| Ajouter commitlint à CI       | `.github/workflows/ci.yml`          | Faible |
| Sécuriser release             | `.github/workflows/release.yml`     | Faible |
| Automatiser tests intégration | `.github/workflows/ci.yml`          | Moyen  |
