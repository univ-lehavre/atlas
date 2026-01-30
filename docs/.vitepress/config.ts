import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import apiSidebar from './data/api-sidebar.json';

export default withMermaid(defineConfig({
  title: 'Atlas',
  description: 'Plateforme de recherche - Université Le Havre Normandie',
  base: '/atlas/',
  ignoreDeadLinks: [
    // Localhost links in infrastructure docs
    /^http:\/\/localhost/,
    // API docs generated dynamically
    /^\.\/@univ-lehavre/,
    // External Appwrite documentation links
    /^\/docs\/references/,
    // Internal package documentation links
    /\.\/README/,
    /\.\/index/,
    /\.\/CLAUDE/,
    // TypeDoc generated links
    /type-aliases\/index/,
    // TypeDoc _media folder links (README files copied with broken relative links)
    /\.\.\/_media\/atlas-/,
    // README links pointing to docs/api (broken when copied by TypeDoc)
    /\.\.\/docs\/api\/@univ-lehavre/,
    // TypeDoc generated links pointing to old guide paths
    /\.\.\/\.\.\/docs\/guide\/dev\/crf/,
    // Relative links in CRF docs that reference external docs
    /^\.\/cli$/,
    /^\.\/architecture$/,
    // Legacy paths from TypeDoc READMEs
    /\/guide\/amarre/,
    /\/guide\/audit/,
    /\/guide\/find-an-expert/,
    /\/guide\/dev\/crf/,
    // Old audit paths (moved to projects)
    /\/audit\/amarre/,
    /\/audit\/ecrin/,
    /\/audit\/common\/index/,
    // Old roadmap paths (removed)
    /\/roadmaps\//,
    // API package index links (TypeDoc generates without /index suffix)
    /\/api\/@univ-lehavre\/[^/]+\/index$/,
  ],
  themeConfig: {
    nav: [
      {
        text: 'Guide',
        items: [
          { text: 'Chercheurs', link: '/guide/researchers/' },
          { text: 'Développeurs', link: '/guide/developers/' },
        ],
      },
      {
        text: 'Projects',
        items: [
          { text: 'ECRIN', link: '/projects/ecrin/' },
          { text: 'AMARRE', link: '/projects/amarre/' },
          { text: 'Citations', link: '/projects/citations/' },
          { text: 'CRF', link: '/projects/crf/' },
          { text: 'Microservices', link: '/projects/microservices/' },
        ],
      },
      { text: 'Audit', link: '/audit/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      // ECRIN
      '/projects/ecrin/': [
        {
          text: 'ECRIN',
          items: [
            { text: 'Présentation', link: '/projects/ecrin/' },
          ],
        },
        {
          text: 'Guide chercheur',
          items: [
            { text: 'Introduction', link: '/projects/ecrin/user/' },
          ],
        },
        {
          text: 'Documentation technique',
          items: [
            { text: 'Vue d\'ensemble', link: '/projects/ecrin/dev/' },
            { text: 'Configuration technique', link: '/projects/ecrin/find-an-expert/technical-setup' },
            { text: 'Configuration Appwrite', link: '/projects/ecrin/find-an-expert/appwrite-setup' },
            { text: 'Design System', link: '/projects/ecrin/find-an-expert/design-system' },
            { text: 'Architecture CSS', link: '/projects/ecrin/find-an-expert/css-architecture' },
          ],
        },
        {
          text: 'Audit',
          items: [
            { text: 'Audit ECRIN', link: '/projects/ecrin/audit/' },
            { text: 'Audit CSS', link: '/projects/ecrin/audit/css-audit-report' },
          ],
        },
      ],
      // Citations - guide chercheur et technique
      '/projects/citations/': [
        {
          text: 'Citations',
          items: [
            { text: 'Présentation', link: '/projects/citations/' },
          ],
        },
        {
          text: 'Guide chercheur',
          items: [
            { text: 'Introduction', link: '/projects/citations/user/' },
            { text: 'Vérifier vos publications', link: '/projects/citations/user/verify-publications' },
            { text: 'Gérer votre parcours', link: '/projects/citations/user/manage-career' },
            { text: "Profil d'expertise", link: '/projects/citations/user/expertise-profile' },
            { text: 'Réseau de collaborations', link: '/projects/citations/user/collaboration-network' },
            { text: 'Les sources de données', link: '/projects/citations/user/sources' },
          ],
        },
        {
          text: 'Documentation technique',
          items: [
            { text: "Vue d'ensemble", link: '/projects/citations/dev/' },
            { text: 'Architecture', link: '/projects/citations/dev/architecture' },
            { text: 'Schéma unifié', link: '/projects/citations/dev/unified-schema' },
            { text: 'Client unifié', link: '/projects/citations/dev/citations-client' },
            { text: 'Cycle de vie OpenAPI', link: '/projects/citations/dev/openapi-lifecycle' },
            { text: 'Rate Limiting', link: '/projects/citations/dev/rate-limiting' },
            { text: 'Validateur OpenAPI', link: '/projects/citations/dev/openapi-validator' },
          ],
        },
        {
          text: 'Atlas Verify',
          items: [
            { text: 'Fiabilisation auteur', link: '/projects/citations/dev/author-verification' },
            { text: 'Profil chercheur', link: '/projects/citations/dev/researcher-profile' },
            { text: 'Bases de données', link: '/projects/citations/dev/database-analysis' },
            { text: 'Bases avancées', link: '/projects/citations/dev/advanced-databases' },
          ],
        },
        {
          text: 'Sources bibliographiques',
          items: [
            { text: "Vue d'ensemble", link: '/projects/citations/dev/sources/' },
            { text: 'Catalogue complet', link: '/projects/citations/dev/sources/catalog' },
            { text: 'Référence entités', link: '/projects/citations/dev/sources/entities-reference' },
            { text: 'OpenAlex', link: '/projects/citations/dev/sources/openalex' },
            { text: 'Crossref', link: '/projects/citations/dev/sources/crossref' },
            { text: 'HAL', link: '/projects/citations/dev/sources/hal' },
            { text: 'ArXiv', link: '/projects/citations/dev/sources/arxiv' },
            { text: 'ORCID', link: '/projects/citations/dev/sources/orcid' },
            { text: 'Versioning', link: '/projects/citations/dev/sources/versioning' },
          ],
        },
        {
          text: 'Audit',
          items: [
            { text: 'Audit Citations', link: '/projects/citations/audit/' },
          ],
        },
      ],
      // CRF - documentation technique
      '/projects/crf/': [
        {
          text: 'CRF / REDCap',
          items: [
            { text: 'Documentation', link: '/projects/crf/' },
            { text: 'API Explorer', link: '/projects/crf/api-explorer' },
          ],
        },
        {
          text: 'Référence API',
          items: [
            { text: '@univ-lehavre/atlas-crf', link: '/api/@univ-lehavre/atlas-crf/' },
            { text: '@univ-lehavre/atlas-redcap-core', link: '/api/@univ-lehavre/atlas-redcap-core/' },
            { text: '@univ-lehavre/atlas-redcap-openapi', link: '/api/@univ-lehavre/atlas-redcap-openapi/' },
          ],
        },
        {
          text: 'Audit',
          items: [
            { text: 'Audit CRF', link: '/projects/crf/audit/' },
          ],
        },
      ],
      // Audits
      '/audit/': [
        {
          text: 'Audits',
          items: [
            { text: 'Introduction', link: '/audit/' },
          ],
        },
        {
          text: 'Commun',
          items: [
            { text: 'Outils d\'audit', link: '/audit/common/audit-tools' },
            { text: 'Audit de la documentation', link: '/audit/common/documentation-audit' },
            { text: 'Audit des dépendances', link: '/audit/common/dependencies-audit' },
            { text: 'Dette technique', link: '/audit/common/technical-debt' },
            { text: 'Audit qualité du code', link: '/audit/common/code-audit' },
          ],
        },
        {
          text: 'Par projet',
          items: [
            { text: 'ECRIN', link: '/projects/ecrin/audit/' },
            { text: 'Citations', link: '/projects/citations/audit/' },
            { text: 'CRF', link: '/projects/crf/audit/' },
          ],
        },
      ],
      // Microservices
      '/projects/microservices/': [
        {
          text: 'Microservices',
          items: [
            { text: 'Overview', link: '/projects/microservices/' },
            { text: 'K3s Installation', link: '/projects/microservices/installation' },
          ],
        },
      ],
      // AMARRE
      '/projects/amarre/': [
        {
          text: 'AMARRE',
          items: [
            { text: 'Introduction', link: '/projects/amarre/' },
            { text: 'Implémentation', link: '/projects/amarre/IMPLEMENTATION_GUIDE' },
            { text: 'Architecture', link: '/projects/amarre/ARCHITECTURE_DIAGRAMS' },
          ],
        },
      ],
      // Guide chercheurs
      '/guide/researchers/': [
        {
          text: 'Guide chercheur',
          items: [
            { text: 'Accueil', link: '/guide/researchers/' },
          ],
        },
        {
          text: 'Plateformes',
          items: [
            { text: 'ECRIN', link: '/projects/ecrin/user/' },
            { text: 'AMARRE', link: '/projects/amarre/' },
            { text: 'Citations', link: '/projects/citations/user/' },
          ],
        },
      ],
      // Guide développeurs
      '/guide/developers/': [
        {
          text: 'Documentation technique',
          items: [
            { text: "Vue d'ensemble", link: '/guide/developers/' },
            { text: 'Architecture', link: '/guide/developers/architecture' },
            { text: 'Outils CLI', link: '/guide/developers/cli' },
            { text: 'Infrastructure', link: '/guide/developers/infrastructure' },
          ],
        },
        {
          text: 'Par projet',
          items: [
            { text: 'ECRIN', link: '/projects/ecrin/dev/' },
            { text: 'Citations', link: '/projects/citations/dev/' },
            { text: 'CRF', link: '/projects/crf/' },
          ],
        },
        {
          text: 'Ressources',
          items: [
            { text: 'API', link: '/api/' },
            { text: 'Audits', link: '/audit/' },
          ],
        },
      ],
      '/api/': apiSidebar,
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
}));
