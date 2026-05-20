# amarre-sandbox

Environnement Docker local pour faire tourner l'app [`apps/amarre/`](../../apps/amarre/) bout-en-bout sans dépendre des instances de prod. Bundle une instance CRF (REDCap), un BaaS self-hosted (Appwrite), un mail-trap (Mailpit) et les scripts qui provisionnent automatiquement le tout, importent la trame amarre, peuplent REDCap en données synthétiques et écrivent un `.env.local` directement consommable par amarre.

## Stack

| Service                 | URL                   | Rôle                                         |
| ----------------------- | --------------------- | -------------------------------------------- |
| **BaaS API (Appwrite)** | http://localhost:8090 | Sessions, comptes utilisateurs               |
| **BaaS Console**        | http://localhost:8091 | Admin UI Appwrite (SPA séparée)              |
| **CRF (REDCap)**        | http://localhost:8888 | Source des demandes amarre                   |
| **phpMyAdmin**          | http://localhost:8889 | Accès DB CRF (compte `redcap`)               |
| **Mailpit (UI)**        | http://localhost:8025 | Capture tous les emails (magic-link inclus)  |
| **Mailpit (SMTP)**      | localhost:1025        | Endpoint SMTP utilisé par Appwrite (interne) |

La stack CRF + Mailpit vient de [`sandbox/crf-sandbox/`](../crf-sandbox/) via `include:` Docker Compose v2.20+. La stack BaaS est déclarée inline dans [docker-compose.yaml](docker-compose.yaml), services préfixés `baas-`. Le service `baas` est branché aux deux réseaux (`baas-net` et `redcap-net`) pour parler à Mailpit.

## Prérequis

- Docker Desktop ou compatible avec `docker compose` v2.20+
- pnpm + Node ≥ 24 (pour les scripts `tsx`)
- 4 Go de RAM libre minimum

## Démarrage zéro-clic

```bash
cd sandbox/amarre-sandbox
pnpm start
```

C'est tout. `pnpm start` crée `.env` depuis `.env.example`, génère `_APP_OPENSSL_KEY_V1` (random 32-byte hex), lève les conteneurs, provisionne Appwrite + REDCap (avec un projet `amarre` dédié), importe la trame amarre, peuple les données, écrit `apps/amarre/.env.local` et lance un smoke test bout-en-bout du flow magic-link.

Variables d'environnement utiles :

| Var         | Valeurs         | Effet                                                                               |
| ----------- | --------------- | ----------------------------------------------------------------------------------- |
| `SEED_MODE` | `fake` (défaut) | 120 records synthétiques via `@faker-js/faker`                                      |
|             | `prod`          | Pull les vrais records depuis `PROD_CRF_URL` / `PROD_CRF_TOKEN` (à set dans `.env`) |
|             | `none`          | Ne pré-remplit pas le projet                                                        |
| `SKIP_E2E`  | `1`             | Saute le smoke test final (le bootstrap s'arrête après le seed)                     |

Exemples : `SEED_MODE=prod pnpm start`, `SEED_MODE=none SKIP_E2E=1 pnpm start`.

À la fin :

```bash
cd ../../apps/amarre
pnpm dev
```

Ouvrir http://localhost:5173 et signer avec un email matchant `ALLOWED_DOMAINS_REGEXP` (par défaut `@univ-lehavre.fr`, `@example.org` ou `@amarre.local`). Le magic link arrive dans Mailpit (http://localhost:8025) — clique dessus, tu es loggué dans amarre.

## Commandes

| Commande              | Effet                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| `pnpm start`          | Raccourci `docker:up` + `bootstrap` en un coup                          |
| `pnpm stop`           | Arrête les conteneurs (volumes préservés)                               |
| `pnpm docker:up`      | Démarre tous les conteneurs (BaaS + CRF + Mailpit)                      |
| `pnpm docker:down`    | Arrête les conteneurs (volumes préservés)                               |
| `pnpm docker:reset`   | Arrête + supprime les volumes (perte de données)                        |
| `pnpm docker:logs`    | Tail des logs                                                           |
| `pnpm bootstrap`      | Orchestrateur complet (BaaS + CRF + seed + .env amarre)                 |
| `pnpm bootstrap:baas` | Provisionne Appwrite (account root + org + projet + clé API)            |
| `pnpm bootstrap:crf`  | Installe REDCap, crée un projet `amarre` dédié, importe la trame        |
| `pnpm seed`           | Génère et importe N records synthétiques (défaut 120, voir `.env`)      |
| `pnpm pull:prod`      | Pull opt-in des records de prod (nécessite `PROD_CRF_*` dans `.env`)    |
| `pnpm test:e2e`       | Smoke test du flow magic-link bout-en-bout (spawn amarre dev si besoin) |

> Les commandes `up`/`down`/`reset` sont préfixées `docker:` parce que `pnpm up` est une commande native pnpm (= `update`) qui shadow-erait nos scripts.

Tous les scripts sont idempotents — re-lance-les sans crainte.

## Comment ça marche

### Bootstrap Appwrite

[`bootstrap-baas.ts`](scripts/bootstrap-baas.ts) attaque l'API Appwrite directement :

1. `POST /v1/account` crée le compte root (sur une install fraîche, le premier compte est promu root automatiquement). Si le compte existe déjà, on continue.
2. `POST /v1/account/sessions/email` récupère un cookie console.
3. `POST /v1/teams` crée l'organisation avec un ID stable (`org-amarre-sandbox`).
4. `POST /v1/projects` crée le projet `amarre` (region `default` — la seule acceptée en self-hosted, les régions `fra`/`nyc` sont propres à Appwrite Cloud).
5. `POST /v1/projects/{id}/keys` crée une clé serveur avec les scopes minimum (`users.read`, `users.write`, `sessions.write`).
6. Persistance de `PUBLIC_APPWRITE_PROJECT` et `APPWRITE_KEY` dans `.env`.

Les endpoints `/v1/teams`, `/v1/projects`, `/v1/projects/.../keys` sont ceux que la console appelle — stables sur la branche 1.x mais pas part du contrat REST public. Si une future major Appwrite réorganise tout, c'est ce script qu'il faudra patcher.

### Bootstrap REDCap

[`bootstrap-crf.ts`](scripts/bootstrap-crf.ts) :

1. Délègue l'install REDCap à `pnpm -F atlas-crf-sandbox docker:install` (création du schéma + projet par défaut id=1 + son token API — le projet 1 reste intact, c'est celui utilisé par les tests de contrat du crf-sandbox).
2. INSERT SQL minimal dans `redcap_projects` pour créer un projet `amarre` dédié (auto-incremented id). Idempotent : si le projet existe déjà, on le réutilise.
3. INSERT dans `redcap_user_rights` pour donner à `site_admin` un token API généré (16 bytes hex). `ON DUPLICATE KEY UPDATE` rend le step ré-entrant.
4. Drop de la FK `redcap_data_dictionaries.doc_id` → `redcap_edocs_metadata.doc_id` : l'API metadata d'import insère avec `doc_id=0` (sentinelle) et violerait sinon la contrainte.
5. Import du data dictionary [`data-dictionaries/127-amarre-v1.json`](../../data-dictionaries/127-amarre-v1.json) via `POST /api/?content=metadata&action=import` dans le projet amarre.
6. Persistance de `CRF_API_TOKEN` (le token du projet amarre) dans `.env`.

Le projet par défaut id=1 (créé par `install-crf.sh`) reste isolé et continue de servir les tests de contrat du `crf-sandbox`.

### Mail-trap

Le service `mailpit` du crf-sandbox écoute SMTP sur `mailpit:1025` (dans le réseau `redcap-net`). Le service `baas` est aussi attaché à ce réseau et lit `_APP_SMTP_HOST=mailpit` / `_APP_SMTP_PORT=1025`.

Mais Appwrite n'envoie pas les emails depuis son process principal : il les pousse dans une queue Redis (`utopia-queue.queue.v1-mails`) consommée par un worker dédié. On déclare donc en plus `baas-worker-mails` (même image Appwrite, `entrypoint: worker-mails`) qui consomme la queue et appelle Mailpit. Sans ce service, les emails restent coincés dans Redis. Les emails sortants sont visualisables sur http://localhost:8025.

### Seed fake data

[`seed-fake-data.ts`](scripts/seed-fake-data.ts) parcourt le data dictionary et génère N records (défaut 120, paramétrable via `SEED_RECORD_COUNT` ou `--count=N`) répartis entre quatre scénarios : incomplet (20%), en cours d'avis (30%), validé (40%), refusé (10%). Le branching logic REDCap (`[field]=val OR ...`) est interprété pour ne remplir que les champs réellement visibles selon les autres réponses. Les valeurs sont générées par `@faker-js/faker` (locale `fr`).

Re-lancer le seed est idempotent (les record_id sont stables, REDCap upsert) — utiliser `FAKER_SEED=42 pnpm seed` pour un seed déterministe.

### Pull depuis la prod (opt-in)

[`pull-from-prod.ts`](scripts/pull-from-prod.ts) tire les vrais records depuis le REDCap officiel et les ré-injecte en local. Nécessite `PROD_CRF_URL` et `PROD_CRF_TOKEN`.

**Pattern recommandé** : mettre ces deux valeurs dans `.env.prod` (gitignored, persistant) plutôt que dans `.env` (régénéré à chaque reset). Le fichier est sourcé en plus du `.env` standard par tous les scripts qui en ont besoin :

```bash
cp .env.prod.example .env.prod
# édite avec ton vrai URL + token
pnpm pull:prod        # demande confirmation
SEED_MODE=prod pnpm start   # ou via le bootstrap orchestré
```

Le script demande une confirmation interactive avant de pull (skip avec `--yes`). Les champs présents en prod mais absents en local sont droppés avec un warning. **L'URL doit inclure le `/api/` final** (REDCap exige le path d'API).

⚠ **Privacy** : les records pull-és se retrouvent en clair dans ta MariaDB locale (côté REDCap). Un `pnpm docker:reset` les efface.

### Test E2E

[`test-e2e.ts`](scripts/test-e2e.ts) exerce le flow magic-link bout-en-bout :

1. `POST /api/v1/auth/signup` sur le dev server amarre
2. Poll l'API Mailpit jusqu'à voir le mail
3. Extrait `userId` + `secret` du body
4. `GET /login?userId=...&secret=...` → vérifie 302 + cookie de session
5. `GET /api/v1/me` avec le cookie → vérifie 200 + bonnes données
6. Cleanup : supprime le user Appwrite + purge Mailpit

Pre-requis : `pnpm bootstrap` joué. Si `localhost:5173` n'est pas joignable, le script spawn lui-même `pnpm -F amarre dev` (et le tue en fin de run).

## Limites connues

- **Endpoints Appwrite privés** : `/v1/teams`, `/v1/projects`, `/v1/projects/.../keys` ne sont pas dans le contrat REST public. Stables sur 1.x mais à re-vérifier sur futur upgrade major.
- **Appwrite minimal** : on déclare l'API + MongoDB + Redis + `worker-mails`. Pas de traefik, ni de workers Functions/Builds/Webhooks. Suffisant pour Account/Users/Sessions utilisés par amarre, insuffisant si amarre se met à utiliser Appwrite Functions ou Webhooks.
- **Empreinte mémoire** : ~3-4 Go pour le full stack.
- **Couplage réseau avec crf-sandbox** : si son `docker-compose.yml` renomme `mailpit` ou `redcap-net`, le branchement casse.

## Convention de nommage

Les variables d'env et noms de services évitent les noms de marques tiers : `CRF_*` plutôt que `REDCAP_*` côté config sandbox, `baas-*` plutôt que `appwrite-*` côté services. Les `REDCAP_*` du compose `crf-sandbox` inclus sont laissés tels quels (out-of-scope).
