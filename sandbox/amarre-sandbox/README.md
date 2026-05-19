# amarre-sandbox

Environnement Docker local pour faire tourner l'app [`apps/amarre/`](../../apps/amarre/) bout-en-bout sans dépendre des instances de prod. Bundle une instance CRF (REDCap) et un BaaS self-hosted (Appwrite), plus les scripts de wiring qui produisent un `.env.local` directement consommable par amarre.

## Stack

| Service             | URL                           | Rôle                                       |
| ------------------- | ----------------------------- | ------------------------------------------ |
| **BaaS (Appwrite)** | http://localhost:8090         | Sessions, comptes utilisateurs             |
| **BaaS Console**    | http://localhost:8090/console | Admin UI Appwrite                          |
| **CRF (REDCap)**    | http://localhost:8888         | Source des demandes amarre                 |
| **phpMyAdmin**      | http://localhost:8889         | Accès DB CRF (compte `redcap`)             |
| **Mailpit**         | http://localhost:8025         | Capture les emails (signup CRF, magic URL) |

La stack CRF vient de [`sandbox/crf-sandbox/`](../crf-sandbox/) via `include:` Docker Compose v2.20+ — on ne duplique pas son setup. La stack BaaS est déclarée inline dans [docker-compose.yaml](docker-compose.yaml), service names préfixés `baas-` pour éviter tout clash réseau ou nommage.

## Prérequis

- Docker Desktop ou compatible avec `docker compose` v2.20+
- pnpm
- 4 Go de RAM libre minimum (Appwrite + MariaDB + Redis + REDCap)

## Démarrage

```bash
# 1. Configurer l'env (au premier lancement)
cp sandbox/amarre-sandbox/.env.example sandbox/amarre-sandbox/.env
# Édite .env : générer une chaîne aléatoire pour _APP_OPENSSL_KEY_V1
openssl rand -hex 32  # exemple de génération

# 2. Démarrer les conteneurs (~1-2 min au premier run, le temps que Appwrite télécharge et migre sa DB)
cd sandbox/amarre-sandbox
pnpm up

# 3. Bootstrap initial (orchestrateur)
pnpm bootstrap
```

L'orchestrateur enchaîne :

1. Attend que le BaaS soit healthy
2. **(Manuel au 1er run)** Ouvrir http://localhost:8090/console pour créer le user admin, créer un projet `amarre-sandbox`, et générer une clé API serveur. Reporter le `PUBLIC_APPWRITE_PROJECT` et `APPWRITE_KEY` dans `.env`. Voir [§Provisionner le BaaS](#provisionner-le-baas) pour le détail.
3. Installe REDCap (délègue à `crf-sandbox`)
4. Écrit `apps/amarre/.env.local` avec les URLs et tokens locaux

Une fois fait :

```bash
cd ../../apps/amarre
pnpm dev
```

Ouvrir http://localhost:5173 et signer avec une adresse qui match `ALLOWED_DOMAINS_REGEXP` (par défaut `@example.org` ou `@univ-lehavre.fr`).

## Provisionner le BaaS

L'API admin d'Appwrite n'expose pas `createProject` sans organisation préalable, donc la création initiale passe par la console web. Étapes (une fois par sandbox) :

1. Ouvrir http://localhost:8090/console
2. Créer le user admin (premier compte créé = admin global)
3. Créer une organisation puis un projet (par exemple nommé `amarre-sandbox`)
4. Générer une clé serveur avec ces scopes minimum :
   - `users.read`
   - `users.write`
   - `sessions.write`
   - `account.write`
5. Coller le project ID et la clé dans `.env` :
   ```
   PUBLIC_APPWRITE_PROJECT=<project_id>
   APPWRITE_KEY=<server_key>
   ```
6. Re-lancer `pnpm bootstrap:baas` — vérifie l'auth et passe à la suite

## Trame CRF

Pour qu'amarre fonctionne bout-en-bout, REDCap a besoin d'un projet de test avec le bon dictionnaire de données. Aujourd'hui ce dictionnaire n'est pas importé automatiquement — à faire manuellement après `pnpm bootstrap` :

1. Ouvrir http://localhost:8888 et se connecter avec le compte créé par `crf-sandbox`
2. Créer un nouveau projet
3. Importer le dictionnaire minimum (champs attendus par les routes [`apps/amarre/src/routes/api/v1/`](../../apps/amarre/src/routes/api/v1/)) — TODO : exporter ce dictionnaire dans `sandbox/amarre-sandbox/fixtures/`
4. Générer un token API pour ce projet et le coller dans `.env` sous `CRF_API_TOKEN`

Les champs attendus, déduits du code amarre (voir [Request.svelte](../../apps/amarre/src/lib/ui/Request.svelte) et [`surveys.ts`](../../apps/amarre/src/lib/types/api/surveys.ts)) :

- `record_id`, `created_at`, `demandeur_statut`
- `mobilite_type`, `invitation_type`, `invite_nom`
- `mobilite_universite_eunicoast`, `mobilite_universite_gu8`, `mobilite_universite_autre`
- `form_complete`, `demandeur_composante_complete`, `labo_complete`, `encadrant_complete`, `validation_finale_complete`
- `avis_composante_position`, `avis_laboratoire_position`, `avis_encadrant_position`

## Commandes

| Commande              | Effet                                                          |
| --------------------- | -------------------------------------------------------------- |
| `pnpm up`             | Démarre tous les conteneurs (BaaS + CRF)                       |
| `pnpm down`           | Arrête les conteneurs (volumes préservés)                      |
| `pnpm reset`          | Arrête + supprime les volumes (perte de données)               |
| `pnpm logs`           | Tail des logs                                                  |
| `pnpm bootstrap`      | Orchestrateur complet (BaaS check + CRF install + .env amarre) |
| `pnpm bootstrap:baas` | Valide les credentials BaaS dans `.env` contre l'API           |
| `pnpm bootstrap:crf`  | Install CRF + récupère le token + l'inscrit dans `.env`        |

## Limites connues

- **Bootstrap BaaS semi-manuel** : la création initiale projet/clé passe par la console (cf. ci-dessus). Le reste est automatisé.
- **Trame CRF pas encore exportée** : à importer manuellement (cf. §Trame CRF). Issue de suivi à ouvrir.
- **Appwrite minimal** : stack sans traefik ni workers (Functions/Builds). Suffisant pour Account/Users/Database utilisés par amarre. Pour un environnement plus prod-like, importer le compose officiel Appwrite via `include:` à la place de la stack inline.
- **Empreinte mémoire** : ~3-4 Go pour le full stack. Sur machine contrainte, lancer uniquement les services nécessaires.
- **Couplage léger avec crf-sandbox** : si son `docker-compose.yml` change de noms de services ou de ports, le `include:` ici peut casser. Risque acceptable tant que la convention est documentée.

## Convention de nommage

Les variables d'env et noms de services évitent les noms de marques tiers (cf. règle repo) : `CRF_*` plutôt que `REDCAP_*` côté config sandbox, `baas-*` plutôt que `appwrite-*` côté services. Les `REDCAP_*` du compose `crf-sandbox` inclus sont laissés tels quels (out-of-scope).
