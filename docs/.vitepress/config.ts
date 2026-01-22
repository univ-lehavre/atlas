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
            { text: 'Functions', link: '/api/@univ-lehavre/atlas-net/functions/dnsResolve' },
            { text: 'Interfaces', link: '/api/@univ-lehavre/atlas-net/interfaces/DiagnosticStep' },
            { text: 'Types', link: '/api/@univ-lehavre/atlas-net/type-aliases/DiagnosticStatus' },
            { text: 'Branded Types', link: '/api/@univ-lehavre/atlas-net/variables/IpAddress' },
            {
              text: 'Constants',
              link: '/api/@univ-lehavre/atlas-net/variables/DEFAULT_TCP_TIMEOUT_MS',
            },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
});
