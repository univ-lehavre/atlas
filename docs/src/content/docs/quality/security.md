---
title: Sécurité — garde-fous et conventions
---

Cette page regroupe les pratiques de sécurité applicatives et opérationnelles du monorepo Atlas : inventaire des secrets, classification des surfaces exposées, scan dynamique (DAST), et inventaire détaillé des dépendances (SBOM).

Pour la procédure de gestion d'incident (compromission supposée, divulgation responsable), voir [Incident response](./incident-response).

> **Périmètre.** Le chantier DevSecOps côté dépôt est considéré complet ; les items dépendant d'acteurs externes (équipes ops, infra de preview, second mainteneur) sont reportés sine die. Voir [ADR 0001](../decisions/0001-devsecops-perimetre-repo-sine-die) pour la décision de cadrage **et le tableau de suivi des items sine die**.

[[toc]]

## DevSecOps — qu'est-ce que c'est ?

Le [**DevSecOps**](../glossary) intègre la sécurité à **toutes** les étapes du développement (écriture du code, tests, intégration continue, déploiement) plutôt que comme un contrôle final isolé. L'idée : attraper un défaut de sécurité au plus tôt coûte beaucoup moins cher que de le corriger en production.

**Pourquoi c'est important.** Une faille trouvée après mise en ligne expose des données et demande une réaction en urgence ; la même faille détectée à l'écriture du code se corrige en quelques minutes, sans risque.

**Comment Atlas l'applique.** À chaque pull request, plusieurs garde-fous tournent automatiquement :

- **analyse statique** du code ([CodeQL](../glossary), Semgrep) — cherche les motifs vulnérables sans exécuter le code ;
- **détection de secrets** ([gitleaks](../glossary)) — empêche de committer un token ou une clé ;
- **audit des dépendances** (vulnérabilités connues, licences) ;
- **tests de sécurité** sur les endpoints (401, anti-XSS) ;
- **scan dynamique** ([OWASP ZAP](../glossary)) sur une application en cours d'exécution.

Le périmètre exact (ce qui est couvert côté dépôt, ce qui dépend d'acteurs externes) est cadré par [ADR 0001](../decisions/0001-devsecops-perimetre-repo-sine-die).

## Secrets — inventaire et rotation

Inventaire des secrets en circulation dans le monorepo atlas, leur emplacement et la procédure de rotation associée.

> Mis à jour : 2026-05-19.

### Principe

Aucun secret réel n'est commité dans le dépôt. Les fichiers `apps/*/.env.example` n'utilisent que des placeholders (`<appwrite_api_key>`, `https://cloud.example.com/v1`, etc.). Trois emplacements de stockage selon le périmètre du secret :

| Emplacement                                       | Type de secret                                       | Lifecycle                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **GitHub Actions Secrets** (Settings → Secrets)   | Tokens utilisés en CI/CD (Turbo, npm, releases)      | Géré par les admins du repo. Visible dans le workflow log redacté.                                             |
| **Appwrite Console** (variables d'env de la site) | Tokens runtime des apps déployées (Appwrite, REDCap) | Géré par les admins Appwrite. Injecté dans le conteneur à chaque déploiement.                                  |
| **Fichiers `.env` locaux** (gitignored)           | Tokens de dev/test sur la machine du contributeur    | Géré par chaque contributeur. Ne quitte jamais la machine. Pattern `*-token.csv` et `.env*` dans `.gitignore`. |

### Inventaire — GitHub Actions Secrets

| Secret         | Référence dans le code                                                                                                                                                                                                                                                   | Usage                                                                       | Source / Owner                                           | Rotation                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `TURBO_TOKEN`  | [ci.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/ci.yml), [docs.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/docs.yml), [release.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml) | Cache Turborepo remote (Vercel)                                             | Turbo Cloud account du mainteneur                        | Régénérer depuis le dashboard Turbo → update GH Secret. Bas risque (cache seulement).     |
| `PAT_TOKEN`    | [release.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml)                                                                                                                                                                             | Personal Access Token GitHub utilisé par Changesets pour pousser le release | PAT du mainteneur avec scope `repo` + `workflow`         | Régénérer dans GitHub → Settings → Developer settings → Tokens. Haut risque si fuite.     |
| `NPM_TOKEN`    | [release.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml), [.npmrc](https://github.com/univ-lehavre/atlas/blob/main/.npmrc)                                                                                                           | Publication npm des packages `@univ-lehavre/atlas-*`                        | Token npm avec scope `publish` sur l'org `@univ-lehavre` | npm → Access tokens → revoke + recreate. Haut risque si fuite (publication malveillante). |
| `GITHUB_TOKEN` | [dependabot-auto-merge.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/dependabot-auto-merge.yml), [release.yml](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml)                                                   | Token injecté automatiquement par Actions, scope = repo courant             | Géré par GitHub (auto-rotation à chaque run)             | N/A — éphémère, pas de rotation manuelle.                                                 |

### Inventaire — Appwrite Console (apps déployées)

Par site Appwrite Sites (amarre, ecrin, find-an-expert) :

| Variable                                               | Apps concernées               | Usage                                                                                 | Owner                         | Rotation                                                                  |
| ------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `PUBLIC_APPWRITE_ENDPOINT`                             | amarre, ecrin                 | URL de l'instance Appwrite (publique, exposée au navigateur via `$env/static/public`) | Admins de l'instance Appwrite | N/A (URL stable). Changement = migration.                                 |
| `PUBLIC_APPWRITE_PROJECT`                              | amarre, ecrin                 | ID du projet Appwrite (publique)                                                      | Admins infra                  | N/A (ID stable).                                                          |
| `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT`                | find-an-expert                | Mêmes que ci-dessus mais privés (non préfixés `PUBLIC_`)                              | Admins infra                  | N/A.                                                                      |
| `APPWRITE_KEY`                                         | amarre, ecrin, find-an-expert | API key serveur, scope défini côté console Appwrite                                   | Admins infra / mainteneur     | Console Appwrite → Project → Settings → API keys → revoke + recreate.     |
| `APPWRITE_DB_ID`, `APPWRITE_DATABASE_ID`               | ecrin, find-an-expert         | ID de la base de données Appwrite                                                     | Admins infra                  | N/A (ID stable).                                                          |
| `APPWRITE_TABLE_ID_ALLOWED_EMAIL_DOMAINS_TO_SUBSCRIBE` | ecrin                         | ID de la table des domaines email autorisés                                           | Admins infra                  | N/A.                                                                      |
| `APPWRITE_CONSENT_EVENTS_COLLECTION_ID`                | find-an-expert                | ID de la collection d'événements de consentement                                      | Admins infra                  | N/A.                                                                      |
| `APPWRITE_CURRENT_CONSENTS_COLLECTION_ID`              | find-an-expert                | ID de la collection des consentements actuels                                         | Admins infra                  | N/A.                                                                      |
| `ALLOWED_DOMAINS_REGEXP`                               | amarre, find-an-expert        | Regex des domaines email autorisés (allowlist signup, ex. `@exemple\.fr`)             | Admins infra / mainteneur     | N/A (config). Modifier = redéployer.                                      |
| `PUBLIC_LOGIN_URL`                                     | amarre, ecrin, find-an-expert | URL de l'app pour générer les magic links de connexion                                | Admins infra                  | N/A.                                                                      |
| `PUBLIC_REDCAP_URL` / `REDCAP_URL` / `REDCAP_API_URL`  | amarre, ecrin, crf-dashboard  | URL de l'instance REDCap (CRF)                                                        | Admins infra                  | N/A.                                                                      |
| `REDCAP_API_TOKEN`                                     | amarre, ecrin                 | Token API REDCap (32-char hex), scope défini côté projet REDCap                       | Admins infra / mainteneur     | REDCap → Project → API → regenerate token + update Appwrite Site env var. |
| `OPENALEX_API_TOKEN`                                   | find-an-expert                | API key OpenAlex (premium polite pool)                                                | Mainteneur                    | openalex.org dashboard → revoke + recreate.                               |
| `OPENALEX_USER_AGENT`                                  | find-an-expert                | User-Agent OpenAlex polite-pool (`name/version (mailto:contact)`)                     | Mainteneur                    | N/A (string statique).                                                    |

### Inventaire — Dashboards internes

Apps de monitoring/admin, en principe non déployées en prod publique. Tournent en local (`pnpm -F atlas-dashboard dev`).

| Variable         | App             | Usage                                                                          | Owner                        | Rotation                                                                                       |
| ---------------- | --------------- | ------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`   | atlas-dashboard | Fetch des releases GitHub publics (read-only)                                  | Contributeur (token perso)   | github.com → Settings → Tokens → revoke + recreate. Scope minimal (`public_repo` suffit).      |
| `REDCAP_API_URL` | crf-dashboard   | Endpoint REDCap (lecture seule)                                                | Admins infra                 | N/A (URL).                                                                                     |
| `tokens.csv`     | crf-dashboard   | Fichier local listant les `token,project_id` REDCap par projet (pas d'env var) | Contributeur (export manuel) | Refaire l'export depuis REDCap. **Ne jamais commit** (cf. `.gitignore` pattern `*-token.csv`). |

### Fichiers locaux (machine contributeur, gitignored)

- `apps/*/.env` — copie locale du `.env.example` avec valeurs réelles
- `apps/*/.env.<host>` — variantes par environnement déployé (référence pour l'admin)
- `*-token.csv` — tokens REDCap par projet (cf. crf-dashboard)
- `redcap-token.csv` à la racine — fichier de token externe, jamais commité (audité 2026-05-19, faux positifs gitleaks résorbés sur la même période)

### Discipline `PUBLIC_*` vs privé (SvelteKit)

SvelteKit expose deux familles de variables d'environnement, avec une frontière stricte :

| Famille                                                     | Lu par                                        | Critère d'admission                                                       |
| ----------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `$env/static/private`, `$env/dynamic/private`               | Code serveur uniquement (`+server.ts`, hooks) | Tout ce qui n'a pas vocation à être lu par le navigateur                  |
| `$env/static/public` (préfixe **`PUBLIC_`** dans le `.env`) | Bundle navigateur **et** serveur              | Identifiants/URLs publics par construction (project ID Appwrite, URL API) |

**Règles d'or** :

1. **Toute variable préfixée `PUBLIC_` est publique** — incluse dans le bundle navigateur servi à n'importe quel client. Ne jamais y mettre une clé API serveur, un token, une regex de validation sensible, un identifiant de table interne.
2. **Inversement, toute valeur non-préfixée ne sera jamais lue côté navigateur** — SvelteKit refuse l'import à la compilation. C'est la garantie sur laquelle s'appuient `APPWRITE_KEY`, `REDCAP_API_TOKEN`, etc.
3. **Aucune variable d'env n'est commitée** : les `.env.example` ne contiennent que des _placeholders_, jamais des valeurs réelles (même de dev).

### Discipline observée dans atlas

Recensement croisé `apps/*/src/lib/server/**` vs `apps/*/src/lib/**` (non-server) :

| Pattern                    | Côté         | Exemple atlas                                       | Conforme à la discipline ? |
| -------------------------- | ------------ | --------------------------------------------------- | -------------------------- |
| `PUBLIC_APPWRITE_ENDPOINT` | navigateur   | URL exposée par le SDK Appwrite browser             | Oui — URL publique         |
| `PUBLIC_APPWRITE_PROJECT`  | navigateur   | ID projet exposé par le SDK Appwrite browser        | Oui — ID public            |
| `PUBLIC_LOGIN_URL`         | navigateur   | URL de l'app pour générer les magic links           | Oui                        |
| `PUBLIC_REDCAP_URL`        | navigateur   | URL d'une instance REDCap (publique, sans le token) | Oui                        |
| `APPWRITE_KEY`             | serveur seul | Clé API serveur Appwrite                            | Oui — privée               |
| `APPWRITE_DB_ID` etc.      | serveur seul | IDs internes de base / collection                   | Oui — non exposés          |
| `REDCAP_API_TOKEN`         | serveur seul | Token API REDCap (32 hex)                           | Oui — privée               |
| `OPENALEX_API_TOKEN`       | serveur seul | Token API OpenAlex                                  | Oui — privée               |
| `ALLOWED_DOMAINS_REGEXP`   | serveur seul | Regex d'allowlist signup                            | Oui — privée               |

**Audit récurrent** (à conduire au minimum lors de chaque revue trimestrielle — item 7.3 du tableau sine die de [ADR 0001](../decisions/0001-devsecops-perimetre-repo-sine-die)) :

```bash
# 1. Tout PUBLIC_* est-il bien public ? (rien de sensible glissé là)
grep -rn 'PUBLIC_' apps/*/.env.example

# 2. Aucune valeur réelle ne traîne dans les .env.example commités
grep -rnE 'PUBLIC_[A-Z_]+=https?://[^.]+\.' apps/*/.env.example  # doit lister uniquement des hosts d'exemple

# 3. Aucune fuite côté navigateur d'une variable non-PUBLIC_
grep -rn '\$env/static/private\|\$env/dynamic/private' apps/*/src/lib | grep -v server  # doit être vide
```

Un import de `$env/static/private` depuis un fichier consommé par le bundle navigateur (cf. `apps/*/src/lib/**` hors `server/`) est rejeté à la compilation par SvelteKit — c'est la garantie statique du compilateur, pas une convention. La règle de discipline ci-dessus ne vise qu'à éviter les faux pas en amont.

**Que faire du résultat de l'audit ?** Si les trois commandes ci-dessus ne remontent rien, l'audit est concluant — on note simplement la date du passage. Si l'une d'elles révèle un secret exposé, on bascule sur la procédure correspondante ci-dessous : **rotation générique** pour un secret à renouveler proprement, **procédure d'urgence** si on suspecte une fuite active.

### Procédure de rotation générique

1. **Identifier** le secret à rotater et l'app/workflow consommateur.
2. **Générer** le nouveau secret depuis l'émetteur (Appwrite, REDCap, npm, etc.).
3. **Mettre à jour** l'emplacement de stockage :
   - GitHub Secret : `gh secret set <NAME> --body <new_value>` ou Settings → Secrets and variables → Actions
   - Appwrite Site env var : Console Appwrite → Sites → variables d'environnement → mettre à jour → redéployer
   - Fichier `.env` local : éditer le fichier
4. **Révoquer** l'ancien secret côté émetteur (après s'être assuré que le nouveau fonctionne).
5. **Vérifier** : re-lancer un workflow CI (pour les secrets GH) ou re-déployer le site (pour les Appwrite vars).

### Procédure d'urgence (suspicion de fuite)

Cette procédure est résumée ici ; pour une réponse complète à un incident de sécurité, voir [Incident response](./incident-response).

1. **Révoquer immédiatement** l'ancien secret (étape 4 avant tout le reste).
2. **Audit** : `gh api repos/univ-lehavre/atlas/code-scanning/alerts` + onglet Security → Secret scanning pour vérifier si la fuite a été détectée.
3. **Si le secret a été commité** : `git filter-repo` pour purger l'historique + force-push coordonné avec l'équipe.
4. **Si secret runtime (Appwrite/REDCap)** : audit des logs côté émetteur pour identifier l'usage non autorisé.
5. **Post-mortem** : documenter l'incident et la mitigation dans une issue dédiée.

## Triage des findings — SLA de remédiation

Un [**SLA**](../glossary) (_Service Level Agreement_) est un engagement de délai. Ici, le délai maximum acceptable entre la **détection** d'un problème de sécurité et le **correctif déployé en production**, différencié par sévérité. Distinct du tempo de réponse à un incident actif (cf. [incident-response.md § Classification](./incident-response#1-classification-de-severite) pour les engagements P0–P3).

| Sévérité       | Sources typiques                                                                                                                | Délai max (détection → fix déployé)   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Critical**   | CVE critical sur dépendance prod ; CodeQL `error` exploitable à distance ; secret commité avec accès actif                      | **7 jours**                           |
| **High**       | CodeQL `high warning` ; Dependabot high ; finding ZAP high ; vulnérabilité applicative confirmée à exploit local                | **30 jours**                          |
| **Medium**     | CodeQL `medium warning` ; Dependabot moderate ; finding ZAP medium ; faiblesse de hardening (header manquant, cookie sans flag) | **90 jours (1 trimestre)**            |
| **Low / Info** | CodeQL `low/note` ; Dependabot low ; finding ZAP info ; hygiène (dead code, unused imports)                                     | Triage hebdomadaire, fix opportuniste |

> Ces délais sont des **objectifs indicatifs**, pas des engagements contractuels (cf. [SECURITY.md](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md) → note liminaire).

### Application pratique

- **Le compteur démarre** au moment de la détection vérifiable (date de l'alerte CodeQL / Dependabot / push gitleaks / réception du report PVR), pas au moment de l'analyse humaine.
- **Le compteur s'arrête** quand le correctif est en prod (merge `main` + déploiement Appwrite confirmé pour les apps, publish npm + provenance valide pour les packages).
- **Dérive autorisée** : si le fix dépend d'un upstream (CVE non patchée), documenter l'attente dans l'advisory privée et garder l'alerte ouverte ; le SLA reprend dès que le patch est disponible.
- **Si le SLA est dépassé** : escalader d'un cran (Medium dépassé → traiter comme High), notifier explicitement les owners, envisager une mitigation temporaire (rate-limit, désactivation d'endpoint, downgrade dépendance).

### Lien avec les triages déjà conduits

| Date       | Source     | Findings traités                            | Référence                                                 |
| ---------- | ---------- | ------------------------------------------- | --------------------------------------------------------- |
| 2026-05-21 | CodeQL     | 2 alertes URL-substring + command-injection | [PR #194](https://github.com/univ-lehavre/atlas/pull/194) |
| 2026-05-22 | CodeQL     | 13 fixes code + 26 dismissals justifiés     | [PR #198](https://github.com/univ-lehavre/atlas/pull/198) |
| 2026-05-21 | Dependabot | 7 alertes auto-fermées par les bumps        | résorbé via les PR Dependabot groupées                    |

## Surfaces exposées — apps et endpoints

Cartographie des surfaces publiques du monorepo : URLs des apps déployées et classification public/auth des endpoints HTTP.

> Mis à jour : 2026-05-19.

### Apps déployées (Appwrite Sites)

| App                | URL prod      | URL preview / staging | Owner        | Source                                                                                       |
| ------------------ | ------------- | --------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| **amarre**         | _à compléter_ | _à compléter_         | Admins infra | [apps/amarre/](https://github.com/univ-lehavre/atlas/tree/main/apps/amarre/)                 |
| **ecrin**          | _à compléter_ | _à compléter_         | Admins infra | [apps/ecrin/](https://github.com/univ-lehavre/atlas/tree/main/apps/ecrin/)                   |
| **find-an-expert** | _à compléter_ | _à compléter_         | Admins infra | [apps/find-an-expert/](https://github.com/univ-lehavre/atlas/tree/main/apps/find-an-expert/) |

> Les URLs prod ne sont pas dans le repo (configuration Appwrite Sites). À renseigner par l'admin Appwrite et à figer ici pour traçabilité.

#### Dashboards internes (non déployés)

| App             | Mode d'exécution             | Périmètre                                  |
| --------------- | ---------------------------- | ------------------------------------------ |
| atlas-dashboard | Local seulement (`pnpm dev`) | Monitoring releases GitHub + downloads npm |
| crf-dashboard   | Local seulement (`pnpm dev`) | Visualisation logs REDCap                  |

### Endpoints HTTP — classification

Convention : **🌐 PUBLIC** = accessible sans session ; **🔒 AUTH** = `locals.userId` validé ; **🏠 LOCAL** = app non déployée.

#### amarre — [routes/api/v1/](https://github.com/univ-lehavre/atlas/tree/main/apps/amarre/src/routes/api/v1/)

| Endpoint            | Méthode | Accès     | Justification                                            |
| ------------------- | ------- | --------- | -------------------------------------------------------- |
| `/auth/signup`      | POST    | 🌐 PUBLIC | Création de compte (allowlist domaine email)             |
| `/auth/login`       | POST    | 🌐 PUBLIC | Complète un magic link (userId + secret en URL)          |
| `/auth/logout`      | POST    | 🔒 AUTH   | Termine la session courante                              |
| `/me`               | GET     | 🔒 AUTH   | Profil utilisateur courant                               |
| `/surveys/list`     | GET     | 🔒 AUTH   | Liste des demandes de l'utilisateur (cookieAuth OpenAPI) |
| `/surveys/new`      | POST    | 🔒 AUTH   | Nouvelle demande                                         |
| `/surveys/links`    | GET     | 🔒 AUTH   | Lien vers formulaire et validation finale                |
| `/surveys/pdf`      | GET     | 🔒 AUTH   | Export PDF d'une demande                                 |
| `/surveys/download` | GET     | 🔒 AUTH   | Téléchargement d'un fichier joint                        |

#### ecrin — [routes/api/v1/](https://github.com/univ-lehavre/atlas/tree/main/apps/ecrin/src/routes/api/v1/)

| Endpoint            | Méthode | Accès         | Justification                                                                                                                      |
| ------------------- | ------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/openapi.json`     | GET     | 🌐 PUBLIC     | Documentation API (OpenAPI 3.1)                                                                                                    |
| `/auth/signup`      | POST    | 🌐 PUBLIC     | Création de compte                                                                                                                 |
| `/auth/login`       | POST    | 🌐 PUBLIC     | Magic link                                                                                                                         |
| `/auth/logout`      | POST    | 🔒 AUTH       | Termine session                                                                                                                    |
| `/auth/delete`      | DELETE  | 🔒 AUTH       | Suppression du compte                                                                                                              |
| `/me`               | GET     | 🔒 AUTH       | Profil utilisateur                                                                                                                 |
| `/users`            | GET     | 🔒 AUTH       | Liste utilisateurs (admin ?)                                                                                                       |
| `/graphs`           | GET     | 🌐 **PUBLIC** | ⚠️ Graphe d'un questionnaire par `?record=<id>`. Explicitement public ("Public endpoint: requires `record` query param, no auth"). |
| `/graphs/global`    | GET     | 🔒 AUTH       | Graphe global                                                                                                                      |
| `/surveys/url`      | GET     | 🔒 AUTH       | URL du questionnaire                                                                                                               |
| `/surveys/delete`   | DELETE  | 🔒 AUTH       | Suppression d'un questionnaire                                                                                                     |
| `/surveys/download` | GET     | 🔒 AUTH       | Téléchargement de réponses                                                                                                         |
| `/account/push`     | POST    | 🔒 AUTH       | Push vers REDCap                                                                                                                   |
| `/account/pushed`   | GET     | 🔒 AUTH       | Statut du push                                                                                                                     |

#### find-an-expert — [routes/api/v1/](https://github.com/univ-lehavre/atlas/tree/main/apps/find-an-expert/src/routes/api/v1/)

| Endpoint                      | Méthode         | Accès                       | Justification                                                                                                                                                                       |
| ----------------------------- | --------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/health`                     | GET             | 🌐 PUBLIC                   | Health check (Appwrite + connectivité internet)                                                                                                                                     |
| `/auth/signup`                | POST            | 🌐 PUBLIC                   | Création de compte                                                                                                                                                                  |
| `/auth/login`                 | POST            | 🌐 PUBLIC                   | Magic link                                                                                                                                                                          |
| `/auth/logout`                | POST            | 🔒 AUTH                     | Termine session                                                                                                                                                                     |
| `/users/me`                   | GET             | 🔒 AUTH                     | Profil utilisateur                                                                                                                                                                  |
| `/institutions/search`        | GET             | 🌐 **PUBLIC**               | ⚠️ Recherche d'institutions via OpenAlex (`?q=<query>`). Aucun gate auth. Lecture seule sur données publiques OpenAlex mais expose le token `OPENALEX_API_TOKEN` aux abus de quota. |
| `/institutions/stats`         | GET             | 🔒 AUTH                     | Stats sur institutions sélectionnées                                                                                                                                                |
| `/institutions/[id]/stats`    | GET             | 🔒 AUTH                     | Stats d'une institution                                                                                                                                                             |
| `/works/counts`               | GET             | 🔒 AUTH                     | Comptage de publications (max 10 institutions)                                                                                                                                      |
| `/repositories/[id]`          | GET             | 🌐 **PUBLIC**               | ⚠️ URLs du repository GitHub courant (lecture `process.cwd()` + git remote). Risque faible (info publique) mais aucun gate.                                                         |
| `/repositories/[id]/analysis` | GET             | 🌐 **PUBLIC** (à confirmer) | Analyse d'un repository                                                                                                                                                             |
| `/consents`                   | GET             | 🔒 AUTH                     | Liste des consentements                                                                                                                                                             |
| `/consents/[id]`              | GET/POST/DELETE | 🔒 AUTH                     | Statut / Grant / Revoke consentement                                                                                                                                                |

#### atlas-dashboard — local seulement

| Endpoint   | Méthode | Accès    | Notes                                         |
| ---------- | ------- | -------- | --------------------------------------------- |
| `/refresh` | GET     | 🏠 LOCAL | SSE pour rafraîchir le cache (releases + npm) |
| `/stats`   | GET     | 🏠 LOCAL | Renvoie le cache calculé                      |

#### crf-dashboard — local seulement

| Endpoint | Méthode | Accès    | Notes                                     |
| -------- | ------- | -------- | ----------------------------------------- |
| `/logs`  | GET     | 🏠 LOCAL | Logs REDCap par projet (lit `tokens.csv`) |
| `/stats` | GET     | 🏠 LOCAL | Statistiques calendrier                   |

### Points d'attention identifiés (à arbitrer)

Trois endpoints sont publics par décision implicite ou explicite — chacun mérite un examen :

1. **`ecrin /graphs?record=<id>`** — explicitement public dans le code. Question : un attaquant connaissant un `record_id` peut-il lire le graphe complet ? Si oui, est-ce conforme aux attentes RGPD côté ECRIN ? Le rate limiting applicatif atténue l'énumération brute.

2. **`find-an-expert /institutions/search?q=<query>`** — pas de gate auth. Utilise `OPENALEX_API_TOKEN` côté serveur. Risque : abus de quota OpenAlex via spam de requêtes anonymes. À traiter via rate limiting ou ajout d'un gate auth si la recherche n'a pas vocation à être anonyme.

3. **`find-an-expert /repositories/[id]` et `/analysis`** — pas de gate auth. Récupère les URLs du repository GitHub courant. Risque faible (info publique) mais surface inattendue. À documenter ou gater.

### Mitigations recommandées

- **Rate limiting** sur tous les endpoints publics (en place ; store `in-memory` mono-instance, migration vers un store partagé reportée sine die — cf. [ADR 0001](../decisions/0001-devsecops-perimetre-repo-sine-die))
- **Validation stricte** des inputs (`record`, `q`, `id`) avant requête en aval
- **Logs d'accès** : tracer les accès à `/graphs` et `/institutions/search` pour détecter les patterns d'abus
- **Headers HTTP de sécurité** sur les réponses (CSP, etc.) — factorisés dans `@univ-lehavre/atlas-sveltekit-csp` (cf. [ADR 0019](../decisions/0019-derogations-workspace-audit))

## DAST — Dynamic Application Security Testing

Complément du SAST (CodeQL, cf. [SECURITY.md](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md)) : sonder le comportement réel d'une app déployée pour détecter ce que l'analyse statique ne voit pas (headers HTTP manquants, redirections vers HTTP, mixed content, info disclosure, cookies sans flags, etc.).

Outil : [OWASP ZAP](https://www.zaproxy.org/) en mode **baseline** (passif uniquement, pas d'attaque active), via l'action GitHub [`zaproxy/action-baseline`](https://github.com/zaproxy/action-baseline).

### État actuel

**État actuel** — workflow déclenché manuellement uniquement, sur une URL passée en input :

- Trigger : `workflow_dispatch`
- Cible : input `target_url` (URL accessible depuis un runner GitHub)
- Coût : ~5-10 min par scan (spider + passive scan)
- Rapport : artefact `zap_scan` (HTML + Markdown + JSON, 90 jours)
- Issue auto-créée si findings non-IGNORE (cf. config dans [`zap-baseline.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/zap-baseline.yml))

**Étape suivante (différée)** — automatisation nightly contre prod ou stack locale. Trois pistes en attente :

1. **Nightly contre prod** : nécessite que les URLs prod soient figées dans la section [Surfaces exposées](#surfaces-exposees-apps-et-endpoints), et que les **admins infra soient prévenus** du trafic ZAP pour éviter alertes IDS ou rate-limit. Décision en attente.
2. **Nightly contre `sandbox/amarre-sandbox/`** : monter la stack docker-compose (Appwrite + REDCap + amarre) en CI et scanner `localhost:5173`. Lourd (~10 min CI supplémentaires) mais aucune coordination externe nécessaire. Couvre uniquement amarre.
3. **Sur PR avec preview URL** : Appwrite Sites n'offre pas de previews automatiques par PR. Hors périmètre tant qu'on reste sur ce déploiement.

### Lancer un scan

1. Aller sur [Actions → ZAP Baseline](https://github.com/univ-lehavre/atlas/actions/workflows/zap-baseline.yml)
2. Cliquer "Run workflow", choisir la branche `main`
3. Remplir l'URL cible (ex : `https://<app-host>`)
4. Choisir `fail_action` :
   - `warn` (défaut) : le job réussit même avec des findings. Adapté au premier scan, à l'exploration, au shadow IT.
   - `fail` : le job échoue dès qu'une alerte non-IGNORE remonte. Adapté quand le scan est branché sur un gate (release, merge).
5. Attendre 5-10 min. Le rapport apparaît dans la section "Artifacts" du run + une issue GitHub résume les findings.

### Interpréter le rapport

ZAP classe les findings par niveau de risque :

- **High** : à corriger en priorité — XSS confirmé, mixed content sur des pages sensibles, secrets exposés dans une réponse.
- **Medium** : sérieux mais souvent contextuel — cookie sans `Secure`, CSP manquante, redirect ouvert.
- **Low** / **Informational** : à évaluer mais souvent acceptable — headers d'info versions, commentaires HTML laissés en place.

Les findings de cette app sont en grande partie déjà couverts par les en-têtes de sécurité (CSP, HSTS, etc.) et le hardening des cookies de session. Un scan sain devrait remonter **0 high**, et les low/info peuvent être triés au cas par cas.

### Gérer les faux positifs

Tout finding considéré comme faux positif ou hors périmètre doit être documenté dans [`.zap/rules.tsv`](https://github.com/univ-lehavre/atlas/blob/main/.zap/rules.tsv) (un par ligne avec justification).

**Ne jamais** silencer une alerte sans commentaire — le `IGNORE` sans contexte devient une zone d'ombre que personne ne sait plus si elle est légitime.

### Risque résiduel

ZAP baseline est **passif** : il sonde des URLs trouvées via spider + analyse les réponses, mais n'envoie pas de payloads malveillants. Le risque pour la cible est limité à du trafic web standard, comparable à un crawler indexeur.

Néanmoins :

- Le scan peut **déclencher des envois d'email** si le crawler rencontre un formulaire de signup → privilégier une cible avec un rate-limit déjà actif (couvert applicativement côté amarre/ecrin/find-an-expert).
- Le scan peut **créer des comptes test** sur Appwrite si le signup ne demande pas de captcha → laisser le rate-limit faire son travail et nettoyer manuellement après si nécessaire.
- Le scan **respecte robots.txt** par défaut — pas de scan des routes exclues. Vérifier que `robots.txt` ne bloque pas des routes qu'on veut couvrir.

## SBOM (Software Bill of Materials)

Inventaire détaillé et machine-readable de toutes les dépendances incluses dans atlas, au format [CycloneDX 1.6](https://cyclonedx.org/specification/overview/).

Sert à :

- répondre à un audit de chaîne d'approvisionnement (qui est mon vendor, où vient cette `lodash@4.17.20` ?) ;
- croiser un advisory CVE avec la liste exacte des packages déployés ;
- alimenter un outil de Dependency-Track / Trivy / OSV-Scanner.

### Où le trouver

Un SBOM est généré **automatiquement** à chaque push sur `main` par le workflow [`.github/workflows/sbom.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/sbom.yml).

- **Récent (≤ 90 jours)** : artefact `sbom-cyclonedx-<sha>` attaché au run du workflow → [Actions → SBOM](https://github.com/univ-lehavre/atlas/actions/workflows/sbom.yml).
- **Plus ancien (> 90 jours)** : non conservé par défaut. Pour archive long-terme, snapshoter manuellement (cf. ci-dessous).
- **Pour une release publiée** : le SBOM de la release inclut le SHA du commit qui a déclenché le publish — récupérable via le run SBOM correspondant.

### Comment l'utiliser

```bash
# Télécharger le dernier SBOM
gh run download -R univ-lehavre/atlas \
  --name sbom-cyclonedx-$(git rev-parse origin/main)

# Compter les composants
jq '.components | length' sbom-cyclonedx.json

# Lister les dépendances d'un type donné
jq '.components[] | select(.type == "library") | .purl' sbom-cyclonedx.json

# Croiser avec une CVE (via OSV-Scanner)
osv-scanner --sbom sbom-cyclonedx.json

# Importer dans Dependency-Track (si self-hosted)
curl -X POST https://dt.example.org/api/v1/bom \
  -H "X-Api-Key: $DT_API_KEY" \
  -F "project=<project-uuid>" \
  -F "bom=@sbom-cyclonedx.json"
```

### Snapshot manuel (archive long-terme)

Pour fixer un SBOM dans l'historique git (audit, release publique documentée, divergence à conserver), créer un dossier dédié et y déposer le fichier :

```bash
# Depuis un run SBOM réussi
mkdir -p docs/quality/sbom-archive
gh run download <run-id> --name sbom-cyclonedx-<sha>
mv sbom-cyclonedx.json docs/quality/sbom-archive/atlas-$(date -u +%Y%m%d)-<sha>.json
git add docs/quality/sbom-archive/atlas-*.json
git commit -m "docs(quality): snapshot SBOM atlas-$(date -u +%Y-%m-%d)"
```

Convention de nommage : `atlas-YYYYMMDD-<sha-court>.json`. Garder ces snapshots au strict minimum — chaque SBOM pèse ~quelques MB et le but du dossier n'est pas de conserver toute l'histoire, juste les jalons auditables (releases majeures, post-incident, demande explicite d'un auditeur).

### Format

CycloneDX 1.6, généré par [`@cyclonedx/cdxgen`](https://github.com/CycloneDX/cdxgen) épinglé à la version `CDXGEN_VERSION` du workflow (cf. en-tête de `sbom.yml`). Métadonnées incluses :

- `metadata.timestamp` : date de génération
- `metadata.tools[]` : version exacte de cdxgen + Node
- `metadata.component.version` : SHA du commit
- `components[]` : toutes les dépendances directes et transitives avec PURL, hash, licences détectées
- `dependencies[]` : graphe d'inclusion (qui dépend de qui)

### Limitations connues

- **Svelte components** : cdxgen ne parse pas les imports inline dans les fichiers `.svelte`. Les dépendances arrivent uniquement via `pnpm-lock.yaml`, donc le résultat reste correct au niveau package mais ne descend pas au niveau fichier `.svelte`.
- **Docker** : ce SBOM couvre la chaîne npm uniquement. Les images Docker (Appwrite, REDCap dans `sandbox/`) ont leur propre SBOM à générer séparément.
- **Privacy** : le SBOM est public (artefact GitHub Actions sur repo public). Aucun secret n'y figure — c'est de la pure métadonnée de dépendance.
