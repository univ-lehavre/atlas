import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// Sidebar de la Référence API, générée par `pnpm docs:api` (TypeDoc +
// scripts/docs/generate-api-sidebar.ts) dans un fichier gitignoré. Si elle
// n'a pas encore été produite (rare en dev), on retombe sur un menu minimal.
const apiSidebarPath = fileURLToPath(
  new URL("./data/api-sidebar.json", import.meta.url),
);
const apiSidebar = existsSync(apiSidebarPath)
  ? JSON.parse(readFileSync(apiSidebarPath, "utf8"))
  : [{ text: "Reference", items: [{ text: "Vue d'ensemble", link: "/api/" }] }];

export default withMermaid(
  defineConfig({
    title: "Atlas",
    description:
      "Dépôt unique rassemblant plusieurs projets logiciels sous une chaîne de qualité commune",
    lang: "fr-FR",
    base: "/atlas/",
    rewrites: {
      // Les index des sections sont en README.md (convention GitHub) ;
      // on les remappe sur index.md pour que `/section/` résolve dans
      // VitePress.
      "decisions/README.md": "decisions/index.md",
      "audit/README.md": "audit/index.md",
      "plans/README.md": "plans/index.md",
    },
    ignoreDeadLinks: [
      // URLs localhost utilisées comme exemples dans la doc CI/dev (pas
      // de la navigation, pas joignables depuis le runner GitHub Pages).
      /^http:\/\/localhost/,
      // Liens vers des fichiers du dépôt situés HORS de `docs/` (config
      // racine : `.nvmrc`, `.npmrc`, `.github/*`, `SECURITY.md`,
      // `lefthook.yml`…). Ce sont de vraies cibles versionnées, mais
      // VitePress ne construit que l'arbre `docs/` et les considère donc
      // « mortes ». On les conserve telles quelles (relatives au dépôt) :
      // elles fonctionnent dans GitHub (rendu Markdown du repo) et sur la
      // page locale, pas besoin de les réécrire en URLs absolues.
      // VitePress normalise ces liens en `./../../…`, d'où le motif.
      /\.\.\/\.\.\//,
      // Référence API (`docs/api/**`) : générée par TypeDoc. Ses liens
      // croisés — internes (TypeDoc émet des cibles que VitePress ne résout
      // pas toujours, ex. `./type-aliases/index`, `./README`) comme externes
      // (doc d'un SDK tiers tel Appwrite : `/docs/references/...`) — ne sont
      // pas de notre ressort et n'ont pas à bloquer la build. La fraîcheur de
      // l'API est garantie par sa régénération (`pnpm docs:api`), pas par le
      // contrôle de liens morts. On neutralise les motifs émis par TypeDoc.
      /\/docs\/references\//,
      /(^|\/)(README|index)$/,
      /\/type-aliases\/index$/,
      /\/namespaces\//,
    ],
    // `docs/api/_media/**` : copies internes de TypeDoc (README et ADR
    // référencés depuis la JSDoc). Ce ne sont pas des pages du site ; on les
    // exclut de la build pour ne pas hériter de leurs liens relatifs cassés.
    srcExclude: ["**/api/_media/**"],
    themeConfig: {
      nav: [
        { text: "Architecture", link: "/architecture/monorepo" },
        { text: "Qualité", link: "/quality/ci-pipeline" },
        { text: "Sécurité", link: "/quality/security" },
        { text: "Collaboration", link: "/collaboration/workflow" },
        { text: "Décisions", link: "/decisions/" },
        { text: "Référence API", link: "/api/" },
        { text: "Audits", link: "/audit/" },
        { text: "Plans", link: "/plans/" },
        { text: "Glossaire", link: "/glossary" },
      ],
      sidebar: {
        "/architecture/": [
          {
            text: "Architecture",
            items: [
              { text: "Monorepo", link: "/architecture/monorepo" },
              {
                text: "Comprendre le code",
                link: "/architecture/comprendre-le-code",
              },
              { text: "Carte des paquets", link: "/architecture/packages" },
              { text: "Flux de données", link: "/architecture/data-flow" },
              {
                text: "Ré-dérivabilité (RGPD)",
                link: "/architecture/re-derivabilite-mart-index",
              },
              { text: "Choix techniques", link: "/architecture/tech-choices" },
            ],
          },
        ],
        "/quality/": [
          {
            text: "Qualité & sécurité",
            items: [
              { text: "Pipeline CI", link: "/quality/ci-pipeline" },
              { text: "Tableau de bord", link: "/quality/tableau-de-bord" },
              { text: "Évolution du dépôt", link: "/quality/evolution-git" },
              { text: "Tests", link: "/quality/tests" },
              { text: "Style de code", link: "/quality/code-style" },
              { text: "Hooks Git", link: "/quality/hooks" },
              { text: "Documentation", link: "/quality/documentation" },
              { text: "Sécurité", link: "/quality/security" },
              {
                text: "Réponse aux incidents",
                link: "/quality/incident-response",
              },
            ],
          },
        ],
        "/collaboration/": [
          {
            text: "Collaboration",
            items: [
              { text: "Workflow", link: "/collaboration/workflow" },
              {
                text: "Environnement local",
                link: "/collaboration/environnement-local",
              },
              {
                text: "Paramétrage GitHub",
                link: "/collaboration/parametrage-github",
              },
              { text: "Releases", link: "/collaboration/releases" },
              {
                text: "Installer les CLIs",
                link: "/collaboration/installer-les-clis",
              },
            ],
          },
        ],
        "/decisions/": [
          {
            text: "Architecture Decision Records",
            items: [
              { text: "Index", link: "/decisions/" },
              {
                text: "0001 — DevSecOps périmètre repo, sine die",
                link: "/decisions/0001-devsecops-perimetre-repo-sine-die",
              },
              {
                text: "0002 — Monorepo 8 catégories",
                link: "/decisions/0002-monorepo-huit-categories",
              },
              {
                text: "0003 — Logos split assets + CLI",
                link: "/decisions/0003-logos-split-assets-cli",
              },
              {
                text: "0004 — Volumes anonymes sillage-sandbox",
                link: "/decisions/0004-volumes-anonymes-sillage-sandbox",
              },
              {
                text: "0005 — Effect pour la PF",
                link: "/decisions/0005-effect-pour-la-pf",
              },
              {
                text: "0006 — SvelteKit, Hono, Bootstrap",
                link: "/decisions/0006-sveltekit-hono-bootstrap",
              },
              {
                text: "0007 — REDCap et Appwrite",
                link: "/decisions/0007-redcap-appwrite-plateformes",
              },
              {
                text: "0008 — CLIs thins",
                link: "/decisions/0008-clis-thins-logique-dans-packages",
              },
              {
                text: "0009 — atlas source canonique",
                link: "/decisions/0009-atlas-source-canonique-amarre",
              },
              {
                text: "0010 — node-appwrite SDK 25.x",
                link: "/decisions/0010-node-appwrite-sdk-25",
              },
              {
                text: "0011 — Paquets internes private",
                link: "/decisions/0011-paquets-internes-private",
              },
              {
                text: "0012 — Neutralisation framing institutionnel",
                link: "/decisions/0012-neutralisation-framing-institutionnel",
              },
              {
                text: "0013 — Documentation FR non-expert",
                link: "/decisions/0013-documentation-public-non-expert-fr",
              },
              {
                text: "0014 — Conventional Commits",
                link: "/decisions/0014-conventional-commits-scopes-restreints",
              },
              {
                text: "0015 — Hooks Git via lefthook",
                link: "/decisions/0015-hooks-git-lefthook-jamais-bypass",
              },
              {
                text: "0016 — Branch protection main",
                link: "/decisions/0016-branch-protection-main",
              },
              {
                text: "0017 — Releases OIDC deux registres",
                link: "/decisions/0017-releases-npm-oidc-deux-registres",
              },
              {
                text: "0018 — SLA remédiation findings",
                link: "/decisions/0018-sla-remediation-findings",
              },
              {
                text: "0019 — Dérogations workspace audit",
                link: "/decisions/0019-derogations-workspace-audit",
              },
              {
                text: "0020 — Lint Svelte au preset strict",
                link: "/decisions/0020-svelte-eslint-strict",
              },
              {
                text: "0021 — Politique deps sandboxes",
                link: "/decisions/0021-sandbox-deps-policy",
              },
              {
                text: "0022 — Convention de nommage atlas-",
                link: "/decisions/0022-naming-convention",
              },
              {
                text: "0023 — storybook:build cassé en amont",
                link: "/decisions/0023-storybook-build-casse-amont",
              },
              {
                text: "0024 — Ranges ~ sur les paquets publiables",
                link: "/decisions/0024-ranges-deps-publiables-tilde",
              },
              {
                text: "0025 — Documentation à plusieurs niveaux",
                link: "/decisions/0025-documentation-multi-niveaux",
              },
              {
                text: "0026 — Périmètre RGPD hors dépôt",
                link: "/decisions/0026-rgpd-perimetre",
              },
              {
                text: "0027 — Security champion (vacant)",
                link: "/decisions/0027-security-champion",
              },
              {
                text: "0028 — Documentation vérifiable",
                link: "/decisions/0028-documentation-verifiable",
              },
              {
                text: "0029 — Pipeline collaborations (DataOps)",
                link: "/decisions/0029-architecture-pipeline-collaborations",
              },
              {
                text: "0030 — RGPD profilage collaborations",
                link: "/decisions/0030-rgpd-profilage-collaborations",
              },
              {
                text: "0031 — Outil générique open-source",
                link: "/decisions/0031-outil-generique-open-source",
              },
              {
                text: "0032 — KPI : généré vs snapshot",
                link: "/decisions/0032-kpi-determinisme-vs-snapshot",
              },
              {
                text: "0033 — Contrat d'interface cluster",
                link: "/decisions/0033-contrat-interface-cluster",
              },
              {
                text: "0034 — CI adaptative par chemin",
                link: "/decisions/0034-ci-adaptative-par-chemin",
              },
            ],
          },
        ],
        "/audit/": [
          {
            text: "Audits",
            items: [
              { text: "Index", link: "/audit/" },
              {
                text: "2026-05-29 — Audit complet",
                link: "/audit/2026-05-29",
              },
            ],
          },
        ],
        "/plans/": [
          {
            text: "Plans",
            items: [
              { text: "Index", link: "/plans/" },
              {
                text: "2026-05-30 — Plan de résorption",
                link: "/plans/2026-05-30-resorption",
              },
              {
                text: "2026-05-30 — Rapport de validation",
                link: "/plans/2026-05-30-resorption-validation",
              },
              {
                text: "Documentation vérifiable",
                link: "/plans/documentation-verifiable",
              },
              {
                text: "Pipeline de collaborations",
                link: "/plans/2026-06-02-pipeline-collaborations",
              },
            ],
          },
        ],
        "/api/": apiSidebar,
      },
      socialLinks: [
        { icon: "github", link: "https://github.com/univ-lehavre/atlas" },
      ],
    },
  }),
);
