---
title: "0090 — Remote cache Turbo adossé au cache GitHub Actions"
---

## Contexte

L'[ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/) a posé
le cache Turbo de la CI sur **`actions/cache`** (répertoire `.turbo`, clé par
contenu) et **écarté le remote cache Turbo** « pour l'instant » : Vercel envoie
les hashs/artefacts chez un tiers, un self-hosté ajoute de l'ops. Les jetons
`TURBO_TOKEN`/`TURBO_TEAM` sont restés **câblés dormants** dans l'`env` des
workflows, précisément pour permettre une activation ultérieure.

Ce cache `actions/cache` a une **limite structurelle** : `actions/cache`
**n'écrase pas** une entrée existante. Les cinq jobs de `ci.yml` qui déclenchent
`^build` (Build, Test, Typecheck, Lint, Audit) restaurent la **même** clé
`.turbo` **au démarrage** — donc l'état du run _précédent_ — puis rebuildent **en
parallèle sans se partager** : seul le premier job qui termine peuple le cache
du run suivant. Le cache marche **entre runs**, pas **entre jobs d'un même run**.
Sur une PR qui invalide le cache (bump de lock, paquet feuille très importé), le
même `^build` se répète dans jusqu'à cinq runners.

Un **remote cache Turbo** résout cela (store partagé, écriture concurrente, hits
intra-run **et** inter-run) — mais les deux options connues à l'ADR 0061
restaient exclues. Une **troisième voie** a émergé : un remote cache Turbo
**adossé au cache GitHub Actions** lui-même (proxy local sur `localhost`,
stockage via l'API `@actions/cache`). Ni tiers (Vercel), ni infra à opérer.

## Décision

Activer le **remote cache Turbo adossé au cache GitHub Actions**, via l'action
[`rharkor/caching-for-turbo`](https://github.com/rharkor/caching-for-turbo)
(épinglée par SHA, `v2.5.0`). Elle lance un serveur de remote cache Turbo local
(`localhost:41230`) dont le **backend de stockage est le cache GitHub Actions**,
et câble automatiquement `TURBO_API`/`TURBO_TOKEN`/`TURBO_TEAM` vers ce serveur.

Concrètement :

1. Le step est ajouté **dans la composite `.github/actions/setup-workspace`**,
   avant l'install/build — il profite donc à **tous** les workflows qui
   l'utilisent (`ci.yml`, `docs.yml`), sans duplication.
2. Le step **`actions/cache` sur `.turbo`** de la composite est **retiré** :
   `caching-for-turbo` le remplace intégralement (le cache passe désormais par le
   proxy, pas par un tar de `.turbo`).
3. Les `TURBO_TOKEN`/`TURBO_TEAM` **dormants** posés dans l'`env` des workflows
   (qui pointaient vers un remote Vercel inexistant) sont **retirés** :
   `caching-for-turbo` définit les siens, un reliquat entrerait en conflit.

## Alternatives écartées

- **Remote cache Vercel** — les hashs/artefacts partent chez un tiers ; en
  tension avec la neutralité du dépôt. Déjà écarté par l'ADR 0061.
- **Remote cache self-hosté** (`ducktors/turborepo-remote-cache` sur infra
  interne) — donnerait le même résultat sans tiers, mais **aucune infra n'est
  disponible** aujourd'hui pour l'héberger (le cluster n'est pas ce point). À
  reconsidérer si un besoin d'un cache mutualisé hors GitHub apparaît.
- **Job `prepare` unique** (un job amont build tout une fois, partage `.turbo` /
  `dist` via `upload-artifact`, les jobs suivants le téléchargent) — supprime la
  répétition de `^build` **sans dépendance tierce**, mais introduit une
  **barrière** (les jobs attendent `prepare`), en tension avec le fan-out
  parallèle de l'[ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/).
  Écarté au profit du remote cache qui préserve le parallélisme.

## Statut

Accepted. **Amende l'[ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)** :
le « pas de remote cache pour l'instant » est levé par la troisième voie (backend
= cache GitHub Actions), et les jetons ne sont plus dormants mais gérés par
l'action.

## Conséquences

- **Dépendance tierce critique du pipeline.** `caching-for-turbo` intercepte
  **tout** le cache Turbo de la CI. Épinglée par SHA (comme toute action, ADR
  0084/scorecard) ; un dysfonctionnement dégrade vers un cache froid (turbo
  rebuild tout) — **pas** un échec de build. Maintenue par Dependabot (écosystème
  github-actions), bump revu comme les autres actions.
- **Gain attendu.** Hits de cache réels **intra-run** (les 5 jobs `^build`
  partagent) et **inter-run** ; `^build`/`lint`/`typecheck` d'un contenu déjà
  validé tombent en cache. Le plus gros poste de `ci.yml` (Lint) et le job Build
  bénéficient directement. Cible : PR incrémentales nettement plus rapides.
- **Périmètre du cache = le dépôt.** Le cache GitHub Actions est scopé par dépôt
  et branche (les caches de `main` sont lisibles par les PR, pas l'inverse) —
  comportement identique au `actions/cache` précédent, aucune fuite inter-dépôt.
- **Rien à opérer.** Pas de serveur, pas de secret à gérer : le backend est le
  cache GitHub déjà utilisé. Le quota de cache GitHub (10 Go/dépôt, éviction LRU)
  s'applique ; `caching-for-turbo` s'appuie sur l'éviction automatique de GitHub.

Voir aussi [ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)
(cache Turbo initial, parallélisation) et
[ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/) (court-circuit par
chemin — orthogonal : le cache accélère ce qui tourne, le court-circuit évite ce
qui n'a pas à tourner).
