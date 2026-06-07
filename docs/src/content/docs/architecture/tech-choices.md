---
title: Choix techniques
---

Cette page récapitule les outils et plateformes retenus par Atlas, et surtout **pourquoi** : pour chaque choix, le contexte, l'alternative écartée et le compromis. Le _pourquoi_ durable et structurant est tracé dans les [ADR](/atlas/decisions/) ; cette page en donne le résumé. Les choix sont regroupés par usage — langage, front-end, serveurs, données, tests, outillage du dépôt.

## Langage

À la base, **JavaScript** : le langage du Web, le seul qui s'exécute nativement dans tous les navigateurs. Sa spécification, **ECMAScript**, est gouvernée par le comité **TC39** (membres : éditeurs de navigateurs, entreprises, experts) et publie une révision **chaque année** ; les moteurs des navigateurs et de Node.js l'implémentent au fil de l'eau. JavaScript est rapide à écrire mais **non typé** : une faute (passer un nombre là où une chaîne est attendue) ne se voit qu'à l'exécution.

C'est précisément ce manque qui a fait naître **[TypeScript](https://www.typescriptlang.org/)** (Microsoft, 2012) : un sur-ensemble de JavaScript qui **ajoute des types statiques vérifiés à la compilation**, puis s'efface (il se compile en JavaScript ordinaire). On écrit du JavaScript moderne, mais le compilateur attrape les erreurs de type **avant** l'exécution.

Atlas l'utilise sur **tout le dépôt**, en mode `strictTypeChecked` : les erreurs de typage **bloquent la compilation**. Le prix à payer — une étape de compilation et une rigueur de typage parfois verbeuse — est assumé : il achète une classe entière de bugs détectés au plus tôt. Voir [Style de code](/atlas/quality/code-style/).

## Front-end

**[SvelteKit](https://kit.svelte.dev/)** pour toutes les applications utilisateur. SvelteKit est un _framework_ web qui couvre à la fois le rendu côté serveur (SSR) et le rendu côté navigateur, à partir d'un seul code source.

Atlas l'a retenu pour :

- la concision de la syntaxe Svelte (peu de cérémonie autour des composants),
- le rendu serveur natif (important pour l'accessibilité et le SEO),
- un _bundle_ léger produit à la compilation.

**[Bootstrap](https://getbootstrap.com/)** comme système de design de base : grille responsive, composants accessibles, palette de couleurs. Permet d'avoir une cohérence visuelle entre les applications sans dépendre d'un designer dédié.

## Serveurs HTTP

**[Hono](https://hono.dev/)** pour les services HTTP (catégorie [`services/`](https://github.com/univ-lehavre/atlas/tree/main/services)). Hono est un _framework_ HTTP minimaliste, typé, qui tourne sur **Node.js** — l'environnement qui exécute du JavaScript côté serveur, hors du navigateur — ainsi que sur Bun, Deno et les _workers_ Cloudflare sans changement de code. Atlas standardise sur Node.js (version épinglée dans [`.nvmrc`](https://github.com/univ-lehavre/atlas/blob/main/.nvmrc)).

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

Voir [Tests](/atlas/quality/tests/) pour la pyramide à cinq niveaux.

## Gestion du dépôt

Le dépôt est un **monorepo** : de nombreux paquets versionnés ensemble dans un seul dépôt git (voir [Monorepo](/atlas/architecture/monorepo/)). Cette section liste l'outillage qui le rend gérable à cette échelle.

**[pnpm](https://pnpm.io/)** comme **gestionnaire de paquets** — l'outil qui installe les dépendances JavaScript et orchestre les paquets du monorepo. Retenu pour ses _workspaces_ natifs (les paquets se référencent entre eux sans publication), son cache partagé sur disque et des installations plus rapides que npm ou yarn sur un gros dépôt.

**[turbo](https://turbo.build/)** comme orchestrateur de tâches — parallélisation et cache de `build`, `test`, `lint` à travers les sous-projets (ne réexécute que ce qui a changé).

**[Changesets](https://github.com/changesets/changesets)** pour la gestion des versions et des changelogs.

**[Astro Starlight](https://starlight.astro.build/)** pour la documentation publique — génère un site statique à partir des fichiers Markdown de `docs/`. (Le dépôt utilisait auparavant VitePress ; la migration est tracée dans l'[ADR 0036](/atlas/decisions/0036-migration-vitepress-astro-starlight/).)

## Serveurs MCP

[Model Context Protocol](https://modelcontextprotocol.io/) est un protocole qui permet à un assistant de développement IA de récupérer de la documentation et d'invoquer des outils. Atlas configure plusieurs serveurs MCP dans [`.mcp.json`](https://github.com/univ-lehavre/atlas/blob/main/.mcp.json) :

| Serveur         | Rôle                                                         |
| --------------- | ------------------------------------------------------------ |
| `effect-mcp`    | Documentation Effect                                         |
| `svelte-mcp`    | Documentation Svelte 5 et SvelteKit                          |
| `appwrite-docs` | Documentation Appwrite                                       |
| `appwrite-api`  | API Appwrite (nécessite des variables d'environnement)       |
| `openalex`      | API OpenAlex — base bibliographique ouverte (240M+ articles) |

La mise en place de ces serveurs (prérequis `uv`, variables
d'environnement d'`appwrite-api`) est un détail d'**installation**, pas un
choix technique : elle est documentée dans
[Environnement local → Serveurs MCP](/atlas/collaboration/environnement-local/#serveurs-mcp-assistant-de-développement-ia).
