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
            { text: 'Classes', link: '/api/classes/RedcapClientService' },
            { text: 'Interfaces', link: '/api/interfaces/RedcapClient' },
            { text: 'Functions', link: '/api/functions/createRedcapClient' },
            { text: 'Types', link: '/api/type-aliases/RedcapUrl' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
});
