# 0017 — Releases npm signées par OIDC sur deux registres

## Contexte

Le monorepo publie une vingtaine de paquets sur npm. Deux risques
classiques pèsent sur la chaîne de publication :

1. **Vol de jeton npm** — un `NPM_TOKEN` compromis permet à un attaquant
   de publier des versions vérolées au nom du projet. La rotation est
   manuelle et la fenêtre d'exposition est longue.
2. **Indisponibilité de registre** — si le registre principal est en
   panne ou refuse une publication (politique, modération, panne
   réseau), les consommateurs sont coincés.

GitHub Actions permet depuis 2023 la publication **OIDC** : le runner
demande à GitHub un jeton court (15 min), npm le vérifie auprès de
GitHub, et la publication s'effectue sans `NPM_TOKEN` persistant. La
provenance (URL du workflow, commit, repo) est attachée au paquet et
vérifiable par le consommateur avec `npm audit signatures`.

GitHub Packages, en parallèle de npm public, offre un second registre
qui sert de **mirror** et de fallback.

## Décision

Toutes les releases (paquets `packages/*` et `cli/*` non `private`)
sont publiées **avec provenance OIDC** sur **deux registres** :

- **npm public** (`registry.npmjs.org`), registre primaire ;
- **GitHub Packages** (`npm.pkg.github.com`), registre secondaire.

L'option `--provenance` est activée des deux côtés. Aucun `NPM_TOKEN`
long-terme n'est stocké côté GitHub Actions : la publication utilise
`id-token: write` (OIDC) côté GitHub Actions et un trust npm
préalablement configuré.

Le consommateur vérifie la chaîne avec :

```sh
npm audit signatures
```

## Statut

Accepted.

## Conséquences

**Bénéfices.** Pas de jeton npm long-terme à rotater ni à exfiltrer.
La provenance lie chaque paquet publié à un commit Git et un workflow
auditables. Le double registre offre un fallback en cas
d'indisponibilité du registre primaire.

**Prix à payer.** Le workflow de release est plus complexe (deux
publications successives, vérification de provenance). Les bumps de
versioning doivent être synchronisés entre registres (un seul registre
qui rate la publication crée une divergence). Quelques outils tiers
ne vérifient pas encore la provenance.

**Garde-fous.**

- La pipeline de release est documentée dans
  [docs/collaboration/releases.md](../collaboration/releases.md).
- Un incident de publication (un registre seul vert, l'autre rouge)
  ouvre un ticket d'investigation systématique.
- La rotation des trusts OIDC est revue lors de l'audit semestriel.
