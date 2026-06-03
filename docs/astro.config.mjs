import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
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
      // Validation des liens internes au build (anti-régression). Casse le
      // build si un lien interne pointe vers une route inexistante — c'est ce
      // qui a manqué à la migration et a laissé passer des centaines de liens
      // morts (résolution relative + slash final). Vérifié en CI via docs:build.
      //
      // `exclude: /atlas/packages/**` : les pages de README de paquets sont
      // servies par une route Astro sur-mesure (`src/pages/packages/[...slug]`,
      // collection packageReadmes), que le validateur — limité aux pages gérées
      // par Starlight — ne sait pas introspecter ; il les prendrait à tort pour
      // des liens morts. Ces routes sont vérifiées exister par ailleurs (build +
      // audit). On garde la validation STRICTE sur tout le reste.
      //
      // `errorOnLocalLinks: false` : les README des bancs d'essai documentent
      // des URL `http://localhost:<port>` (services Docker : REDCap, Mailpit…) —
      // ce sont des exemples légitimes, pas des liens de dev oubliés.
      plugins: [
        starlightLinksValidator({
          exclude: ["/atlas/packages/**"],
          errorOnLocalLinks: false,
        }),
      ],
      // Favicon servi depuis public/ (motif générique « carte/atlas », neutre
      // de domaine — ADR 0035). Sans ce fichier, Starlight pointe par défaut
      // vers /favicon.svg qui n'existait pas → 404 sur chaque page.
      favicon: "/favicon.svg",
      // Site MONOLINGUE en français : le locale `root` n'ajoute aucun préfixe
      // d'URL et lit les pages à plat dans src/content/docs/. NE PAS utiliser
      // `defaultLocale` + `locales: { fr: … }` : Starlight traiterait alors `fr`
      // comme un locale NON-racine, attendrait les pages sous src/content/docs/fr/
      // et servirait les routes sous /fr/ — ce qui fait 404 toutes les pages
      // existantes en dev (le build, lui, masque le défaut). Cf. guide i18n
      // Starlight : « single language site » = un locale `root`.
      locales: {
        root: { label: "Français", lang: "fr" },
      },
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
      ],
    }),
    mdx(),
  ],
});
