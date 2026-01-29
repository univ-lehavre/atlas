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
    // README links pointing to docs/api (broken when copied by TypeDoc)
    /\.\.\/docs\/api\/@univ-lehavre/,
    // Relative links in CRF docs that reference external docs
    /^\.\/cli$/,
    /^\.\/architecture$/,
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'ECRIN', link: '/guide/audit/ecrin-audit' },
      { text: 'AMARRE', link: '/guide/amarre/' },
      { text: 'Citations', link: '/guide/citations/' },
      { text: 'CRF', link: '/guide/dev/crf' },
      { text: 'Audits', link: '/guide/audit/' },
      { text: 'Roadmaps', link: '/guide/roadmaps/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      // ECRIN - Find an Expert
      '/guide/find-an-expert/': [
        {
          text: 'Find an Expert',
          items: [
            { text: 'Configuration technique', link: '/guide/find-an-expert/technical-setup' },
            { text: 'Configuration Appwrite', link: '/guide/find-an-expert/appwrite-setup' },
            { text: 'Design System', link: '/guide/find-an-expert/design-system' },
            { text: 'Architecture CSS', link: '/guide/find-an-expert/css-architecture' },
          ],
        },
      ],
      // Citations - guide chercheur et technique
      '/guide/citations/': [
        {
          text: 'Guide chercheur',
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
          text: 'Atlas Verify',
          items: [
            { text: 'Fiabilisation auteur', link: '/guide/citations/dev/author-verification' },
            { text: 'Profil chercheur', link: '/guide/citations/dev/researcher-profile' },
            { text: 'Bases de données', link: '/guide/citations/dev/database-analysis' },
            { text: 'Bases avancées', link: '/guide/citations/dev/advanced-databases' },
          ],
        },
        {
          text: 'Sources bibliographiques',
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
      ],
      // CRF - documentation technique
      '/guide/dev/crf': [
        {
          text: 'CRF / REDCap',
          items: [
            { text: 'Documentation', link: '/guide/dev/crf' },
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
      ],
      // Audits
      '/guide/audit/': [
        {
          text: 'Audits',
          items: [
            { text: 'Introduction', link: '/guide/audit/' },
            { text: 'Audit de la documentation', link: '/guide/audit/documentation-audit' },
            { text: 'Audit ECRIN', link: '/guide/audit/ecrin-audit' },
            { text: 'Audit des dépendances', link: '/guide/audit/dependencies-audit' },
            { text: 'Dette technique', link: '/guide/audit/technical-debt' },
          ],
        },
      ],
      // AMARRE
      '/guide/amarre/': [
        {
          text: 'AMARRE',
          items: [
            { text: 'Introduction', link: '/guide/amarre/' },
            { text: 'Implémentation', link: '/guide/amarre/IMPLEMENTATION_GUIDE' },
            { text: 'Architecture', link: '/guide/amarre/ARCHITECTURE_DIAGRAMS' },
            { text: 'Sécurité', link: '/guide/amarre/SECURITY' },
            { text: 'Tests IA', link: '/guide/amarre/AI_TESTING_GUIDE' },
            { text: 'Audit Microservices', link: '/guide/amarre/MICROSERVICES_AUDIT' },
          ],
        },
      ],
      // Roadmaps
      '/guide/roadmaps/': [
        {
          text: 'Roadmaps',
          items: [
            { text: 'Vue d\'ensemble', link: '/guide/roadmaps/' },
          ],
        },
      ],
      // Guide général (fallback)
      '/guide/': [
        {
          text: 'Introduction',
          items: [{ text: 'Présentation', link: '/guide/' }],
        },
        {
          text: 'Pour les développeurs',
          items: [
            { text: "Vue d'ensemble", link: '/guide/dev/' },
            { text: 'Architecture', link: '/guide/dev/architecture' },
            { text: 'Outils CLI', link: '/guide/dev/cli' },
            { text: 'Infrastructure', link: '/guide/dev/infrastructure' },
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
