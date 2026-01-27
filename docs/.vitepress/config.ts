import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Atlas',
  description: 'Outils TypeScript pour REDCap et sources bibliographiques',
  base: '/atlas/',
  ignoreDeadLinks: [
    // Localhost links in infrastructure docs
    /^http:\/\/localhost/,
    // API docs generated dynamically
    /^\.\/@univ-lehavre/,
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
      ],
      '/api/': [
        {
          text: 'Reference',
          items: [{ text: "Vue d'ensemble", link: '/api/' }],
        },
        {
          text: '@univ-lehavre/atlas-crf',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/@univ-lehavre/atlas-crf/' },
          ],
        },
        {
          text: '@univ-lehavre/atlas-net',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/@univ-lehavre/atlas-net/' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
});
