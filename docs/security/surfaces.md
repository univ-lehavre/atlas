# Surfaces exposées — apps et endpoints

Cartographie des surfaces publiques du monorepo : URLs des apps déployées et classification public/auth des endpoints HTTP.

> Mis à jour : 2026-05-19 (Phase 0.3 du plan DevSecOps).

## Apps déployées (Appwrite Sites)

| App                | URL prod                         | URL preview / staging       | Owner   | Source                        |
| ------------------ | -------------------------------- | --------------------------- | ------- | ----------------------------- |
| **amarre**         | _à compléter_                    | _à compléter_               | DSI ULHN | [apps/amarre/](../../apps/amarre/) |
| **ecrin**          | _à compléter_                    | _à compléter_               | DSI ULHN | [apps/ecrin/](../../apps/ecrin/) |
| **find-an-expert** | _à compléter_                    | _à compléter_               | DSI ULHN | [apps/find-an-expert/](../../apps/find-an-expert/) |

> Les URLs prod ne sont pas dans le repo (configuration Appwrite Sites). À renseigner par l'admin Appwrite et à figer ici pour traçabilité.

### Dashboards internes (non déployés)

| App               | Mode d'exécution            | Périmètre                                  |
| ----------------- | --------------------------- | ------------------------------------------ |
| atlas-dashboard   | Local seulement (`pnpm dev`) | Monitoring releases GitHub + downloads npm |
| crf-dashboard     | Local seulement (`pnpm dev`) | Visualisation logs REDCap                  |

## Endpoints HTTP — classification

Convention : **🌐 PUBLIC** = accessible sans session ; **🔒 AUTH** = `locals.userId` validé ; **🏠 LOCAL** = app non déployée.

### amarre — [apps/amarre/src/routes/api/v1/](../../apps/amarre/src/routes/api/v1/)

| Endpoint                  | Méthode | Accès | Justification                                       |
| ------------------------- | ------- | ----- | --------------------------------------------------- |
| `/auth/signup`            | POST    | 🌐 PUBLIC | Création de compte (allowlist domaine email)        |
| `/auth/login`             | POST    | 🌐 PUBLIC | Complète un magic link (userId + secret en URL)     |
| `/auth/logout`            | POST    | 🔒 AUTH | Termine la session courante                          |
| `/me`                     | GET     | 🔒 AUTH | Profil utilisateur courant                           |
| `/surveys/list`           | GET     | 🔒 AUTH | Liste des demandes de l'utilisateur (cookieAuth OpenAPI) |
| `/surveys/new`            | POST    | 🔒 AUTH | Nouvelle demande                                     |
| `/surveys/links`          | GET     | 🔒 AUTH | Lien vers formulaire et validation finale            |
| `/surveys/pdf`            | GET     | 🔒 AUTH | Export PDF d'une demande                             |
| `/surveys/download`       | GET     | 🔒 AUTH | Téléchargement d'un fichier joint                    |

### ecrin — [apps/ecrin/src/routes/api/v1/](../../apps/ecrin/src/routes/api/v1/)

| Endpoint                  | Méthode | Accès | Justification                                       |
| ------------------------- | ------- | ----- | --------------------------------------------------- |
| `/openapi.json`           | GET     | 🌐 PUBLIC | Documentation API (OpenAPI 3.1)                     |
| `/auth/signup`            | POST    | 🌐 PUBLIC | Création de compte                                  |
| `/auth/login`             | POST    | 🌐 PUBLIC | Magic link                                          |
| `/auth/logout`            | POST    | 🔒 AUTH | Termine session                                     |
| `/auth/delete`            | DELETE  | 🔒 AUTH | Suppression du compte                               |
| `/me`                     | GET     | 🔒 AUTH | Profil utilisateur                                  |
| `/users`                  | GET     | 🔒 AUTH | Liste utilisateurs (admin ?)                        |
| `/graphs`                 | GET     | 🌐 **PUBLIC** | ⚠️ Graphe d'un questionnaire par `?record=<id>`. Explicitement public ("Public endpoint: requires `record` query param, no auth" ligne 5). |
| `/graphs/global`          | GET     | 🔒 AUTH | Graphe global                                       |
| `/surveys/url`            | GET     | 🔒 AUTH | URL du questionnaire                                |
| `/surveys/delete`         | DELETE  | 🔒 AUTH | Suppression d'un questionnaire                      |
| `/surveys/download`       | GET     | 🔒 AUTH | Téléchargement de réponses                          |
| `/account/push`           | POST    | 🔒 AUTH | Push vers REDCap                                    |
| `/account/pushed`         | GET     | 🔒 AUTH | Statut du push                                      |

### find-an-expert — [apps/find-an-expert/src/routes/api/v1/](../../apps/find-an-expert/src/routes/api/v1/)

| Endpoint                              | Méthode | Accès | Justification                                       |
| ------------------------------------- | ------- | ----- | --------------------------------------------------- |
| `/health`                             | GET     | 🌐 PUBLIC | Health check (Appwrite + connectivité internet)     |
| `/auth/signup`                        | POST    | 🌐 PUBLIC | Création de compte                                  |
| `/auth/login`                         | POST    | 🌐 PUBLIC | Magic link                                          |
| `/auth/logout`                        | POST    | 🔒 AUTH | Termine session                                     |
| `/users/me`                           | GET     | 🔒 AUTH | Profil utilisateur                                  |
| `/institutions/search`                | GET     | 🌐 **PUBLIC** | ⚠️ Recherche d'institutions via OpenAlex (`?q=<query>`). Aucun gate auth. Lecture seule sur données publiques OpenAlex mais expose le token `OPENALEX_API_TOKEN` aux abus de quota. |
| `/institutions/stats`                 | GET     | 🔒 AUTH | Stats sur institutions sélectionnées                |
| `/institutions/[id]/stats`            | GET     | 🔒 AUTH | Stats d'une institution                             |
| `/works/counts`                       | GET     | 🔒 AUTH | Comptage de publications (max 10 institutions)      |
| `/repositories/[id]`                  | GET     | 🌐 **PUBLIC** | ⚠️ URLs du repository GitHub courant (lecture `process.cwd()` + git remote). Risque faible (info publique) mais aucun gate. |
| `/repositories/[id]/analysis`         | GET     | 🌐 **PUBLIC** (à confirmer) | Analyse d'un repository                            |
| `/consents`                           | GET     | 🔒 AUTH | Liste des consentements                             |
| `/consents/[id]`                      | GET/POST/DELETE | 🔒 AUTH | Statut / Grant / Revoke consentement       |

### atlas-dashboard — local seulement

| Endpoint        | Méthode | Accès      | Notes                                          |
| --------------- | ------- | ---------- | ---------------------------------------------- |
| `/refresh`      | GET     | 🏠 LOCAL   | SSE pour rafraîchir le cache (releases + npm)  |
| `/stats`        | GET     | 🏠 LOCAL   | Renvoie le cache calculé                       |

### crf-dashboard — local seulement

| Endpoint        | Méthode | Accès      | Notes                                          |
| --------------- | ------- | ---------- | ---------------------------------------------- |
| `/logs`         | GET     | 🏠 LOCAL   | Logs REDCap par projet (lit `tokens.csv`)      |
| `/stats`        | GET     | 🏠 LOCAL   | Statistiques calendrier                        |

## Points d'attention identifiés (à arbitrer)

Trois endpoints sont publics par décision implicite ou explicite — chacun mérite un examen :

1. **`ecrin /graphs?record=<id>`** — explicitement public dans le code. Question : un attaquant connaissant un `record_id` peut-il lire le graphe complet ? Si oui, est-ce conforme aux attentes RGPD côté ECRIN ? Voir Phase 6.5 (rate limiting) pour atténuer l'énumération brute.

2. **`find-an-expert /institutions/search?q=<query>`** — pas de gate auth. Utilise `OPENALEX_API_TOKEN` côté serveur. Risque : abus de quota OpenAlex via spam de requêtes anonymes. À traiter via rate limiting (Phase 6.5) ou ajout d'un gate auth si la recherche n'a pas vocation à être anonyme.

3. **`find-an-expert /repositories/[id]` et `/analysis`** — pas de gate auth. Récupère les URLs du repository GitHub courant. Risque faible (info publique) mais surface inattendue. À documenter ou gater.

## Mitigations recommandées

- **Rate limiting** sur tous les endpoints publics (cf. [TODO §6.5](../../TODO.md))
- **Validation stricte** des inputs (`record`, `q`, `id`) avant requête en aval
- **Logs d'accès** : tracer les accès à `/graphs` et `/institutions/search` pour détecter les patterns d'abus
- **Headers HTTP de sécurité** sur les réponses (CSP, etc.) — cf. [TODO §6.3](../../TODO.md)
