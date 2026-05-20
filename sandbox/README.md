# Sandbox

Environnements de test et d'expérimentation locaux pour les apps Atlas. Chaque sous-répertoire est un bac à sable Docker autonome qui reproduit une stack d'intégration sans dépendre de la prod.

## Contenu

| Sandbox                                  | Rôle                                                                          | Ports                                |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| [`crf-sandbox/`](crf-sandbox/)           | REDCap auto-installé + tests de contrat OpenAPI. Utilisable seul.             | `8888`, `8889`, `8025`, `1025`       |
| [`amarre-sandbox/`](amarre-sandbox/)     | Stack complète pour l'app [`amarre`](../apps/amarre/) : inclut `crf-sandbox` (via `include:`) + Appwrite self-hosted + worker mail + bootstrap automatisé. | `8090`, plus ceux du `crf-sandbox`   |

Les ports `mariadb`/`mongodb`/`redis` ne sont pas exposés sur l'hôte — ils restent sur les réseaux Docker internes.

## Quick-start par sandbox

### crf-sandbox standalone

```bash
cd sandbox/crf-sandbox
pnpm docker:up && pnpm docker:install
```

Installe REDCap 16.1.9 + crée un projet de test + token API.

### amarre-sandbox (stack complète)

```bash
cd sandbox/amarre-sandbox
cp .env.example .env
sed -i.bak "s/__set_a_random_string_here__/$(openssl rand -hex 32)/" .env && rm .env.bak
pnpm start  # ou : pnpm docker:up && pnpm bootstrap
```

Provisionne Appwrite (root account + projet + API key), REDCap (install + projet `amarre` + dictionnaire), seed 120 records synthétiques, et écrit `apps/amarre/.env.local`. Détails dans [amarre-sandbox/README.md](amarre-sandbox/README.md).

## URLs et accès — amarre-sandbox

Une fois la stack levée, voici comment se connecter à chaque service. Tous tournent sur `localhost`.

### Appwrite (BaaS) — http://localhost:8090

| Composant     | URL                                  | Comment se connecter                                                                                              |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Console admin | http://localhost:8091/               | Email : valeur de `APPWRITE_ROOT_EMAIL` dans `.env` (défaut `admin@amarre.local`). Mot de passe : `APPWRITE_ROOT_PASSWORD`. (Container `baas-console`, image `appwrite/console:8`.) |
| API           | http://localhost:8090/v1             | Header `X-Appwrite-Project: amarre` + `X-Appwrite-Key: <APPWRITE_KEY>` (cf. `.env` après bootstrap).             |
| Health probe  | http://localhost:8090/v1/health/version | Public, retourne 200 dès qu'Appwrite est prêt. Utilisé par le bootstrap.                                       |

Une organisation `Amarre Sandbox` et un projet `amarre` sont créés au bootstrap. La clé API a les scopes `users.read`, `users.write`, `sessions.write`.

### REDCap (CRF) — http://localhost:8888

| Composant   | URL                          | Comment se connecter                                                                              |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Interface   | http://localhost:8888        | Compte `site_admin` (créé par `install-crf.sh`). Auth : `auth_meth_global=none` → pas de password en local. |
| API         | http://localhost:8888/api/   | Token dans `CRF_API_TOKEN` du `.env`. Exemple : `curl -X POST http://localhost:8888/api/ -d "token=$CRF_API_TOKEN" -d "content=record" -d "format=json"`. |
| Projet      | `amarre` (project_id=1)      | Trame importée depuis `data-dictionaries/127-amarre-v1.json`. Status: development (modifiable).  |

### phpMyAdmin (DB REDCap) — http://localhost:8889

| Champ      | Valeur                       |
| ---------- | ---------------------------- |
| Server     | (pré-rempli)                 |
| Username   | `redcap`                     |
| Password   | `redcap_password`            |
| Database   | `redcap`                     |

Tables intéressantes : `redcap_projects`, `redcap_metadata`, `redcap_data`, `redcap_user_rights`.

### MongoDB (DB Appwrite)

Pas exposé sur l'hôte. Pour s'y connecter, passer par le conteneur :

```bash
docker exec -it amarre-sandbox-baas-mongodb mongosh \
  --username root --password baas_password --authenticationDatabase admin
```

DB principale : `appwrite`. Collections clés : `users`, `sessions`, `projects`.

### Mailpit (mail-trap) — http://localhost:8025

Capture **tous** les emails envoyés par Appwrite (magic-link inclus) — aucun mail ne sort réellement.

| Composant      | URL                                  | Détails                                                                          |
| -------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| UI Web         | http://localhost:8025                | Inbox + recherche + visualisation HTML/raw.                                      |
| API REST       | http://localhost:8025/api/v1/messages | `GET` liste, `DELETE` purge. Utilisée par `pnpm test:e2e`.                       |
| SMTP (interne) | `mailpit:1025` (réseau Docker)       | Pas d'auth, pas de TLS. Appwrite y envoie via `_APP_SMTP_HOST=mailpit`.          |

### amarre dev server — http://localhost:5173

Lancé séparément avec `pnpm -F amarre dev`. Lit `apps/amarre/.env.local` (généré par `pnpm bootstrap` côté sandbox).

Pour signer : utilise n'importe quelle adresse matchant `ALLOWED_DOMAINS_REGEXP` (défaut `@univ-lehavre.fr`, `@example.org`, `@amarre.local`). Le magic link tombe dans Mailpit.

## Diagnostic rapide

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'   # tout doit être Up
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8090/v1/health/version  # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8888/api/                # 200 (POST attendu, mais le 200 confirme l'UP)
curl -s http://localhost:8025/api/v1/messages | jq '.total'                        # nombre d'emails capturés
docker logs amarre-sandbox-baas-worker-mails --tail 30                             # vérifier qu'aucun mail ne reste coincé
```

## Reset complet

```bash
cd sandbox/amarre-sandbox
pnpm docker:reset   # arrête + supprime tous les volumes (perte de données)
pnpm start          # reprovisionne tout from scratch
```
