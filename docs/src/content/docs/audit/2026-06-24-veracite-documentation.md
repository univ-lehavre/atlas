---
title: "Véracité de la documentation Atlas — doc ↔ réalité du dépôt (2026-06-24)"
---

> Date de l'audit : 2026-06-24. Méthode : workflow multi-agents — confrontation de chaque
> affirmation testable de la prose courante au réel du dépôt (code, `package.json`, workflows
> CI, fichiers cités), sur trois axes (affirmations factuelles, liens & références,
> revendications de capacité), puis vérification adversariale de chaque écart pour écarter les
> faux positifs (les instantanés historiques datés ne sont pas comptés). Findings → lots `docs/fix`.
> Rapport jumeau : [Best-of cluster ↔ Atlas](/atlas/audit/2026-06-24-best-of-cluster-atlas/).

## 1. Synthèse

**31 écarts confirmés** entre la prose courante de la documentation et l'état réel du dépôt (snapshot du 2026-06-24, branche `main` à `09c8e3c1`). Les instantanés historiques datés (ADR, audits) ne sont pas comptés ; **3 faux positifs** ont été écartés en vérification adversariale (README.md:63, quality/security.md:324, glossary.md:109).

**Répartition par gravité :**

- **Critiques** : 0 (aucune sur-revendication de sécurité présentée au public mentant sur une capacité réellement absente — voir nuance SLSA ci-dessous).
- **Majeurs** : 16 (erreur factuelle structurante, lien d'accueil cassé, outil périmé cité comme actif, topologie CI fausse, capacité non tenue).
- **Mineurs** : 15 (imprécision, péremption douce, off-by-one, mauvaise localisation de source).

**Répartition par axe :**

- **Factuel** : 18 écarts (chiffres faux, formats erronés, noms de paquets, configs périmées).
- **Capacité** : 6 écarts (topologie CI build←lint/typecheck/test, fail-fast, SLSA L3, table hooks incomplète, actionlint pre-push fantôme, MCP).
- **Liens** : 3 blocs (16 liens relatifs `docs/...` cassés au total dans README.md, CONTRIBUTING.md, SECURITY.md, en rendu GitHub).

**Verdict global.** Le cœur technique de la doc reste fiable et bien adossé au code (ADR rigoureux, audits internes lucides — l'audit `2026-06-15-maturite-referentiels.md` cote lui-même la sur-revendication SLSA). Mais **trois foyers de dette documentaire** dégradent la fiabilité de la couche d'accueil et de référence :

1. **Liens racine systématiquement cassés** : les fichiers d'accueil (README, CONTRIBUTING, SECURITY) pointent vers `docs/...` alors que la doc curée vit sous `docs/src/content/docs/...` depuis la migration Astro. 16 liens renvoient un 404 GitHub — non couverts par `starlight-links-validator` (qui ne valide que l'intérieur du site).
2. **VitePress présenté comme actif** à deux endroits (README.md:95, glossary.md:40) alors qu'il a été retiré (ADR 0036) au profit d'Astro Starlight.
3. **CI et MCP décrits dans un état périmé** : la page `ci-pipeline.md` décrit la topologie d'avant ADR 0061 (jobs enchaînés) alors que tout part désormais en parallèle ; `.mcp.json` est décrit avec des serveurs Appwrite/OpenAlex inexistants.

La doc ne ment sur aucune capacité de sécurité réelle de façon dangereuse : la provenance npm L2 fonctionne (seul le label de palier est gonflé d'un cran), le SBOM existe (mauvais format cité). Aucun écart critique. Le risque dominant est la **friction de navigation et la confusion outillage**, pas la tromperie sécuritaire.

---

## 2. Écarts CRITIQUES (sécurité/capacité publique)

**Aucun écart critique confirmé.** La sur-revendication la plus proche (SLSA Build L3, SECURITY.md:50) est reclassée **majeure** : la provenance npm OIDC est réelle et vérifiable (les snippets `npm audit signatures` / `.dist.attestations` fonctionnent), seul le palier annoncé est gonflé d'un cran (L2 réel vs L3 annoncé), et l'audit interne lui-même cote ce gap G13 en impact _Low_.

---

## 3. Écarts MAJEURS

| fichier:ligne                                  | Affirmation                                                                                                      | Réalité                                                                                                                                                                                                                                                                                                                               | Correction                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `SECURITY.md:50`                               | « provenance OIDC, SLSA Build L3 »                                                                               | `NPM_CONFIG_PROVENANCE=true` + `id-token: write` sur runner GitHub hébergé standard (release.yml:25,30,41) = **SLSA Build L2** par construction. Aucun generator durci/cosign/attest. Audit interne confirme « SLSA Build L3 NON atteint » (`audit/2026-06-15-maturite-referentiels.md:171,207`). Aucun ADR de palier L3.             | Remplacer « SLSA Build L3 » par « SLSA Build L2 ».                                                                                        |
| `README.md:95`                                 | « **VitePress** : génère le site de documentation »                                                              | VitePress retiré (ADR 0036). La doc est construite avec Astro Starlight — contredit par le même README.md:99. `docs/package.json:13-22` ne déclare que `@astrojs/starlight`/`astro`/`@astrojs/mdx` ; aucune dépendance vitepress.                                                                                                     | Remplacer l'entrée VitePress par Astro Starlight.                                                                                         |
| `glossary.md:40`                               | « **VitePress** … Produit le site de documentation d'Atlas »                                                     | Idem : outil RETIRÉ présenté comme ACTIF. `astro.config.mjs:8-10` documente l'abandon. De plus Astro/Starlight (réellement utilisé) n'est pas défini au glossaire.                                                                                                                                                                    | Remplacer par « Astro Starlight — générateur du site de doc » ; définir l'outil réel.                                                     |
| `README.md:64`                                 | SBOM « au format **SPDX**, généré **à chaque release** »                                                         | Format **CycloneDX 1.6** (`sbom.yml:74-76`, sanity-check `bomFormat==CycloneDX`/`specVersion==1.6` l.85), confirmé `quality/security.md:394,450`. Déclenché sur **push vers main** (`sbom.yml:17-20`), pas sur release (release.yml ne référence aucun SBOM).                                                                         | « au format CycloneDX, généré à chaque push sur main ».                                                                                   |
| `README.md:19,37,57,70(×2),88,136,140`         | 8 liens relatifs `docs/...` vers la doc                                                                          | Fichiers réels sous `docs/src/content/docs/...`. `docs/collaboration/`, `docs/architecture/`, `docs/quality/`, `docs/decisions/` n'existent pas → **404 GitHub**. Cas aggravé : `architecture/monorepo` est `.mdx`, pas `.md`. Non couvert par starlight-links-validator.                                                             | Préfixer par `docs/src/content/docs/…` (ou URLs publiées) ; corriger `monorepo.md`→`.mdx`.                                                |
| `CONTRIBUTING.md:7,13,14,15,16,17`             | 6 liens relatifs `docs/...` (onboarding)                                                                         | Mêmes répertoires inexistants ; cibles réelles sous `docs/src/content/docs/...`. 6 liens 404 en rendu GitHub — liens d'accueil des contributeurs.                                                                                                                                                                                     | Préfixer par `docs/src/content/docs/` ou URLs publiées.                                                                                   |
| `SECURITY.md:47,48`                            | `[Sécurité applicative](docs/quality/security.md)`, `[Réponse aux incidents](docs/quality/incident-response.md)` | `docs/quality/` n'existe pas ; fichiers sous `docs/src/content/docs/quality/`. 2 liens 404 dans la politique de sécurité racine.                                                                                                                                                                                                      | Préfixer par `docs/src/content/docs/` ou URLs publiées.                                                                                   |
| `quality/ci-pipeline.md:82,93,97,134`          | « build puis docs sont enchaînés » ; mermaid `lint & typecheck & test --> build`, `build --> docs`               | **ADR 0061** : tous les jobs ont `needs: [changes]` uniquement (ci.yml:87,111,135,174,203,221). Commentaires ci.yml:170-173 (« ne dépend plus de lint/typecheck/test ») et :199 (« détaché de build »). La page ne mentionne jamais 0061.                                                                                             | Mettre à jour diagramme+texte : tout part en parallèle après `changes` (ADR 0061) ; Turbo gère l'ordre via `^build`.                      |
| `quality/ci-pipeline.md:219`                   | Fail-fast par « dépendance entre jobs (`build` après `lint`/`typecheck`/`test`) »                                | Cette dépendance n'existe plus (tous en `needs: [changes]`, ADR 0061). Mécanisme décrit absent.                                                                                                                                                                                                                                       | Reformuler : fail-fast vient du job `changes` (court-circuit) + parallélisme.                                                             |
| `quality/hooks.md:61-70`                       | Table pre-push de 8 hooks (référence)                                                                            | `lefthook.yml` définit 15 commandes pre-push. Omises : `check-structure` (audit:structure, l.102), `check-dep-versions` (l.110), `coverage-report` (l.131), `test-scripts` (l.135), `dataops` (l.144), `docs-generate` (l.152), `audit-docs` (l.160). check-structure/check-dep-versions sont au contrat pre-push de CLAUDE.md:32-34. | Compléter la table (au minimum check-structure, check-dep-versions).                                                                      |
| `architecture/monorepo.mdx:165,30`             | « `dataops/` n'est pas déclaré dans `pnpm-workspace.yaml`, donc pnpm, turbo et knip l'ignorent »                 | **ADR 0066** : `pnpm-workspace.yaml:17-18` déclare `dataops/citation-dagster` et `dataops/mediawatch-dagster` (package.json privés, scripts `lint:py`/`test:py`/`manifests:py` via Turbo). Turbo NE l'ignore PAS (il cache ces checks). Restent vrais : knip exclut, audit:structure ignore le Python.                                | Réécrire : code-locations Dagster entrent dans le workspace pour le cache Turbo (ADR 0066) ; knip les exclut, audit:structure les ignore. |
| `architecture/data-flow.md:113-116`            | amarre « sans exposer (à ce jour) de document OpenAPI assemblé dans le dépôt »                                   | Faux : `apps/amarre/static/api/openapi.json` (OpenAPI 3.1.0, paths /me, /surveys/_, /auth/_) est commité, généré par `scripts/generate-openapi.ts:545-564`, servi via `src/routes/api/docs/+page.svelte` (RapiDoc). Antérieur (2026-04-01) au remaniement de la page (2026-06-07).                                                    | Corriger : amarre expose un document assemblé via `/api/docs` ; supprimer « sans document assemblé ».                                     |
| `collaboration/environnement-local.md:124-144` | Serveurs MCP : `appwrite-api` nécessite uv + lit `APPWRITE_PROJECT_ID/API_KEY/ENDPOINT`                          | `.mcp.json` ne déclare que `svelte-mcp`, `effect-mcp`, `kubernetes`. Aucun serveur Appwrite, aucun uv, aucune variable APPWRITE\_\*. État périmé du fichier.                                                                                                                                                                          | Réécrire pour les serveurs réels ; supprimer prérequis uv + variables APPWRITE\_\*.                                                       |
| `collaboration/workflow.md:103`                | Paquet publiable = `packages/*`, `cli/*`, `services/*`, **`ui/*`**                                               | `scripts/release/publish-packages.sh:32` itère `packages cli services config assets`. `ui/atlas-ui/package.json:7` est `private:true` (non publié) ; `config/*` et `assets/*` sont publiables mais absents de la liste. Induit en erreur dans les deux sens.                                                                          | Aligner : `packages/*`, `cli/*`, `services/*`, `config/*`, `assets/*` (retirer `ui/*`).                                                   |
| `collaboration/parametrage-github.md:66-68`    | Bumps Dependabot **patch / minor** auto-mergés une fois la CI verte                                              | `dependabot-auto-merge.yml:47-50` : auto-merge si patch **OU** (minor **ET** `direct:development`). Minor sur runtime deps + tous les majors → revue manuelle (commentaire l.4-11).                                                                                                                                                   | Préciser : « tous les patch, et les minor sur devDependencies seulement ».                                                                |

---

## 4. Écarts MINEURS

- **`quality/ci-pipeline.md:18,164`** : « quinze workflows » → il y en a **14** (`.github/workflows/*.yml`). `images.yml` compté deux fois dans les tables (off-by-one).
- **`quality/accessibilite.md:44`** : « tests a11y dans un projet vitest séparé `a11y` — `ui/atlas-ui/vitest.config.ts` » → ce fichier est mono-projet et le dit (l.17-18). Le projet `a11y` réel existe ailleurs (`apps/find-an-expert/vite.config.ts:63`). Source mal localisée.
- **`quality/ci-pipeline.md:198-208`** : `ci:checks` listé en 6 étapes → réel = `turbo run format:check check lint typecheck test:coverage build && pnpm dataops:check` (package.json:31). 7e étape `pnpm dataops:check` omise.
- **`architecture/data-flow.md:100-101`** : `crf-openapi` « publié sous `@univ-lehavre/atlas-ln` » → nom réel `@univ-lehavre/atlas-crf-openapi` (cli/crf-openapi/package.json:2). `atlas-ln` n'apparaît nulle part ailleurs.
- **`architecture/tech-choices.md:82-88`** : table de 5 serveurs MCP (effect-mcp, svelte-mcp, appwrite-docs, appwrite-api, openalex) → `.mcp.json` n'en déclare que 3 (svelte-mcp, effect-mcp, kubernetes). Appwrite-\*/openalex absents ; kubernetes manquant.
- **`architecture/modele-uplift-fwci.md:91-96`** : valeurs solo W11 « (2,0 + 3,5)/2 » → baseline réelle identique à W10, soit (1,5 + 4,0)/2 (test_uplift_labels.py:84). Total 5,25 correct ; décomposition pédagogique incohérente.
- **`collaboration/parametrage-github.md:51-57`** : « deux écosystèmes » Dependabot → **trois** (npm, github-actions, **pip** /dataops/citation-dagster, l.79). Ligne pip omise.
- **`collaboration/releases.md:101`** : exemple « `crf-core` → `redcap-client` » → sens inversé + paquets mélangés. Réel : `redcap-core`→`crf-core` (deprecate-renamed-packages.sh:31-32).
- **`collaboration/releases.md:62-64` (+ workflow.md:141, parametrage-github.md:102)** : PR « Version Packages » → titre réel `chore: version packages` (release.yml:78-79).
- **`collaboration/parametrage-github.md:110-113`** : exemple `contents: write` + `pages: write` pour la doc → `docs.yml:23-26` = `contents: read`, `pages: write`, `id-token: write`.
- **`collaboration/environnement-local.md:101-102`** : « pre-commit ET commit-msg utilisent `sed -i ''` » → seul commit-msg (lefthook.yml:12) ; pre-commit n'appelle aucun sed.
- **`audit/index.md:75`** : « 263 collectés » → le corps de l'audit (2026-05-29.md) ne mentionne nulle part 263 (0 occurrence) ; il trace 51 retenus + 13 rejetés. Sous-totaux exacts.
- **`decisions/0061-...md:118-119`** : actionlint « hook lefthook pre-push + step du job Audit » → actionlint n'existe QUE dans `ci.yml` (job Audit, l.249). Aucune commande actionlint dans lefthook.yml. Le step CI substantiel existe (garde-fou tenu) ; seul le « pre-push » est fictif.

---

## 5. Plan de correction priorisé

### Lot A — PR `docs/fix` unique « corriger les liens d'accueil cassés » (priorité 1, mécanique, fort impact)

Les 16 liens `docs/...` de README.md, CONTRIBUTING.md, SECURITY.md sont la dette la plus visible (404 GitHub sur les pages d'entrée) et la plus simple : un préfixage `docs/src/content/docs/` ou un repointage vers les URLs publiées `univ-lehavre.github.io/atlas/…`, plus la correction `monorepo.md`→`.mdx`. Aucun arbitrage, purement mécanique.

- Scope : `docs(fix)` ou `fix(docs)` racine — concerne README/CONTRIBUTING/SECURITY (fichiers racine).
- **Décision préalable utile** (groupable) : choisir une politique stable « liens racine → URLs publiées » plutôt que chemins relatifs, pour éviter la re-péremption à chaque réorganisation Astro. Le mérite un court ADR seulement si l'on veut la rendre opposable ; sinon convention de PR suffit.

### Lot B — PR `docs/fix` « purge des outils périmés cités comme actifs » (priorité 1, anti-désinformation)

Grouper les corrections VitePress→Astro Starlight (README.md:95, glossary.md:40, + ajout d'une entrée Astro Starlight au glossaire) et la config MCP réelle (environnement-local.md:124-144 **majeur**, tech-choices.md:82-88 **mineur**) — même nature (config périmée), même fichier de vérité (`.mcp.json`, `docs/package.json`).

- Scope : `docs(fix)`.

### Lot C — PR `docs/fix` « réaligner la doc CI sur ADR 0061 » (priorité 2, capacité)

Les 4 écarts de `ci-pipeline.md` (topologie build/docs, fail-fast, comptage workflows, ci:checks) plus la table pre-push de `hooks.md`. Tous pointent vers une page de référence qui n'a pas suivi ADR 0061 + l'évolution de lefthook. Cohérent en une PR (un seul réviseur croise ci.yml + lefthook.yml).

- Scope : `docs(fix)`. Y joindre le mineur actionlint : **deux options** — (a) ajouter une commande actionlint au pre-push de lefthook.yml (corrige le réel pour matcher l'ADR) ; (b) corriger l'ADR 0061 pour retirer « hook lefthook pre-push ». L'option (b) est documentaire pure ; l'option (a) est un changement de comportement (scope `ci` ou `build`) qui sort du lot doc et **nécessite une mini-décision** (vaut-il la pré-vérification locale redondante ?).

### Lot D — PR `docs/fix` « corrections factuelles architecture/collaboration » (priorité 2-3)

Regrouper les écarts factuels indépendants et locaux : monorepo.mdx (dataops/ADR 0066), data-flow.md (OpenAPI amarre + atlas-ln), workflow.md (catégories publiables **majeur**), parametrage-github.md (auto-merge **majeur** + dependabot 3 écosystèmes + permissions docs), releases.md (sens du rename + titre PR), environnement-local.md (sed), accessibilite.md, modele-uplift-fwci.md, audit/index.md (263).

- Scope : `docs(fix)`. Aucun n'exige d'ADR ; tous sont des recalages prose↔code.

### Nécessite une DÉCISION (pas un simple fix doc)

- **SLSA L3 (SECURITY.md:50)** : deux voies exclusives. (1) **Doc** — corriger en « SLSA Build L2 » (recommandé, conforme à l'audit G13). (2) **ADR de trajectoire** — si l'équipe veut viser L3 (generator durci/builder isolé/cosign attest), acter un ADR de palier et garder une formulation au futur. Ne pas laisser « L3 » au présent. À traiter **séparément** des lots mécaniques car c'est un arbitrage de posture sécurité, pas une coquille.

**Ordre recommandé** : A et B en premier (impact lecteur immédiat, zéro risque), puis C (capacité CI, nécessite de croiser ADR 0061), puis D (volume de petites corrections), et SLSA en décision dédiée.

Fichiers de preuve clés : `/Users/pierre-olivier.chasset/Hub/github/atlas/.github/workflows/ci.yml`, `/Users/pierre-olivier.chasset/Hub/github/atlas/lefthook.yml`, `/Users/pierre-olivier.chasset/Hub/github/atlas/.mcp.json`, `/Users/pierre-olivier.chasset/Hub/github/atlas/scripts/release/publish-packages.sh`, `/Users/pierre-olivier.chasset/Hub/github/atlas/pnpm-workspace.yaml`, `/Users/pierre-olivier.chasset/Hub/github/atlas/.github/workflows/sbom.yml`, `/Users/pierre-olivier.chasset/Hub/github/atlas/docs/src/content/docs/audit/2026-06-15-maturite-referentiels.md`.
