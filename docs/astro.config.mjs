import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import vue from "@astrojs/vue";
import mermaid from "astro-mermaid";
import mdx from "@astrojs/mdx";

// Socle Astro Starlight de la documentation Atlas (migration depuis VitePress,
// ADR 0036). Astro embarque son propre Vite : la doc est découplée de la chaîne
// Vite des applications SvelteKit du monorepo (cause de l'abandon de VitePress).
export default defineConfig({
  base: "/atlas/",
  integrations: [
    // mermaid AVANT starlight (requis par astro-mermaid pour s'insérer dans le
    // pipeline rehype) ; mdx APRÈS starlight (qui fournit astro-expressive-code).
    mermaid({ theme: "default" }),
    vue(),
    starlight({
      title: "Atlas",
      defaultLocale: "fr",
      locales: { fr: { label: "Français", lang: "fr-FR" } },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/univ-lehavre/atlas",
        },
      ],
      // Sidebar par sections (reprend la structure VitePress). Syntaxe
      // Starlight ≥ 0.39 : un groupe a un `label` et des `items`, dont une
      // entrée `autogenerate` qui construit le groupe depuis l'arborescence.
      sidebar: [
        {
          label: "Architecture",
          items: [{ autogenerate: { directory: "architecture" } }],
        },
        {
          label: "Qualité & sécurité",
          items: [{ autogenerate: { directory: "quality" } }],
        },
        {
          label: "Collaboration",
          items: [{ autogenerate: { directory: "collaboration" } }],
        },
        {
          label: "Décisions",
          items: [{ autogenerate: { directory: "decisions" } }],
        },
        {
          label: "Audits",
          items: [{ autogenerate: { directory: "audit" } }],
        },
        {
          label: "Plans",
          items: [{ autogenerate: { directory: "plans" } }],
        },
        { label: "Glossaire", link: "/glossary/" },
        { label: "Référence API", link: "/api/" },
      ],
    }),
    mdx(),
  ],
});
