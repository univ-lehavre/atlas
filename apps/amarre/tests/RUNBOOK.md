# RUNBOOK — tests amarre

Guide opérationnel des 5 niveaux de la pyramide. Pour le **pourquoi** et l'**architecture**, voir [README.md](./README.md).

## Prérequis machine

| Outil   | Version min                          | Vérif                    |
| ------- | ------------------------------------ | ------------------------ |
| Node.js | 24.x                                 | `node --version`         |
| pnpm    | 10.x                                 | `pnpm --version`         |
| Docker  | 24.x + compose v2                    | `docker compose version` |
| Disque  | ~6 Go libres (stack docker complète) | `df -h`                  |
| RAM     | ~4 Go libres pendant les tests       | —                        |

Sur macOS : Docker Desktop ou OrbStack. Sur Linux : Docker Engine + plugin compose. Windows : WSL2 recommandé (non testé en natif).

## Premier lancement (de zéro)

```bash
# 1. Cloner + installer
git clone git@github.com:univ-lehavre/atlas.git
cd atlas
pnpm install                              # ~2 min

# 2. Préparer le data dictionary (gitignored, doit être généré localement)
#    → voir la section "Préparer le data dictionary" plus bas pour les deux options.
pnpm crf:dictionaries:export --apply      # option export prod (la plus rapide)

# 3. Installer le navigateur pour le niveau 5 (Playwright)
pnpm -F @univ-lehavre/atlas-amarre-sandbox exec playwright install chromium

# 4. Lancer le stack + bootstrap + smoke (≈ 5 min la première fois)
pnpm -F @univ-lehavre/atlas-amarre-sandbox start
```

À l'issue du `start`, le sandbox affiche les URLs utiles. La stack reste up — `pnpm -F @univ-lehavre/atlas-amarre-sandbox stop` pour arrêter (volumes préservés), `docker:reset` pour repartir de zéro.

Si tu ne veux faire tourner que le **niveau 1** (unit + UI, pas de docker requis), saute les étapes 2 à 4 — un simple `pnpm -F @univ-lehavre/atlas-amarre test` après `pnpm install` suffit.

## Préparer le data dictionary

Le data dictionary REDCap d'amarre (`data-dictionaries/127-amarre-v1.json`, 118 champs + branching logic) est **gitignoré** : il contient des labels et de la logique potentiellement sensibles. Il faut donc le matérialiser localement avant le premier `bootstrap-crf` (sinon `pnpm start` plante au step `==> Importing amarre data dictionary` avec une erreur explicite).

**Option A — export depuis la prod REDCap** (recommandé si tu as un token API du projet amarre prod) :

```bash
# Prérequis : REDCAP_API_TOKEN dans le .env racine, OU redcap-token.csv
# à la racine avec un mapping project_id;token (le script lit les deux).
pnpm crf:dictionaries:export --apply
```

Le script [scripts/crf-trame/export-data-dictionaries.ts](../../../scripts/crf-trame/export-data-dictionaries.ts) tape `getFields` + `getInstruments` + `getProjectInfo` sur la prod, **anonymise** les valeurs identifiantes (ULHN, labos, emails, téléphones — patterns dans [redact-patterns.json](../../../scripts/crf-trame/redact-patterns.json)) avant d'écrire `data-dictionaries/<id>-<slug>.json`. Idempotent.

**Option B — récupérer l'export anonymisé d'un teammate** : demander le fichier `127-amarre-v1.json` déjà exporté et le déposer à `data-dictionaries/` (créer le dossier si besoin). Le fichier reste gitignored, ne jamais le commit.

**Vérif** :

```bash
ls data-dictionaries/127-amarre-v1.json   # doit exister
jq '.fields | length' data-dictionaries/127-amarre-v1.json   # ≥ 100 attendu
```

## Services up — URLs locales

Une fois `start` joué, ces interfaces sont accessibles :

| Service             | URL                     | Notes                                                                 |
| ------------------- | ----------------------- | --------------------------------------------------------------------- |
| amarre app          | <http://localhost:5173> | dev server (`pnpm -F amarre dev`, spawné par le webServer Playwright) |
| BaaS API (Appwrite) | <http://localhost:8090> | API self-hosted (`/v1` racine)                                        |
| BaaS console        | <http://localhost:8091> | UI Appwrite (login dans `sandbox/amarre-sandbox/.env`)                |
| CRF (REDCap)        | <http://localhost:8888> | projet `amarre` provisionné par bootstrap-crf                         |
| Mailpit             | <http://localhost:8025> | mail-trap : tous les magic-links atterrissent ici                     |
| phpMyAdmin          | <http://localhost:8889> | accès direct MariaDB REDCap                                           |

## TL;DR

| Niveau | Commande                                                             | Prérequis stack                                    | Durée typique |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------- | ------------- |
| 1 unit | `pnpm -F @univ-lehavre/atlas-amarre test:unit`                       | aucun                                              | ~2 s          |
| 1 UI   | `pnpm -F @univ-lehavre/atlas-amarre test:ui`                         | aucun                                              | ~3 s          |
| 2 ctr  | `pnpm -F atlas-crf-sandbox test:contract:amarre`                     | REDCap docker + `test:setup`                       | ~10 s         |
| 3 crf  | `pnpm -F @univ-lehavre/atlas-amarre test:integration` (suite `crf`)  | REDCap docker + `bootstrap-crf` (projet amarre)    | ~15 s         |
| 4 baas | `pnpm -F @univ-lehavre/atlas-amarre test:integration` (suite `auth`) | Appwrite + Mailpit + `bootstrap-baas`              | ~10 s         |
| 5 e2e  | `pnpm -F @univ-lehavre/atlas-amarre-sandbox test:smoke`              | stack complète (Appwrite + Mailpit + REDCap + dev) | ~30 s         |

Aliases globaux : `pnpm test` à la racine fait tourner `unit + ui + integration` (les niveaux 3/4 se skipent sans stack).

---

## Niveau 1 — Unit & UI

**Quoi** : tests purs sur `src/lib/` et `src/routes/` (project `unit`, env node) + composants Svelte (project `ui`, env happy-dom).

```bash
pnpm -F @univ-lehavre/atlas-amarre test:unit            # node
pnpm -F @univ-lehavre/atlas-amarre test:ui              # happy-dom
pnpm -F @univ-lehavre/atlas-amarre test                 # les deux + intégration self-skip
pnpm -F @univ-lehavre/atlas-amarre test:coverage        # avec rapport v8
```

**Aucun prérequis** — aucune dépendance réseau, aucun docker.

**Patterns d'échec courants** :

- `lifecycle_function_unavailable: mount(...) is not available on the server` — la suite a chargé la build SSR de Svelte. Vérifier que le test est bien sous `tests/ui/` (le project `ui` force `resolve.conditions = ['browser']`).
- `Cannot find element` dans une modale Bootstrap — `aria-hidden="true"` masque le contenu. Passer `{ hidden: true }` aux queries Testing Library.
- Couverture sous le seuil — voir [vitest.config.ts](../vitest.config.ts) (`thresholds`). Les seuils ont été re-baselinés après l'extraction `atlas-ui`, à remonter quand la couverture progresse.

---

## Niveau 2 — Contract amarre × REDCap

**Quoi** : valide la conformité OpenAPI du contrat amarre contre une instance REDCap fraîche. Tests sous [sandbox/crf-sandbox/tests/contract-amarre/](../../../sandbox/crf-sandbox/tests/contract-amarre/) — `metadata.test.ts` (data dictionary chargée) + `records.test.ts` (lifecycle CRUD + filterLogic).

**Prérequis stack** :

```bash
cd sandbox/crf-sandbox
pnpm docker:up          # REDCap + MariaDB
pnpm docker:install     # install REDCap + projet 1 par défaut
pnpm test:setup         # mint API token pour projet amarre + import data dictionary
```

`test:setup` lit [data-dictionaries/127-amarre-v1.json](../../../data-dictionaries/127-amarre-v1.json) et l'importe dans un projet amarre dédié, puis écrit le token dans [tests/fixtures/projects.json](../../../sandbox/crf-sandbox/tests/fixtures/projects.json).

**Lancer** :

```bash
pnpm -F atlas-crf-sandbox test:contract:amarre
```

**Patterns d'échec courants** :

- `REDCap Docker is not running` → `pnpm -F atlas-crf-sandbox docker:up`.
- `Test fixtures not found` → `pnpm -F atlas-crf-sandbox test:setup` (n'oublie pas `docker:install` avant).
- `403`/`token invalid` → fixture stale après un `docker:reset`. Re-jouer `docker:install && test:setup`.

---

## Niveau 3 — amarre × REDCap (services serveur)

**Quoi** : exerce `src/lib/server/services/surveys.ts` (`newRequest`, `listRequests`, `fetchUserId`) contre une vraie instance REDCap. Pas de browser, pas d'Appwrite. Voir [tests/integration/crf/surveys.test.ts](./integration/crf/surveys.test.ts).

**Prérequis stack** : la même que pour le N5 — Appwrite n'est pas exercé ici mais le `start` orchestré du sandbox provisionne tout d'un coup.

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start    # docker + bootstrap baas + bootstrap-crf + seed
```

Variante sans Appwrite si tu n'as besoin que de REDCap :

```bash
cd sandbox/amarre-sandbox
pnpm docker:up
pnpm bootstrap:crf      # provisionne uniquement le projet amarre côté REDCap
```

**Lancer** :

```bash
pnpm -F @univ-lehavre/atlas-amarre test:integration
```

La suite **N3** (`describe.skipIf(!reachable)`) tourne, la suite **N4** se skipe si Appwrite/Mailpit ne sont pas joignables. Pour ne lancer que N3, filtrer : `vitest run --project integration tests/integration/crf`.

**Patterns d'échec courants** :

- Tout skipé → REDCap pas joignable sur `localhost:8888`. Probe : `curl -fsSL http://localhost:8888/api/`.
- `filterLogic` parse error sur emails avec quotes → bug dans `escapeFilterLogicValue` (cf. `surveys.ts`). Le test `'should escape double quotes'` doit catcher.
- Records orphelins entre runs → la suite cleanup via le préfixe `amarre-integ-test-` dans `beforeAll` / `afterAll`. Si un run a crashé sans cleanup, ils seront purgés au prochain lancement.

---

## Niveau 4 — amarre × Appwrite × Mailpit (magic-link API-only)

**Quoi** : valide le flow magic-link en exerçant `src/lib/server/services/auth.ts` (`signupWithEmail` + `login`) contre un vrai Appwrite + un vrai Mailpit. Pas de browser. Voir [tests/integration/auth/signup.test.ts](./integration/auth/signup.test.ts).

**Prérequis stack** :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start    # baas + worker-mails + mailpit + amarre .env
```

Le test a besoin de `.env.local` côté amarre (créé par `bootstrap-baas`) avec `PUBLIC_APPWRITE_PROJECT` + `APPWRITE_KEY`.

**Lancer** :

```bash
pnpm -F @univ-lehavre/atlas-amarre test:integration
```

Pour ne lancer que N4 : `vitest run --project integration tests/integration/auth`.

**Patterns d'échec courants** :

- Skip silencieux → l'un des deux backends est down. La sonde teste les deux en parallèle ; vérifier `http://localhost/v1/health/version` (Appwrite) et `http://localhost:8025/api/v1/info` (Mailpit).
- `pollForMessage` timeout → l'email magic-link n'arrive pas. Cause classique : le service `baas-worker-mails` n'est pas up (les emails restent en queue Redis). `docker compose ps | grep worker-mails`.
- `ALLOWED_DOMAINS_REGEXP` rejette l'email de test → la suite utilise `@example.org` qui matche le regex de `.env.example` (`@(example\.org|univ-lehavre\.fr)`). Ne pas hardcoder un autre domaine sans ajuster la regex.

---

## Niveau 5 — Smoke E2E (Playwright)

**Quoi** : pilote la stack complète dans un vrai Chromium. Scénario : home anonyme → signup modale → magic-link → création de demande → logout. Voir [sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts](../../../sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts).

**Prérequis stack** :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start
```

Le `webServer` de [playwright.config.ts](../../../sandbox/amarre-sandbox/playwright.config.ts) spawn `pnpm -F amarre dev` automatiquement (`reuseExistingServer: true` — donc si un dev server tourne déjà sur :5173, Playwright le réutilise).

**Lancer** :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox test:smoke           # headless
pnpm -F @univ-lehavre/atlas-amarre-sandbox test:smoke:headed    # avec UI
```

Artefacts : `sandbox/amarre-sandbox/playwright-report/` (HTML reporter) + `test-results/` (traces/screenshots/videos sur échec). Les deux dossiers sont gitignorés.

**Patterns d'échec courants** :

- `Test skipped` → la sonde `isStackReachable` n'a pas pu joindre Mailpit ou Appwrite. Démarrer la stack.
- `waitForMagicLink timeout` → même cause qu'en N4 (worker-mails).
- `Modal not visible` → Bootstrap JS pas chargé. Vérifier que `+layout.svelte` importe bien le bundle Bootstrap en `onMount` (dynamic import — SSR n'aime pas le `window` du UMD).
- Le test crée puis supprime un user Appwrite par run (préfixe `amarre-e2e-`). Si un crash a laissé un user orphelin, le rerun cleanup proprement (le `afterEach` est défensif).

---

## Cheatsheet — où vit quoi

| Helper                                                                                                                             | Rôle                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [helpers/redcap.ts](./integration/helpers/redcap.ts)                                                                               | `isRedcapReachable`, `deleteRecordsByPrefix`, `nodeContext`                      |
| [helpers/appwrite.ts](./integration/helpers/appwrite.ts)                                                                           | `isAppwriteReachable`, `countSessions`, `deleteUserByEmail`                      |
| [helpers/mailpit.ts](./integration/helpers/mailpit.ts)                                                                             | `isMailpitReachable`, `purgeMailpit`, `pollForMessage`, `extractMagicLinkParams` |
| [fixtures/users.ts](./fixtures/users.ts), [fixtures/requests.ts](./fixtures/requests.ts), [fixtures/forms.ts](./fixtures/forms.ts) | Payloads typés partagés entre niveaux 1 et 3/4                                   |

## Données réelles vs fake (auto-détection)

Au lancement du `start`, le bootstrap **auto-détecte** quel mode de seed appliquer :

- **`PROD_CRF_URL` + `PROD_CRF_TOKEN` set** (dans `.env` ou `.env.prod`) → `SEED_MODE=prod` : pull les vrais records de la prod.
- **Sinon** → `SEED_MODE=fake` : 120 records synthétiques via `@faker-js/faker` (locale `fr`).

Le mode choisi est affiché dans la sortie (`==> Detected PROD_CRF_* credentials → SEED_MODE=prod` ou `==> No PROD_CRF_* credentials → SEED_MODE=fake`). Pour **forcer** un mode :

```bash
SEED_MODE=fake pnpm -F @univ-lehavre/atlas-amarre-sandbox start    # force fake même avec creds prod
SEED_MODE=none pnpm -F @univ-lehavre/atlas-amarre-sandbox start    # skip le seed
SEED_MODE=prod pnpm -F @univ-lehavre/atlas-amarre-sandbox start    # exige les creds (échoue sinon)
```

### Configurer le mode prod

```bash
# .env.prod (gitignoré, persiste à travers les docker:reset)
cd sandbox/amarre-sandbox
cp .env.prod.example .env.prod
# Éditer :
#   PROD_CRF_URL=https://redcap.univ-lehavre.fr/api/      # /api/ final obligatoire
#   PROD_CRF_TOKEN=<token amarre prod>                    # demander à un admin REDCap
```

Le bootstrap appelle [`pull-from-prod.ts`](../../../sandbox/amarre-sandbox/scripts/pull-from-prod.ts) qui :

1. Refuse de tourner si `PROD_CRF_URL` + `PROD_CRF_TOKEN` ne sont pas set.
2. Pull tous les records (`content=record`) depuis la prod.
3. Vérifie que la metadata prod matche la metadata locale (warn sur les champs prod absents en local — ils seront droppés à l'import).
4. Importe dans le projet amarre local.

**Refresh sans reset** (la stack tourne déjà, on veut juste re-pull les données) :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox pull:prod        # demande confirmation
pnpm -F @univ-lehavre/atlas-amarre-sandbox pull:prod --yes  # non-interactif
```

### Pièges

- **Privacy** : les records pull-és contiennent des données nominatives qui se retrouvent **en clair dans ta MariaDB locale**. Un `pnpm -F …amarre-sandbox docker:reset` les efface. Ne pas push, screenshot ou logger ces données.
- **`.env.prod` survit aux resets** — c'est voulu (sourcé après `.env` par bootstrap), donc tes credentials persistent. Mais reste **gitignoré**, ne jamais commit.
- **URL prod** : doit inclure le `/api/` final (REDCap exige le path d'API).
- **Champs supplémentaires en prod** : si la trame prod a évolué sans MAJ de `data-dictionaries/127-amarre-v1.json`, les nouveaux champs sont droppés silencieusement à l'import (warn dans les logs). Le N2 (contract) catche ça.

## Intégration des 5 niveaux dans pre-commit / pre-push / CI

| Niveau                | pre-commit |   pre-push   |  CI GitHub   | Comment                                                                                                                                                                          |
| --------------------- | :--------: | :----------: | :----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — unit              |     ❌     |      ✅      |      ✅      | inclus via `pnpm test:coverage` (turbo → project `unit` de Vitest)                                                                                                               |
| 1 — UI                |     ❌     |      ✅      |      ✅      | idem via project `ui` (happy-dom)                                                                                                                                                |
| 2 — contract amarre   |     ❌     |      ❌      |      ❌      | **explicitement exclu** par [vitest.config.ts](../../../sandbox/crf-sandbox/vitest.config.ts) du crf-sandbox (REDCap docker requis). Lancement manuel via `test:contract:amarre` |
| 3 — amarre × REDCap   |     ❌     | ✅ self-skip | ✅ self-skip | inclus via project `integration` mais `describe.skipIf(!reachable)` — REDCap pas joignable en pre-push ni en CI → skip silencieux                                                |
| 4 — amarre × Appwrite |     ❌     | ✅ self-skip | ✅ self-skip | idem N3                                                                                                                                                                          |
| 5 — Playwright smoke  |     ❌     |      ❌      |      ❌      | aucun rattachement automatique. Lancement manuel via `test:smoke`                                                                                                                |

**En clair** : seul le niveau 1 (~85 tests) protège réellement les PRs en automatique. Les niveaux 3 et 4 sont _présents_ mais skipped en pipeline, les niveaux 2 et 5 sont totalement absents — une régression N2/N5 ne sera attrapée que par un dev qui pense à lancer la suite localement avec la stack up.

Brancher N2-N5 sur pre-push / CI est un chantier listé dans [TODO.md](../../../TODO.md) (« Brancher les niveaux 2 à 5 d'amarre sur pre-push »). Trade-off : ~5 min ajoutés au job CI pour démarrer la stack docker complète, vs vraie couverture pyramide.

## Reset complet (en cas de doute)

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox docker:reset    # tue + volumes
pnpm -F atlas-crf-sandbox docker:reset                     # idem côté crf (si N2 utilisé indépendamment)
pnpm -F @univ-lehavre/atlas-amarre-sandbox start           # repart de zéro (auto fake/prod selon creds)
```

`.env.prod` survit au reset → tes credentials prod persistent et le seed prod redémarre automatiquement.
