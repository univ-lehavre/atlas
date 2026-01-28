import { defineConfig } from 'vitepress';

export default defineConfig({
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
    // Relative links in CRF docs that reference external docs
    /^\.\/cli$/,
    /^\.\/architecture$/,
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [{ text: 'Présentation', link: '/guide/' }],
        },
        {
          text: 'ECRIN - Plateforme chercheurs',
          collapsed: false,
          items: [
            { text: 'Audit ECRIN', link: '/guide/audit/ecrin-audit' },
            { text: 'Find an Expert', link: '/guide/find-an-expert/technical-setup' },
            { text: 'Configuration Appwrite', link: '/guide/find-an-expert/appwrite-setup' },
            { text: 'Design System', link: '/guide/find-an-expert/design-system' },
            { text: 'Architecture CSS', link: '/guide/find-an-expert/css-architecture' },
          ],
        },
        {
          text: 'Atlas Verify - Guide chercheur',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/citations/user/' },
            { text: 'Vérifier vos publications', link: '/guide/citations/user/verify-publications' },
            { text: 'Gérer votre parcours', link: '/guide/citations/user/manage-career' },
            { text: "Profil d'expertise", link: '/guide/citations/user/expertise-profile' },
            { text: 'Réseau de collaborations', link: '/guide/citations/user/collaboration-network' },
            { text: 'Les sources de données', link: '/guide/citations/user/sources' },
          ],
        },
        {
          text: 'Documentation technique',
          collapsed: true,
          items: [
            { text: "Vue d'ensemble", link: '/guide/dev/' },
            { text: 'Architecture', link: '/guide/dev/architecture' },
            { text: 'Audit et qualité', link: '/guide/dev/audit' },
            { text: 'REDCap/CRF', link: '/guide/dev/crf' },
            { text: 'Outils CLI', link: '/guide/dev/cli' },
            { text: 'Infrastructure', link: '/guide/dev/infrastructure' },
          ],
        },
        {
          text: 'Atlas Citations - Technique',
          collapsed: true,
          items: [
            { text: "Vue d'ensemble", link: '/guide/citations/dev/' },
            { text: 'Architecture', link: '/guide/citations/dev/architecture' },
            { text: 'Schéma unifié', link: '/guide/citations/dev/unified-schema' },
            { text: 'Client unifié', link: '/guide/citations/dev/citations-client' },
            { text: 'Cycle de vie OpenAPI', link: '/guide/citations/dev/openapi-lifecycle' },
            { text: 'Rate Limiting', link: '/guide/citations/dev/rate-limiting' },
            { text: 'Validateur OpenAPI', link: '/guide/citations/dev/openapi-validator' },
          ],
        },
        {
          text: 'Atlas Verify - Technique',
          collapsed: true,
          items: [
            { text: 'Fiabilisation auteur', link: '/guide/citations/dev/author-verification' },
            { text: 'Profil chercheur', link: '/guide/citations/dev/researcher-profile' },
            { text: 'Bases de données', link: '/guide/citations/dev/database-analysis' },
            { text: 'Bases avancées', link: '/guide/citations/dev/advanced-databases' },
          ],
        },
        {
          text: 'Sources bibliographiques',
          collapsed: true,
          items: [
            { text: "Vue d'ensemble", link: '/guide/citations/dev/sources/' },
            { text: 'Catalogue complet', link: '/guide/citations/dev/sources/catalog' },
            { text: 'Référence entités', link: '/guide/citations/dev/sources/entities-reference' },
            { text: 'OpenAlex', link: '/guide/citations/dev/sources/openalex' },
            { text: 'Crossref', link: '/guide/citations/dev/sources/crossref' },
            { text: 'HAL', link: '/guide/citations/dev/sources/hal' },
            { text: 'ArXiv', link: '/guide/citations/dev/sources/arxiv' },
            { text: 'ORCID', link: '/guide/citations/dev/sources/orcid' },
            { text: 'Versioning', link: '/guide/citations/dev/sources/versioning' },
          ],
        },
        {
          text: 'AMARRE',
          collapsed: true,
          items: [
            { text: 'Introduction', link: '/guide/amarre/' },
            { text: 'Implémentation', link: '/guide/amarre/IMPLEMENTATION_GUIDE' },
            { text: 'Architecture', link: '/guide/amarre/ARCHITECTURE_DIAGRAMS' },
            { text: 'Sécurité', link: '/guide/amarre/SECURITY' },
            { text: 'Tests IA', link: '/guide/amarre/AI_TESTING_GUIDE' },
            { text: 'Audit Microservices', link: '/guide/amarre/MICROSERVICES_AUDIT' },
          ],
        },
        {
          text: 'Audits',
          collapsed: true,
          items: [
            { text: 'Introduction', link: '/guide/audit/' },
            { text: 'Audit de la documentation', link: '/guide/audit/documentation-audit' },
            { text: 'Audit ECRIN', link: '/guide/audit/ecrin-audit' },
            { text: 'Audit des dépendances', link: '/guide/audit/dependencies-audit' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Reference',
          items: [{ text: "Vue d'ensemble", link: '/api/' }],
        },
        {
          text: 'REDCap',
          collapsed: false,
          items: [
            { text: '@univ-lehavre/atlas-crf', link: '/api/@univ-lehavre/atlas-crf/' },
            { text: '@univ-lehavre/atlas-redcap-core', link: '/api/@univ-lehavre/atlas-redcap-core/' },
            { text: '@univ-lehavre/atlas-redcap-openapi', link: '/api/@univ-lehavre/atlas-redcap-openapi/' },
          ],
        },
        {
          text: 'Utilitaires',
          collapsed: false,
          items: [
            { text: '@univ-lehavre/atlas-net', link: '/api/@univ-lehavre/atlas-net/' },
            { text: '@univ-lehavre/atlas-errors', link: '/api/@univ-lehavre/atlas-errors/' },
            { text: '@univ-lehavre/atlas-validators', link: '/api/@univ-lehavre/atlas-validators/' },
          ],
        },
        {
          text: 'Appwrite',
          collapsed: false,
          items: [
            { text: '@univ-lehavre/atlas-appwrite', link: '/api/@univ-lehavre/atlas-appwrite/' },
            { text: '@univ-lehavre/atlas-auth', link: '/api/@univ-lehavre/atlas-auth/' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
});
