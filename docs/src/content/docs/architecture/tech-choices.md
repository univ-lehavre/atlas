---
title: Choix techniques
---

Cette page récapitule les outils et plateformes retenus par Atlas, et **pourquoi**.

## Langage

**[TypeScript](https://www.typescriptlang.org/)** sur tout le dépôt — un langage qui ajoute des types statiques à JavaScript. Le mode `strictTypeChecked` est activé : les erreurs de typage bloquent la compilation. Voir [Style de code](../quality/code-style).

## Front-end

**[SvelteKit](https://kit.svelte.dev/)** pour toutes les applications utilisateur. SvelteKit est un _framework_ web qui couvre à la fois le rendu côté serveur (SSR) et le rendu côté navigateur, à partir d'un seul code source.

Atlas l'a retenu pour :

- la concision de la syntaxe Svelte (peu de cérémonie autour des composants),
- le rendu serveur natif (important pour l'accessibilité et le SEO),
- un _bundle_ léger produit à la compilation.

**[Bootstrap](https://getbootstrap.com/)** comme système de design de base : grille responsive, composants accessibles, palette de couleurs. Permet d'avoir une cohérence visuelle entre les applications sans dépendre d'un designer dédié.

## Serveurs HTTP

**[Hono](https://hono.dev/)** pour les services HTTP (catégorie [`services/`](https://github.com/univ-lehavre/atlas/tree/main/services)). Hono est un _framework_ HTTP minimaliste, typé, qui tourne sur Node.js, Bun, Deno et les _workers_ Cloudflare sans changement de code.

## Backend-as-a-Service

**[Appwrite](https://appwrite.io/)** comme _Backend-as-a-Service_ (BaaS) — une plateforme qui fournit les services de base d'une application (authentification, base de données, stockage, fonctions) prêts à l'emploi, sans avoir à écrire et déployer un backend custom.

| Service          | Usage dans Atlas                                   |
| ---------------- | -------------------------------------------------- |
| Authentification | Connexion par _magic link_ (lien envoyé par email) |
| Base de données  | Stockage des métadonnées applicatives              |
| Stockage         | Fichiers joints, exports                           |
| Fonctions        | Code serveur déclenché par événement               |

Appwrite est open-source et conforme SOC-2, RGPD et HIPAA.

## Capture de données structurées

**[REDCap](https://project-redcap.org/)** (Research Electronic Data Capture) pour les formulaires structurés portés par les applications. REDCap est une plateforme open-source **généraliste** de capture de données via formulaires en ligne, développée par Vanderbilt University ; née dans la recherche, elle est aujourd'hui utilisée pour tout type de collecte structurée (enquêtes, suivis, administration).

| Métrique                 | Valeur                                 |
| ------------------------ | -------------------------------------- |
| Institutions partenaires | 8 000+                                 |
| Pays                     | 164                                    |
| Citations scientifiques  | 51 000+                                |
| Conformité               | RGPD, HIPAA, 21 CFR Part 11            |
| Coût                     | Gratuit pour les membres du consortium |

Les certifications de conformité ci-dessus (dont HIPAA, 21 CFR Part 11) attestent du niveau de sécurité de la plateforme ; elles n'impliquent **pas** qu'Atlas y traite des données de santé. Dans Atlas, REDCap porte exclusivement des formulaires structurés administratifs (conventions, profils, propositions de projet) : **aucune donnée de santé ni donnée sensible** n'y est saisie.

## Tests

**[vitest](https://vitest.dev/)** pour les tests unitaires et d'intégration : exécuteur de tests rapide, compatible Jest, intégré à Vite.

**[Playwright](https://playwright.dev/)** pour les tests de bout en bout (_end-to-end_) : pilote un vrai navigateur (Chromium, Firefox, WebKit) pour valider les parcours utilisateur complets.

Voir [Tests](../quality/tests) pour la pyramide à cinq niveaux.

## Gestion du dépôt

**[pnpm](https://pnpm.io/)** comme gestionnaire de paquets — _workspaces_ natifs, cache partagé, installations plus rapides que npm/yarn pour les gros dépôts.

**[turbo](https://turbo.build/)** comme orchestrateur de tâches — parallélisation et cache de `build`, `test`, `lint` à travers les sous-projets.

**[Changesets](https://github.com/changesets/changesets)** pour la gestion des versions et des changelogs.

**[VitePress](https://vitepress.dev/)** pour la documentation publique — génère un site statique à partir des fichiers Markdown de `docs/`.

## Serveurs MCP

[Model Context Protocol](https://modelcontextprotocol.io/) est un protocole qui permet à un assistant de développement IA de récupérer de la documentation et d'invoquer des outils. Atlas configure plusieurs serveurs MCP dans [`.mcp.json`](https://github.com/univ-lehavre/atlas/blob/main/.mcp.json) :

| Serveur         | Rôle                                                         |
| --------------- | ------------------------------------------------------------ |
| `effect-mcp`    | Documentation Effect                                         |
| `svelte-mcp`    | Documentation Svelte 5 et SvelteKit                          |
| `appwrite-docs` | Documentation Appwrite                                       |
| `appwrite-api`  | API Appwrite (nécessite des variables d'environnement)       |
| `openalex`      | API OpenAlex — base bibliographique ouverte (240M+ articles) |

### Prérequis

- **Node.js/npm** pour `effect-mcp`, `svelte-mcp`, `appwrite-docs`, `openalex`
- **uv** (gestionnaire Python) pour `appwrite-api` : `curl -LsSf https://astral.sh/uv/install.sh | sh`

### Variables d'environnement Appwrite

Pour utiliser le serveur `appwrite-api` :

```bash
export APPWRITE_PROJECT_ID="<project_id>"
export APPWRITE_API_KEY="<api_key>"
export APPWRITE_ENDPOINT="https://appwrite.<host>/v1"
```
