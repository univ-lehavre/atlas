import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Atlas',
  description: 'REDCap API Monorepo Documentation',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/redcap-api' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Packages',
          items: [
            { text: 'redcap-api', link: '/api/redcap-api' },
            { text: 'redcap-service', link: '/api/redcap-service' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/univ-lehavre/atlas' }],
  },
});
