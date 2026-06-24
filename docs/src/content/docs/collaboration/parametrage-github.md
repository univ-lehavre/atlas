---
title: Paramétrage du dépôt GitHub
---

Cette page décrit la **configuration du dépôt** Atlas sur GitHub :
protections de branche, propriété du code, automatisation des
dépendances, secrets et permissions. Elle s'adresse aux **mainteneurs**
qui administrent le dépôt — un contributeur n'a pas besoin de la lire pour
ouvrir une PR.

Le principe directeur : **tout ce qui peut être versionné l'est**. Les
fichiers sous [`.github/`](https://github.com/univ-lehavre/atlas/blob/main/.github) décrivent la configuration en
clair, relue comme du code. Seuls les réglages que GitHub n'expose pas en
fichier (protections de branche, secrets, autorisations Actions) vivent
dans l'interface — cette page sert alors de référence sur leur état
attendu.

## Configuration versionnée (`.github/`)

| Fichier                                                                                                        | Rôle                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`CODEOWNERS`](https://github.com/univ-lehavre/atlas/tree/main/.github/CODEOWNERS)                             | Propriétaires de code requis en revue sur les chemins sensibles                                          |
| [`dependabot.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/dependabot.yml)                     | Mises à jour automatiques des dépendances npm et GitHub Actions                                          |
| [`pull_request_template.md`](https://github.com/univ-lehavre/atlas/blob/main/.github/pull_request_template.md) | Gabarit de PR (pourquoi / quoi / comment vérifier)                                                       |
| [`workflows/*.yml`](https://github.com/univ-lehavre/atlas/tree/main/.github/workflows)                         | Workflows GitHub Actions (CI, sécurité, release, docs) — voir [Pipeline CI](/atlas/quality/ci-pipeline/) |

### Propriété du code (CODEOWNERS)

[`CODEOWNERS`](https://github.com/univ-lehavre/atlas/tree/main/.github/CODEOWNERS) associe des chemins à des
propriétaires automatiquement **requis en revue** sur les PR qui les
touchent. Le propriétaire par défaut (`*`) est `@chasset` ; des règles
plus spécifiques couvrent les zones sensibles :

- authentification et session (`packages/auth`, `packages/baas`) ;
- client de l'API CRF, qui manipule des jetons (`packages/crf-client`,
  `packages/crf-core`, `services/crf`) ;
- CI/CD et configuration du dépôt (`.github/workflows`, `dependabot.yml`,
  `CODEOWNERS`, `scripts/release`) ;
- documents de sécurité et de politique (`SECURITY.md`, `.gitleaks.toml`,
  `lefthook.yml`) ;
- configuration racine du workspace (`package.json`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`).

> **Facteur de bus = 1.** Tous les chemins pointent aujourd'hui vers un
> seul mainteneur. Ajouter des propriétaires secondaires sur les chemins à
> haut risque renforcerait la couverture de revue — c'est noté en
> commentaire dans le fichier lui-même.

### Mises à jour de dépendances (Dependabot)

[`dependabot.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/dependabot.yml) maintient trois
écosystèmes à jour, chaque **lundi à 06:00 (Europe/Paris)** :

| Écosystème                            | Regroupement                                          | Préfixe de commit |
| ------------------------------------- | ----------------------------------------------------- | ----------------- |
| **npm** (racine)                      | tous les `minor` + `patch` dans une PR unique par run | `chore`           |
| **github-actions**                    | tous les bumps d'actions dans une PR unique par run   | `ci`              |
| **pip** (`/dataops/citation-dagster`) | tous les `minor` + `patch` dans une PR unique par run | `chore`           |

Pour **limiter le bruit de PR**, `open-pull-requests-limit: 1` garantit
une seule PR Dependabot ouverte par écosystème à la fois ; les mises à
jour suivantes s'enfilent en file d'attente. Les `major` ouvrent leur
propre PR (comportement par défaut de Dependabot) mais restent soumis à la
même limite. Les **alertes de sécurité** ne sont pas affectées par cette
limite et restent prioritaires.

Une partie des bumps Dependabot est fusionnée automatiquement par
[`dependabot-auto-merge.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/dependabot-auto-merge.yml)
une fois la CI verte : **tous les `patch`**, et les `minor` **sur les
`devDependencies` seulement** (`direct:development` — eslint, vitest,
prettier… qui ne touchent pas le code de production). Les `minor` sur les
dépendances de _runtime_ et **tous** les `major` restent en revue
manuelle.

## Protections de branche (`main`)

La branche `main` est protégée. Ces réglages vivent dans l'interface
GitHub (_Settings → Branches_) ; leur état attendu :

- **Pull request obligatoire** — pas de push direct sur `main`. C'est
  doublé localement par les hooks _pre-commit_ et _pre-push_, qui refusent
  tout commit/push direct sur `main` (voir [lefthook.yml](https://github.com/univ-lehavre/atlas/blob/main/lefthook.yml)).
- **Au moins une revue approuvée**, dont celle du **propriétaire de code**
  (CODEOWNERS) sur les chemins concernés.
- **Vérifications de statut requises** — la PR ne peut fusionner que si la
  CI est verte (`ci.yml`, `codeql.yml`, `gitleaks.yml`,
  `dependency-review.yml`). Voir [Pipeline CI](/atlas/quality/ci-pipeline/).
- **Branche à jour avant fusion** — cohérent avec le hook _pre-push_
  `check-sync` qui exige que `origin/main` soit ancêtre de la branche.

La **stratégie de merge** est imposée par la ruleset `main` : seul le **merge
commit** est autorisé (squash et rebase désactivés). Le _pourquoi_ est détaillé
dans l'[ADR 0053](/atlas/decisions/0053-strategie-merge-commit-main/), la
pratique côté contributeur dans le
[workflow de contribution](/atlas/collaboration/workflow/#9-merge).

## Secrets et autorisations

Les secrets du dépôt vivent dans _Settings → Secrets and variables →
Actions_. Ils ne sont **jamais** présents dans le dépôt ni nécessaires en
local (voir [environnement local](/atlas/collaboration/environnement-local/#variables-denvironnement-et-secrets)).

| Secret        | Utilisé par                                                                                    | Rôle                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `TURBO_TOKEN` | [`ci.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/ci.yml)           | Cache distribué Turborepo, pour accélérer la CI                                    |
| `NPM_TOKEN`   | [`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml) | Authentification au registre npmjs à la publication                                |
| `PAT_TOKEN`   | [`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml) | Jeton personnel permettant à Changesets d'ouvrir la PR « chore: version packages » |

Le jeton de registre GitHub Packages, lui, n'est pas un secret dédié :
`release.yml` réutilise le `GITHUB_TOKEN` éphémère du run (exposé en
`NODE_AUTH_TOKEN`). La publication privilégie l'**OIDC** (jetons
éphémères, sans secret de longue durée) quand le registre le supporte —
voir [ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/).

Côté **autorisations**, les workflows suivent le principe du moindre
privilège : chaque workflow déclare les `permissions:` minimales dont il a
besoin (par exemple `contents: read` pour la CI, et `contents: read` +
`pages: write` + `id-token: write` pour le déploiement de la documentation
sur GitHub Pages).

## GitHub Pages (documentation)

Le site de documentation est publié sur **GitHub Pages** par
[`docs.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/docs.yml) à chaque push sur `main`.
La source de déploiement est configurée sur **GitHub Actions** (et non sur
une branche `gh-pages`), dans _Settings → Pages_.

## Sécurité du dépôt

Activé dans _Settings → Code security_ :

- **Alertes Dependabot** — vulnérabilités dans les dépendances ;
- **CodeQL** — analyse statique de sécurité ([`codeql.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/codeql.yml)) ;
- **Secret scanning** + **push protection** — doublés localement par
  gitleaks ([`gitleaks.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/gitleaks.yml)) ;
- **Private vulnerability reporting** — canal de signalement confidentiel,
  décrit dans [SECURITY.md](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md).
