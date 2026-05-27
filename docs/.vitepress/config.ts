import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "Atlas",
    description:
      "Dépôt unique rassemblant plusieurs projets logiciels sous une chaîne de qualité commune",
    lang: "fr-FR",
    base: "/atlas/",
    ignoreDeadLinks: [
      // URLs localhost utilisées comme exemples dans la doc CI/dev (pas
      // de la navigation, pas joignables depuis le runner GitHub Pages).
      /^http:\/\/localhost/,
    ],
    themeConfig: {
      nav: [
        { text: "Architecture", link: "/architecture/monorepo" },
        { text: "Qualité", link: "/quality/ci-pipeline" },
        { text: "Collaboration", link: "/collaboration/workflow" },
        { text: "Glossaire", link: "/glossary" },
      ],
      sidebar: {
        "/architecture/": [
          {
            text: "Architecture",
            items: [
              { text: "Monorepo", link: "/architecture/monorepo" },
              { text: "Flux de données", link: "/architecture/data-flow" },
              { text: "Choix techniques", link: "/architecture/tech-choices" },
            ],
          },
        ],
        "/quality/": [
          {
            text: "Qualité & sécurité",
            items: [
              { text: "Pipeline CI", link: "/quality/ci-pipeline" },
              { text: "Tests", link: "/quality/tests" },
              { text: "Style de code", link: "/quality/code-style" },
              { text: "Hooks Git", link: "/quality/hooks" },
              { text: "Sécurité", link: "/quality/security" },
              {
                text: "Réponse aux incidents",
                link: "/quality/incident-response",
              },
            ],
          },
        ],
        "/collaboration/": [
          {
            text: "Collaboration",
            items: [
              { text: "Workflow", link: "/collaboration/workflow" },
              { text: "Releases", link: "/collaboration/releases" },
            ],
          },
        ],
      },
      socialLinks: [
        { icon: "github", link: "https://github.com/univ-lehavre/atlas" },
      ],
    },
  }),
);
