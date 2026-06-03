---
title: "Installer les CLIs d'Atlas"
---

Atlas publie ses outils en ligne de commande comme paquets npm publics.
Tu peux les installer depuis l'un des **deux registres** sur lesquels ils
sont publiés (voir
[ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)) :

- **npm public** (`registry.npmjs.org`) — registre primaire, aucune
  configuration nécessaire ;
- **GitHub Packages** (`npm.pkg.github.com`) — registre secondaire
  (miroir / repli), nécessite une authentification GitHub.

## Les CLIs disponibles

| Paquet                                        | Rôle                                                       |
| --------------------------------------------- | ---------------------------------------------------------- |
| `@univ-lehavre/atlas-biblio-cli`              | Validation et fiabilisation de références bibliographiques |
| `@univ-lehavre/atlas-citation-cli`            | Récupération et regroupement de citations                  |
| `@univ-lehavre/atlas-crf-cli`                 | Client en ligne de commande pour un système de CRF         |
| `@univ-lehavre/atlas-crf-openapi`             | Génération / comparaison de schémas OpenAPI CRF            |
| `@univ-lehavre/atlas-crf-stats-cli`           | Statistiques sur un projet CRF                             |
| `@univ-lehavre/atlas-logos-cli`               | Installation des logos partagés dans une app               |
| `@univ-lehavre/atlas-net-cli`                 | Diagnostics réseau (DNS, TLS, connectivité)                |
| `@univ-lehavre/atlas-researcher-profiles-cli` | Génération de profils de chercheurs                        |
| `@univ-lehavre/atlas-stats-cli`               | Statistiques sur les paquets npm publiés                   |

## Depuis npm public (le plus simple)

Aucune configuration : les paquets sont publics sur `registry.npmjs.org`.

```bash
# Exécution ponctuelle, sans installation
pnpm dlx @univ-lehavre/atlas-net-cli --help

# Installation globale
pnpm add -g @univ-lehavre/atlas-net-cli

# Comme dépendance de développement d'un projet
pnpm add -D @univ-lehavre/atlas-citation-cli
```

(`npx` / `npm install -g` fonctionnent de la même façon avec npm.)

## Depuis GitHub Packages

GitHub Packages exige une authentification, même pour les paquets
publics. Il faut :

1. Un **Personal Access Token (classic)** GitHub avec le scope
   `read:packages` — voir
   [la doc GitHub](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).
2. Router le scope `@univ-lehavre` vers GitHub Packages dans un
   `.npmrc` (projet ou `~/.npmrc`) :

```ini
@univ-lehavre:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

En exposant le token via l'environnement (recommandé : ne pas l'écrire
en clair dans le fichier) :

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
pnpm add -D @univ-lehavre/atlas-crf-cli
```

## Vérifier la provenance

Toutes les releases sont signées avec **provenance OIDC** : chaque
paquet publié est lié à son commit Git et au workflow GitHub Actions qui
l'a produit. Pour vérifier la chaîne d'approvisionnement après
installation :

```bash
npm audit signatures
```

## Versions

Les versions suivent [Semantic Versioning](https://semver.org). Les
ranges des dépendances publiées sont resserrés en `~` (patch seulement,
voir [ADR 0024](/atlas/decisions/0024-ranges-deps-publiables-tilde/)) : une
mise à jour `minor` passe par une décision explicite, jamais
automatiquement chez le consommateur.
