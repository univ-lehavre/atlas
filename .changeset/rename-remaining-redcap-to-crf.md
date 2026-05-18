---
"@univ-lehavre/atlas-crf-dashboard": major
"@univ-lehavre/atlas-crf-openapi": major
"@univ-lehavre/atlas-crf-stats-cli": major
"@univ-lehavre/atlas-crf-sandbox": major
"@univ-lehavre/atlas-crf-logs": patch
---

Fin de la migration anti-marque REDCap : renommage des 4 packages restants utilisant `redcap-*` dans leur nom.

**Packages renommés (npm + dossiers + workspace)**

| Avant (npm)                              | Après (npm)                          |
| ---------------------------------------- | ------------------------------------ |
| `@univ-lehavre/atlas-redcap-dashboard`   | `@univ-lehavre/atlas-crf-dashboard`  |
| `@univ-lehavre/atlas-redcap-openapi`     | `@univ-lehavre/atlas-crf-openapi`    |
| `@univ-lehavre/atlas-redcap-stats-cli`   | `@univ-lehavre/atlas-crf-stats-cli`  |
| `@univ-lehavre/atlas-redcap-sandbox`     | `@univ-lehavre/atlas-crf-sandbox`    |

**Bins renommés**

- `redcap` → `crf-openapi` (dans `@univ-lehavre/atlas-crf-openapi`)
- `atlas-redcap-stats` → `atlas-crf-stats` (dans `@univ-lehavre/atlas-crf-stats-cli`)

**Fichiers internes renommés**

| Avant                                                | Après                                              |
| ---------------------------------------------------- | -------------------------------------------------- |
| `cli/crf-openapi/src/bin/redcap.ts`                  | `cli/crf-openapi/src/bin/crf-openapi.ts`           |
| `cli/crf-stats/src/bin/atlas-redcap-stats.ts`        | `cli/crf-stats/src/bin/atlas-crf-stats.ts`         |
| `cli/crf-openapi/specs/versions/redcap-{14,15,16}*.yaml` | `cli/crf-openapi/specs/versions/v{14,15,16}*.yaml` |
| `sandbox/crf-sandbox/scripts/install-redcap.sh`      | `sandbox/crf-sandbox/scripts/install-crf.sh`       |
| `sandbox/crf-sandbox/scripts/prepare-redcap-source.sh` | `sandbox/crf-sandbox/scripts/prepare-crf-source.sh` |

**Cache file renommé**

- `.redcap-stats.json` (fichier de cache local créé par `@univ-lehavre/atlas-crf-logs`) → `.crf-stats.json` — patch sur `crf-logs` pour le nouveau chemin par défaut.

**Conservé (texte descriptif / dépendances tierces / data REDCap)**

- Fichiers vendored dans `cli/crf-openapi/upstream/` (sources REDCap PHP) — non trackés, gitignored
- Fichiers Docker `database.php`, `init.sql`, `php.ini` dans `sandbox/crf-sandbox/docker/` — infrastructure de test pour instance REDCap réelle
- Tokens REDCap de test dans `sandbox/crf-sandbox/docker/config/.env.test` (auto-générés par `docker:install`, sandbox jetable)
- Variables d'environnement (`REDCAP_API_URL`, `REDCAP_API_TOKEN`)
- Champs natifs REDCap (`redcap_event_name`, `redcap_v`, etc.)
- URLs (`projectredcap.org`)
- README, JSDoc, libellés utilisateur

**Migration côté consommateur**

Aucun consommateur externe dans le monorepo n'utilise ces packages (apps et CLIs autonomes). Pour les utilisateurs externes :

```diff
- pnpm add @univ-lehavre/atlas-redcap-openapi
+ pnpm add @univ-lehavre/atlas-crf-openapi
```

```diff
- npx atlas-redcap-stats
+ npx atlas-crf-stats
```
