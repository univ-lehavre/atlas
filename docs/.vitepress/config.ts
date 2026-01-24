import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Atlas',
  description: "Outils TypeScript pour REDCap et sources bibliographiques",
  base: '/atlas/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Présentation', link: '/guide/' },
          ],
        },
        {
          text: 'Atlas Verify - Guide chercheur',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/citations/user/' },
            { text: 'Vérifier vos publications', link: '/guide/citations/user/verify-publications' },
            { text: 'Gérer votre parcours', link: '/guide/citations/user/manage-career' },
            { text: 'Profil d\'expertise', link: '/guide/citations/user/expertise-profile' },
            { text: 'Réseau de collaborations', link: '/guide/citations/user/collaboration-network' },
            { text: 'Les sources de données', link: '/guide/citations/user/sources' },
          ],
        },
        {
          text: 'Documentation technique',
          collapsed: true,
          items: [
            { text: 'Vue d\'ensemble', link: '/guide/dev/' },
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
            { text: 'Vue d\'ensemble', link: '/guide/citations/dev/' },
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
            { text: 'Vue d\'ensemble', link: '/guide/citations/dev/sources/' },
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
      '/api/': [
        {
          text: 'Reference',
          items: [{ text: "Vue d'ensemble", link: '/api/' }],
        },
        {
          text: 'crf',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/@univ-lehavre/crf/' },
            {
              text: 'REDCap Client',
              link: '/api/@univ-lehavre/crf/redcap/',
            },
            {
              text: 'CRF Server',
              link: '/api/@univ-lehavre/crf/server/',
            },
          ],
        },
        {
          text: 'net',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/@univ-lehavre/atlas-net/' },
            {
              text: 'Functions',
              collapsed: true,
              items: [
                {
                  text: 'checkInternet',
                  link: '/api/@univ-lehavre/atlas-net/functions/checkInternet',
                },
                { text: 'dnsResolve', link: '/api/@univ-lehavre/atlas-net/functions/dnsResolve' },
                { text: 'tcpPing', link: '/api/@univ-lehavre/atlas-net/functions/tcpPing' },
                {
                  text: 'tlsHandshake',
                  link: '/api/@univ-lehavre/atlas-net/functions/tlsHandshake',
                },
              ],
            },
            {
              text: 'Interfaces',
              collapsed: true,
              items: [
                {
                  text: 'DiagnosticResult',
                  link: '/api/@univ-lehavre/atlas-net/interfaces/DiagnosticResult',
                },
                {
                  text: 'DiagnosticStep',
                  link: '/api/@univ-lehavre/atlas-net/interfaces/DiagnosticStep',
                },
                {
                  text: 'TcpPingOptions',
                  link: '/api/@univ-lehavre/atlas-net/interfaces/TcpPingOptions',
                },
                {
                  text: 'TlsHandshakeOptions',
                  link: '/api/@univ-lehavre/atlas-net/interfaces/TlsHandshakeOptions',
                },
              ],
            },
            {
              text: 'Types',
              collapsed: true,
              items: [
                {
                  text: 'DiagnosticStatus',
                  link: '/api/@univ-lehavre/atlas-net/type-aliases/DiagnosticStatus',
                },
                { text: 'IpAddress', link: '/api/@univ-lehavre/atlas-net/type-aliases/IpAddress' },
                { text: 'Port', link: '/api/@univ-lehavre/atlas-net/type-aliases/Port' },
                { text: 'TimeoutMs', link: '/api/@univ-lehavre/atlas-net/type-aliases/TimeoutMs' },
              ],
            },
            {
              text: 'Variables',
              collapsed: true,
              items: [
                {
                  text: 'DEFAULT_INTERNET_CHECK_TIMEOUT_MS',
                  link: '/api/@univ-lehavre/atlas-net/variables/DEFAULT_INTERNET_CHECK_TIMEOUT_MS',
                },
                {
                  text: 'DEFAULT_TCP_TIMEOUT_MS',
                  link: '/api/@univ-lehavre/atlas-net/variables/DEFAULT_TCP_TIMEOUT_MS',
                },
                {
                  text: 'DEFAULT_TLS_TIMEOUT_MS',
                  link: '/api/@univ-lehavre/atlas-net/variables/DEFAULT_TLS_TIMEOUT_MS',
                },
                { text: 'HTTPS_PORT', link: '/api/@univ-lehavre/atlas-net/variables/HTTPS_PORT' },
                {
                  text: 'INTERNET_CHECK_HOST',
                  link: '/api/@univ-lehavre/atlas-net/variables/INTERNET_CHECK_HOST',
                },
                { text: 'IpAddress', link: '/api/@univ-lehavre/atlas-net/variables/IpAddress' },
                { text: 'Port', link: '/api/@univ-lehavre/atlas-net/variables/Port' },
                { text: 'TimeoutMs', link: '/api/@univ-lehavre/atlas-net/variables/TimeoutMs' },
              ],
            },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
});
