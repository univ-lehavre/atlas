import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Atlas',
  description: "Outils TypeScript pour l'API REDCap",
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
      ],
      '/api/': [
        {
          text: 'Reference',
          items: [{ text: "Vue d'ensemble", link: '/api/' }],
        },
        {
          text: 'redcap-api',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/@univ-lehavre/atlas-redcap-api/' },
            {
              text: 'Classes',
              link: '/api/@univ-lehavre/atlas-redcap-api/classes/RedcapClientService',
            },
            {
              text: 'Interfaces',
              link: '/api/@univ-lehavre/atlas-redcap-api/interfaces/RedcapClient',
            },
            {
              text: 'Functions',
              link: '/api/@univ-lehavre/atlas-redcap-api/functions/createRedcapClient',
            },
            { text: 'Types', link: '/api/@univ-lehavre/atlas-redcap-api/type-aliases/RedcapUrl' },
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
