---
"@univ-lehavre/atlas-crf-core": major
"@univ-lehavre/atlas-crf-client": major
"@univ-lehavre/atlas-crf-logs": major
"@univ-lehavre/atlas-crf": major
"@univ-lehavre/atlas-crf-cli": major
"@univ-lehavre/atlas-researcher-profiles": major
"@univ-lehavre/atlas-crf-openapi": patch
"@univ-lehavre/atlas-crf-stats-cli": patch
"@univ-lehavre/atlas-crf-dashboard": patch
"@univ-lehavre/atlas-amarre": patch
"@univ-lehavre/atlas-ecrin": patch
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Renommage du cluster REDCap (packages internes) en cluster `crf` pour retirer la marque REDCap des identifiants publics du monorepo. Suite de la migration commencée avec `citation-types` et le cluster `citation`.

**Packages renommés (npm + dossiers + workspace)**

| Avant (npm)                              | Après (npm)                            |
| ---------------------------------------- | -------------------------------------- |
| `@univ-lehavre/atlas-redcap-core`        | `@univ-lehavre/atlas-crf-core`         |
| `@univ-lehavre/atlas-redcap-client`      | `@univ-lehavre/atlas-crf-client`       |
| `@univ-lehavre/atlas-redcap-logs`        | `@univ-lehavre/atlas-crf-logs`         |

Les packages restants nommés `redcap-*` (apps/redcap-dashboard, cli/redcap-openapi, cli/redcap-stats, sandbox/redcap-sandbox) seront traités dans la PR 4.

**Identifiants publics renommés (PascalCase, ~798 occurrences)**

Toutes les classes/types/erreurs avec préfixe `Redcap` → `Crf` :
- `RedcapClient` → `CrfClient`, `RedcapClientError` → `CrfClientError`, `RedcapClientService` → `CrfClientService`
- `RedcapConfig` → `CrfConfig`, `RedcapConnectionConfig` → `CrfConnectionConfig`
- `RedcapAdapter` → `CrfAdapter`, `RedcapFeatures` → `CrfFeatures`
- `RedcapToken` / `RedcapTokenType` / `RedcapUrl` / `RedcapUrlType` (brands) → `Crf*` correspondants
- `RedcapApiError`, `RedcapHttpError`, `RedcapNetworkError`, `RedcapFetchError`, `RedcapError`, `RedcapWriteError` → `Crf*`
- `RedcapLogEntry` → `CrfLogEntry`
- Fonctions : `createRedcapClient`, `makeRedcapClient`, `makeRedcapClientLayer`, `isRedcapErrorResponse`, `isValidRedcapName`, `checkRedcapServer` → `*Crf*`

**Variables / champs**
- `redcapApiToken`, `redcapApiUrl`, `redcapConfig`, `redcapResult`, `redcapToken`, `redcapUrl` → `crf*`
- `REDCAP_NAME_PATTERN` / `REDCAP_TOKEN_PATTERN` → `CRF_*`
- Codes d'erreur HTTP : `redcap_http_error` → `crf_http_error`, `redcap_api_error` → `crf_api_error`, `redcap_error` → `crf_error`
- Variable exportée dans `services/crf/src/server/client.ts` : `redcap` → `client`

**Sous-commandes CLI**
- `cli/researcher-profiles` : `from-redcap` → `from-crf`
- `cli/crf` : `crf-redcap` → `crf-api`

**Dossiers / fichiers renommés**

| Avant                                                      | Après                                                |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `apps/amarre/src/lib/server/redcap/`                       | `apps/amarre/src/lib/server/crf/`                    |
| `apps/ecrin/src/lib/redcap/`                               | `apps/ecrin/src/lib/crf/`                            |
| `cli/crf/src/commands/redcap/`                             | `cli/crf/src/commands/api/`                          |
| `services/crf/src/server/redcap.ts`                        | `services/crf/src/server/client.ts`                  |
| `cli/researcher-profiles/src/commands/from-redcap.ts`      | `cli/researcher-profiles/src/commands/from-crf.ts`   |

**Conservé (texte descriptif uniquement)**

- Variables d'environnement (`REDCAP_API_TOKEN`, `REDCAP_API_URL`, `REDCAP_URL`, `PUBLIC_REDCAP_URL`)
- Champs de données REDCap natifs (`redcap_event_name`, `redcap_repeat_instance`, `redcap_repeat_instrument`, `redcap_v`, `redcap16`)
- URLs (`redcap.example.com`, `projectredcap.org`)
- Messages d'erreur, JSDoc, libellés utilisateur mentionnant REDCap
- `apps/redcap-dashboard/.redcap-stats.json` (entrée `.gitignore`, sera traitée en PR 4)

**Migration côté consommateur**

```diff
- import { type RedcapClient, createRedcapClient } from '@univ-lehavre/atlas-redcap-client';
+ import { type CrfClient, createCrfClient } from '@univ-lehavre/atlas-crf-client';
```
