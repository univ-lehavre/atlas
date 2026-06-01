# Glossaire

Définitions concises des termes techniques utilisés dans la documentation. Quand un terme apparaît dans une page, il est défini sur place ou renvoie ici.

## Organisation du dépôt

| Terme            | Définition                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **monorepo**     | Un seul dépôt Git qui héberge plusieurs projets logiciels, avec des règles partagées (style, tests, CI). Atlas est organisé en huit catégories.                                       |
| **workspace**    | Sous-projet d'un monorepo géré comme une unité indépendante (avec son `package.json`, ses dépendances, ses scripts). Les _workspaces_ d'Atlas sont listés dans `pnpm-workspace.yaml`. |
| **pull request** | Proposition de modification publiée sur GitHub. Permet la revue de code et déclenche la CI avant fusion dans `main`.                                                                  |
| **changeset**    | Fichier `.changeset/*.md` joint à une pull request pour décrire l'impact d'un changement (`patch`, `minor`, `major`) sur les paquets publiables.                                      |

## Langage et bibliothèques

| Terme          | Définition                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript** | Langage qui ajoute des types statiques à JavaScript. Le compilateur refuse de compiler à la moindre incohérence de types quand le mode strict est activé. |
| **Effect**     | Bibliothèque TypeScript de programmation fonctionnelle : les erreurs deviennent des valeurs typées, la composition remplace les exceptions.               |
| **SvelteKit**  | Framework web full-stack basé sur Svelte. Couvre rendu serveur (SSR) et rendu navigateur depuis un seul code source. Utilisé par toutes les apps d'Atlas. |
| **Hono**       | Framework HTTP minimaliste et typé pour Node.js, Bun, Deno, Cloudflare Workers. Utilisé par les serveurs de la catégorie `services/`.                     |
| **vitest**     | Exécuteur de tests rapide, compatible Jest, intégré à Vite. Utilisé pour tous les tests unitaires et d'intégration.                                       |
| **Playwright** | Outil de test de bout en bout : pilote un vrai navigateur (Chromium, Firefox, WebKit) pour valider les parcours utilisateur.                              |

## Outils du monorepo

| Terme          | Définition                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pnpm**       | Gestionnaire de paquets pour Node.js. Atlas l'utilise pour installer les dépendances et isoler chaque sous-projet via les _workspaces_.               |
| **turbo**      | Orchestrateur de tâches avec cache distribué. Parallélise `build`, `test`, `lint` à travers les sous-projets et ne refait pas ce qui n'a pas changé.  |
| **Changesets** | Outil de gestion des versions et changelogs pour monorepo. Découple l'expression de l'intention (par le contributeur) et la publication (par le bot). |
| **VitePress**  | Générateur de site statique à partir de Markdown. Produit le site de documentation d'Atlas à partir des fichiers de `docs/`.                          |

## Qualité du code

| Terme                    | Définition                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ESLint**               | Analyseur statique de code JavaScript/TypeScript. Applique des règles de style, de qualité et de sécurité.                                                   |
| **Prettier**             | Formateur automatique de code. Pas d'options de style à négocier : la machine décide.                                                                        |
| **commitlint**           | Vérifie que chaque message de commit suit le format **[Conventional Commits](https://www.conventionalcommits.org/)** (`type(scope): description`).           |
| **Conventional Commits** | Convention de format de messages de commit qui rend l'historique parsable par des outils (Changesets, génération de changelog).                              |
| **AST**                  | _Abstract Syntax Tree_ — arbre représentant la structure syntaxique d'un code source. Les analyseurs statiques (ESLint, CodeQL) opèrent sur l'AST.           |
| **knip**                 | Outil de détection de code mort : exports, fichiers, dépendances jamais utilisés.                                                                            |
| **jscpd**                | _JavaScript Copy/Paste Detector_. Détecte les blocs de code dupliqués ; seuil à 5 % dans Atlas.                                                              |
| **size-limit**           | Outil qui fixe un budget de taille (en KB) par paquet et fait échouer la CI si dépassé.                                                                      |
| **taze**                 | Outil qui liste les versions de dépendances disponibles, regroupées par majeur/mineur/patch.                                                                 |
| **couverture de code**   | Proportion du code source exécutée par les tests, exprimée en lignes, branches, fonctions. Mesurée par `@vitest/coverage-v8`.                                |
| **pyramide de tests**    | Répartition recommandée : beaucoup de tests unitaires (rapides, nombreux), peu de tests end-to-end (lents, ciblés). Atlas a cinq niveaux.                    |
| **self-skipping**        | Test qui se désactive automatiquement si son environnement (REDCap, Appwrite, navigateur Playwright) n'est pas disponible. Évite de bloquer le contributeur. |

## CI/CD et collaboration

| Terme              | Définition                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CI**             | Continuous Integration. Ensemble des vérifications automatiques exécutées à chaque pull request et push.                                                                                               |
| **GitHub Actions** | Service intégré à GitHub qui exécute des _workflows_ (suites de commandes) sur des machines virtuelles à chaque événement (push, PR, _cron_).                                                          |
| **workflow**       | Fichier YAML dans `.github/workflows/` qui décrit une suite de _jobs_ à exécuter sur un événement déclencheur.                                                                                         |
| **hook Git**       | Script lancé automatiquement par Git à un moment précis du cycle de commit (pre-commit, commit-msg, pre-push). Atlas utilise [lefthook](https://github.com/evilmartians/lefthook) pour les orchestrer. |
| **lefthook**       | Gestionnaire de hooks Git. Configuration dans `lefthook.yml`. Installé automatiquement à l'`pnpm install`.                                                                                             |
| **Dependabot**     | Service GitHub qui crée automatiquement des PR pour mettre à jour les dépendances vulnérables ou obsolètes.                                                                                            |

## Sécurité

| Terme                     | Définition                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SAST**                  | _Static Application Security Testing_. Analyse le code source sans l'exécuter, à la recherche de patterns de vulnérabilités.                                       |
| **DAST**                  | _Dynamic Application Security Testing_. Sonde une application en cours d'exécution. Atlas utilise OWASP ZAP en mode baseline.                                      |
| **CodeQL**                | Outil GitHub d'analyse statique (SAST). Représente le code en base de données interrogeable et détecte les vulnérabilités par requêtes.                            |
| **OWASP ZAP**             | Outil open-source de scan de vulnérabilités web (DAST). Sonde une URL à la recherche de configurations défaillantes (headers manquants, cookies sans flags, etc.). |
| **gitleaks**              | Outil de détection de secrets (tokens, clés API) accidentellement écrits dans le code. Lancé en _hook_ pre-commit et en CI.                                        |
| **SBOM**                  | _Software Bill of Materials_. Inventaire exhaustif des dépendances logicielles d'un projet, au format [CycloneDX](https://cyclonedx.org/) dans Atlas.              |
| **provenance npm (OIDC)** | Attestation cryptographique liant un paquet npm publié à son code source et au _workflow_ CI qui l'a construit. Vérifiable par `npm audit signatures`.             |
| **OIDC**                  | _OpenID Connect_. Protocole d'authentification utilisé pour signer les publications npm sans token long-lived dans la CI.                                          |
| **CSP**                   | _Content Security Policy_. En-tête HTTP qui restreint les sources autorisées (scripts, images, connexions) pour atténuer le XSS.                                   |
| **ReDoS**                 | _Regular expression Denial of Service_. Attaque par expression régulière catastrophique qui consomme exponentiellement du CPU.                                     |
| **XSS**                   | _Cross-Site Scripting_. Injection de code JavaScript malveillant dans une page rendue à un autre utilisateur.                                                      |

## Authentification et données

| Terme          | Définition                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **magic link** | Lien à usage unique envoyé par email pour authentifier un utilisateur sans mot de passe.                                                                                |
| **Appwrite**   | Plateforme open-source de _Backend-as-a-Service_ (auth, base de données, stockage, fonctions). Atlas s'en sert pour l'authentification et les métadonnées applicatives. |
| **BaaS**       | _Backend-as-a-Service_. Service prêt-à-l'emploi qui remplace l'écriture d'un backend custom (auth, base de données, etc.).                                              |
| **REDCap**     | _Research Electronic Data Capture_. Plateforme de capture de données structurées par formulaires en ligne. Atlas s'en sert pour les formulaires métier.                 |
| **CRF**        | _Case Report Form_. Formulaire structuré de collecte de données.                                                                                                        |
| **OpenAlex**   | Base de données ouverte de la littérature académique (240M+ articles). Consommée en lecture par certaines apps d'Atlas.                                                 |

## Outillage IA

| Terme         | Définition                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MCP**       | _Model Context Protocol_. Protocole qui permet à un assistant IA de récupérer de la documentation et d'invoquer des outils. Configuré dans `.mcp.json`. |
| **CLAUDE.md** | Fichier à la racine du dépôt contenant les instructions et conventions persistantes pour l'assistant de développement IA.                               |
