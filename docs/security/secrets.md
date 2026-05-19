# Secrets — inventaire et rotation

Inventaire des secrets en circulation dans le monorepo atlas, leur emplacement et la procédure de rotation associée.

> Mis à jour : 2026-05-19 (Phase 0.2 du plan DevSecOps).

## Principe

Aucun secret réel n'est commité dans le dépôt. Les fichiers `apps/*/.env.example` n'utilisent que des placeholders (`<appwrite_api_key>`, `https://cloud.example.com/v1`, etc.). Trois emplacements de stockage selon le périmètre du secret :

| Emplacement                                       | Type de secret                                       | Lifecycle                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **GitHub Actions Secrets** (Settings → Secrets)   | Tokens utilisés en CI/CD (Turbo, npm, releases)      | Géré par les admins du repo. Visible dans le workflow log redacté.                                        |
| **Appwrite Console** (variables d'env de la site) | Tokens runtime des apps déployées (Appwrite, REDCap) | Géré par les admins Appwrite. Injecté dans le conteneur à chaque déploiement.                             |
| **Fichiers `.env` locaux** (gitignored)           | Tokens de dev/test sur la machine du contributeur    | Géré par chaque contributeur. Ne quitte jamais la machine. Pattern `*-token.csv` et `.env*` dans `.gitignore`. |

## Inventaire

### GitHub Actions Secrets

| Secret              | Référence dans le code                                                                              | Usage                                                                          | Source / Owner                                                                  | Rotation                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `TURBO_TOKEN`       | [ci.yml:17](../../.github/workflows/ci.yml), [docs.yml:33](../../.github/workflows/docs.yml), [release.yml:11](../../.github/workflows/release.yml) | Cache Turborepo remote (Vercel)                                                | Turbo Cloud account du mainteneur                                               | Régénérer depuis le dashboard Turbo → update GH Secret. Bas risque (cache seulement).   |
| `PAT_TOKEN`         | [release.yml:59,67](../../.github/workflows/release.yml)                                            | Personal Access Token GitHub utilisé par Changesets pour pousser le release    | PAT du mainteneur avec scope `repo` + `workflow`                                | Régénérer dans GitHub → Settings → Developer settings → Tokens. Haut risque si fuite.   |
| `NPM_TOKEN`         | [release.yml:60](../../.github/workflows/release.yml), [.npmrc](../../.npmrc) (`${NPM_TOKEN}` substitué) | Publication npm des packages `@univ-lehavre/atlas-*`                          | Token npm avec scope `publish` sur l'org `@univ-lehavre`                        | npm → Access tokens → revoke + recreate. Haut risque si fuite (publication malveillante). |
| `GITHUB_TOKEN`      | [dependabot-auto-merge.yml:53](../../.github/workflows/dependabot-auto-merge.yml), [release.yml:61](../../.github/workflows/release.yml) | Token injecté automatiquement par Actions, scope = repo courant                | Géré par GitHub (auto-rotation à chaque run)                                    | N/A — éphémère, pas de rotation manuelle.                                               |

### Appwrite Console (variables d'env des sites déployés)

Par site Appwrite Sites (amarre, ecrin, find-an-expert) :

| Variable                                              | Apps concernées                  | Usage                                                                                          | Owner                          | Rotation                                                                                |
| ----------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `PUBLIC_APPWRITE_ENDPOINT`                            | amarre, ecrin                    | URL de l'instance Appwrite (publique, exposée au navigateur via `$env/static/public`)          | DSI ULHN (instance Appwrite)   | N/A (URL stable). Changement = migration.                                               |
| `PUBLIC_APPWRITE_PROJECT`                             | amarre, ecrin                    | ID du projet Appwrite (publique)                                                               | DSI ULHN                       | N/A (ID stable).                                                                        |
| `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT`               | find-an-expert                   | Mêmes que ci-dessus mais privés (non préfixés `PUBLIC_`)                                      | DSI ULHN                       | N/A.                                                                                    |
| `APPWRITE_KEY`                                        | amarre, ecrin, find-an-expert    | API key serveur, scope défini côté console Appwrite                                            | DSI ULHN / mainteneur          | Console Appwrite → Project → Settings → API keys → revoke + recreate.                   |
| `APPWRITE_DB_ID`, `APPWRITE_DATABASE_ID`              | ecrin, find-an-expert            | ID de la base de données Appwrite                                                              | DSI ULHN                       | N/A (ID stable).                                                                        |
| `APPWRITE_TABLE_ID_ALLOWED_EMAIL_DOMAINS_TO_SUBSCRIBE` | ecrin                            | ID de la table des domaines email autorisés                                                    | DSI ULHN                       | N/A.                                                                                    |
| `APPWRITE_CONSENT_EVENTS_COLLECTION_ID`               | find-an-expert                   | ID de la collection d'événements de consentement                                               | DSI ULHN                       | N/A.                                                                                    |
| `APPWRITE_CURRENT_CONSENTS_COLLECTION_ID`             | find-an-expert                   | ID de la collection des consentements actuels                                                  | DSI ULHN                       | N/A.                                                                                    |
| `ALLOWED_DOMAINS_REGEXP`                              | amarre, find-an-expert           | Regex des domaines email autorisés (allowlist signup, ex. `@univ-lehavre\.fr`)                | DSI ULHN / mainteneur          | N/A (config). Modifier = redéployer.                                                    |
| `PUBLIC_LOGIN_URL`                                    | amarre, ecrin, find-an-expert    | URL de l'app pour générer les magic links de connexion                                         | DSI ULHN                       | N/A.                                                                                    |
| `PUBLIC_REDCAP_URL` / `REDCAP_URL` / `REDCAP_API_URL` | amarre, ecrin, crf-dashboard     | URL de l'instance REDCap (CRF)                                                                 | DSI ULHN                       | N/A.                                                                                    |
| `REDCAP_API_TOKEN`                                    | amarre, ecrin                    | Token API REDCap (32-char hex), scope défini côté projet REDCap                                | DSI ULHN / mainteneur          | REDCap → Project → API → regenerate token + update Appwrite Site env var.               |
| `OPENALEX_API_TOKEN`                                  | find-an-expert                   | API key OpenAlex (premium polite pool)                                                         | Mainteneur                     | openalex.org dashboard → revoke + recreate.                                             |
| `OPENALEX_USER_AGENT`                                 | find-an-expert                   | User-Agent OpenAlex polite-pool (`name/version (mailto:contact)`)                              | Mainteneur                     | N/A (string statique).                                                                  |

### Dashboards internes (atlas-dashboard, crf-dashboard)

Apps de monitoring/admin, en principe non déployées en prod publique. Tournent en local (`pnpm -F atlas-dashboard dev`).

| Variable             | App              | Usage                                                                          | Owner                          | Rotation                                                                                |
| -------------------- | ---------------- | ------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`       | atlas-dashboard  | Fetch des releases GitHub publics (read-only)                                  | Contributeur (token perso)     | github.com → Settings → Tokens → revoke + recreate. Scope minimal (`public_repo` suffit). |
| `REDCAP_API_URL`     | crf-dashboard    | Endpoint REDCap (lecture seule)                                                | DSI ULHN                       | N/A (URL).                                                                              |
| `tokens.csv`         | crf-dashboard    | Fichier local listant les `token,project_id` REDCap par projet (pas d'env var) | Contributeur (export manuel)   | Refaire l'export depuis REDCap. **Ne jamais commit** (cf. `.gitignore` pattern `*-token.csv`). |

### Fichiers locaux (machine contributeur, gitignored)

- `apps/*/.env` — copie locale du `.env.example` avec valeurs réelles
- `apps/*/.env.isc`, `.env.univ-lehavre` — variantes par environnement déployé (référence pour l'admin)
- `*-token.csv` — tokens REDCap par projet (cf. crf-dashboard)
- `redcap-token.csv` à la racine — historique : voir [TODO.md §0.1](../../TODO.md) (jamais commité, audité 2026-05-19)

## Procédure de rotation générique

1. **Identifier** le secret à rotater et l'app/workflow consommateur.
2. **Générer** le nouveau secret depuis l'émetteur (Appwrite, REDCap, npm, etc.).
3. **Mettre à jour** l'emplacement de stockage :
   - GitHub Secret : `gh secret set <NAME> --body <new_value>` ou Settings → Secrets and variables → Actions
   - Appwrite Site env var : Console Appwrite → Sites → variables d'environnement → mettre à jour → redéployer
   - Fichier `.env` local : éditer le fichier
4. **Révoquer** l'ancien secret côté émetteur (après s'être assuré que le nouveau fonctionne).
5. **Vérifier** : re-lancer un workflow CI (pour les secrets GH) ou re-déployer le site (pour les Appwrite vars).

## Procédure d'urgence (suspicion de fuite)

1. **Révoquer immédiatement** l'ancien secret (étape 4 avant tout le reste).
2. **Audit** : `gh api repos/univ-lehavre/atlas/code-scanning/alerts` + onglet Security → Secret scanning pour vérifier si la fuite a été détectée.
3. **Si le secret a été commité** : `git filter-repo` pour purger l'historique + force-push coordonné avec l'équipe (cf. [TODO.md §0.1](../../TODO.md) pour le cas REDCap).
4. **Si secret runtime (Appwrite/REDCap)** : audit des logs côté émetteur pour identifier l'usage non autorisé.
5. **Post-mortem** : documenter l'incident et la mitigation dans une issue dédiée.
