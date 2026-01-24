import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Atlas',
  description: "Outils TypeScript pour REDCap et sources bibliographiques",
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
            { text: 'Demarrage', link: '/guide/' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'CLI Tools', link: '/guide/cli' },
          ],
        },
        {
          text: 'Citations',
          items: [
            { text: 'Vue d\'ensemble', link: '/guide/citations/' },
            { text: 'Architecture', link: '/guide/citations/architecture' },
            { text: 'Cycle de vie OpenAPI', link: '/guide/citations/openapi-lifecycle' },
            { text: 'Rate Limiting', link: '/guide/citations/rate-limiting' },
            { text: 'Validateur OpenAPI', link: '/guide/citations/openapi-validator' },
            { text: 'Client unifié', link: '/guide/citations/citations-client' },
          ],
        },
        {
          text: 'Sources bibliographiques',
          items: [
            { text: 'Vue d\'ensemble', link: '/guide/citations/sources/' },
            { text: 'OpenAlex', link: '/guide/citations/sources/openalex' },
            { text: 'Crossref', link: '/guide/citations/sources/crossref' },
            { text: 'HAL', link: '/guide/citations/sources/hal' },
            { text: 'ArXiv', link: '/guide/citations/sources/arxiv' },
            { text: 'ORCID', link: '/guide/citations/sources/orcid' },
            { text: 'Versioning', link: '/guide/citations/sources/versioning' },
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
