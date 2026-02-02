import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import apiSidebar from './data/api-sidebar.json';

export default withMermaid(
  defineConfig({
    title: 'Atlas',
    description: 'Research Platform - Le Havre Normandie University',
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
            { text: 'Researchers', link: '/guide/researchers/' },
            { text: 'Developers', link: '/guide/developers/' },
          ],
        },
        {
          text: 'Projects',
          items: [
            { text: 'Atlas', link: '/projects/atlas/' },
            { text: 'ECRIN', link: '/projects/ecrin/' },
            { text: 'AMARRE', link: '/projects/amarre/' },
            { text: 'Citations', link: '/projects/citations/' },
            { text: 'CRF', link: '/projects/crf/' },
            { text: 'Microservices', link: '/projects/microservices/' },
          ],
        },
        { text: 'API', link: '/api/' },
      ],
      sidebar: {
        // ECRIN
        '/projects/ecrin/': [
          {
            text: 'ECRIN',
            items: [
              { text: 'Overview', link: '/projects/ecrin/' },
              { text: 'Specifications', link: '/projects/ecrin/specifications' },
            ],
          },
          {
            text: 'Researcher Guide',
            items: [{ text: 'Introduction', link: '/projects/ecrin/user/' }],
          },
          {
            text: 'Technical Documentation',
            items: [
              { text: 'Overview', link: '/projects/ecrin/dev/' },
              {
                text: 'Technical Setup',
                link: '/projects/ecrin/find-an-expert/technical-setup',
              },
              {
                text: 'Appwrite Setup',
                link: '/projects/ecrin/find-an-expert/appwrite-setup',
              },
              {
                text: 'Design System',
                link: '/projects/ecrin/find-an-expert/design-system',
              },
              {
                text: 'CSS Architecture',
                link: '/projects/ecrin/find-an-expert/css-architecture',
              },
            ],
          },
          {
            text: 'Audit',
            items: [
              { text: 'ECRIN Audit', link: '/projects/ecrin/audit/' },
              {
                text: 'CSS Audit',
                link: '/projects/ecrin/audit/css-audit-report',
              },
            ],
          },
        ],
        // Citations - guide chercheur et technique
        '/projects/citations/': [
          {
            text: 'Citations',
            items: [{ text: 'Overview', link: '/projects/citations/' }],
          },
          {
            text: 'Researcher Guide',
            items: [
              { text: 'Introduction', link: '/projects/citations/user/' },
              {
                text: 'Verify Your Publications',
                link: '/projects/citations/user/verify-publications',
              },
              {
                text: 'Manage Your Career',
                link: '/projects/citations/user/manage-career',
              },
              {
                text: 'Expertise Profile',
                link: '/projects/citations/user/expertise-profile',
              },
              {
                text: 'Collaboration Network',
                link: '/projects/citations/user/collaboration-network',
              },
              {
                text: 'Data Sources',
                link: '/projects/citations/user/sources',
              },
            ],
          },
          {
            text: 'Technical Documentation',
            items: [
              { text: 'Overview', link: '/projects/citations/dev/' },
              {
                text: 'Architecture',
                link: '/projects/citations/dev/architecture',
              },
              {
                text: 'Unified Schema',
                link: '/projects/citations/dev/unified-schema',
              },
              {
                text: 'Unified Client',
                link: '/projects/citations/dev/citations-client',
              },
              {
                text: 'OpenAPI Lifecycle',
                link: '/projects/citations/dev/openapi-lifecycle',
              },
              {
                text: 'Rate Limiting',
                link: '/projects/citations/dev/rate-limiting',
              },
              {
                text: 'OpenAPI Validator',
                link: '/projects/citations/dev/openapi-validator',
              },
            ],
          },
          {
            text: 'Atlas Verify',
            items: [
              {
                text: 'Author Verification',
                link: '/projects/citations/dev/author-verification',
              },
              {
                text: 'Researcher Profile',
                link: '/projects/citations/dev/researcher-profile',
              },
              {
                text: 'Databases',
                link: '/projects/citations/dev/database-analysis',
              },
              {
                text: 'Advanced Databases',
                link: '/projects/citations/dev/advanced-databases',
              },
            ],
          },
          {
            text: 'Bibliographic Sources',
            items: [
              { text: 'Overview', link: '/projects/citations/dev/sources/' },
              {
                text: 'Full Catalog',
                link: '/projects/citations/dev/sources/catalog',
              },
              {
                text: 'Entities Reference',
                link: '/projects/citations/dev/sources/entities-reference',
              },
              {
                text: 'OpenAlex',
                link: '/projects/citations/dev/sources/openalex',
              },
              {
                text: 'Crossref',
                link: '/projects/citations/dev/sources/crossref',
              },
              { text: 'HAL', link: '/projects/citations/dev/sources/hal' },
              { text: 'ArXiv', link: '/projects/citations/dev/sources/arxiv' },
              { text: 'ORCID', link: '/projects/citations/dev/sources/orcid' },
              {
                text: 'Versioning',
                link: '/projects/citations/dev/sources/versioning',
              },
            ],
          },
          {
            text: 'Audit',
            items: [
              { text: 'Citations Audit', link: '/projects/citations/audit/' },
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
            text: 'API Reference',
            items: [
              {
                text: '@univ-lehavre/atlas-crf',
                link: '/api/@univ-lehavre/atlas-crf/',
              },
              {
                text: '@univ-lehavre/atlas-redcap-core',
                link: '/api/@univ-lehavre/atlas-redcap-core/',
              },
              {
                text: '@univ-lehavre/atlas-redcap-openapi',
                link: '/api/@univ-lehavre/atlas-redcap-openapi/',
              },
            ],
          },
          {
            text: 'Audit',
            items: [{ text: 'Audit CRF', link: '/projects/crf/audit/' }],
          },
        ],
        // Atlas (monorepo)
        '/projects/atlas/': [
          {
            text: 'Atlas Monorepo',
            items: [{ text: 'Overview', link: '/projects/atlas/' }],
          },
          {
            text: 'Audits',
            items: [
              { text: 'Audit tools', link: '/projects/atlas/audit-tools' },
              {
                text: 'Documentation audit',
                link: '/projects/atlas/documentation-audit',
              },
              {
                text: 'Dependency audit',
                link: '/projects/atlas/dependencies-audit',
              },
              { text: 'Technical debt', link: '/projects/atlas/technical-debt' },
            ],
          },
        ],
        // Microservices
        '/projects/microservices/': [
          {
            text: 'Microservices',
            items: [
              { text: 'Overview', link: '/projects/microservices/' },
            ],
          },
          {
            text: 'Installation Guide',
            items: [
              {
                text: 'Overview',
                link: '/projects/microservices/installation/',
              },
              {
                text: '1. System Preparation',
                link: '/projects/microservices/installation/01-preparation',
              },
              {
                text: '2. K3s Core',
                link: '/projects/microservices/installation/02-k3s-core',
              },
              {
                text: '3. Vault',
                link: '/projects/microservices/installation/03-vault',
              },
              {
                text: '4. Databases',
                link: '/projects/microservices/installation/04-databases',
              },
              {
                text: '5. Services',
                link: '/projects/microservices/installation/05-services',
              },
              {
                text: '6. DevOps',
                link: '/projects/microservices/installation/06-devops',
              },
              {
                text: '7. Monitoring',
                link: '/projects/microservices/installation/07-monitoring',
              },
              {
                text: '8. Security',
                link: '/projects/microservices/installation/08-security',
              },
              {
                text: '9. Operations',
                link: '/projects/microservices/installation/09-operations',
              },
            ],
          },
        ],
        // AMARRE
        '/projects/amarre/': [
          {
            text: 'AMARRE',
            items: [
              { text: 'Introduction', link: '/projects/amarre/' },
              {
                text: 'Implementation',
                link: '/projects/amarre/IMPLEMENTATION_GUIDE',
              },
              {
                text: 'Architecture',
                link: '/projects/amarre/ARCHITECTURE_DIAGRAMS',
              },
            ],
          },
        ],
        // Guide researchers
        '/guide/researchers/': [
          {
            text: 'Researcher Guide',
            items: [{ text: 'Overview', link: '/guide/researchers/' }],
          },
          {
            text: 'Platforms',
            items: [
              { text: 'ECRIN', link: '/projects/ecrin/user/' },
              { text: 'AMARRE', link: '/projects/amarre/' },
              { text: 'Citations', link: '/projects/citations/user/' },
            ],
          },
        ],
        // Guide developers
        '/guide/developers/': [
          {
            text: 'Technical Documentation',
            items: [
              { text: 'Overview', link: '/guide/developers/' },
              { text: 'Architecture', link: '/guide/developers/architecture' },
              { text: 'CLI tools', link: '/guide/developers/cli' },
              {
                text: 'Infrastructure',
                link: '/guide/developers/infrastructure',
              },
            ],
          },
          {
            text: 'By project',
            items: [
              { text: 'ECRIN', link: '/projects/ecrin/dev/' },
              { text: 'Citations', link: '/projects/citations/dev/' },
              { text: 'CRF', link: '/projects/crf/' },
            ],
          },
          {
            text: 'Resources',
            items: [
              { text: 'API', link: '/api/' },
              { text: 'Audits', link: '/audit/' },
            ],
          },
        ],
        '/api/': apiSidebar,
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/univ-lehavre/atlas' },
      ],
    },
  }),
);
