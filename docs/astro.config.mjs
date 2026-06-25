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
      // Sidebar par INTENTION (Diátaxis — ADR 0074, mise en œuvre ADR 0076) :
      // quatre groupes — Apprendre (tutorial), Faire (how-to), Consulter
      // (reference), Comprendre (explanation) — au lieu d'un regroupement par
      // dossier. Une page d'un même dossier peut atterrir dans deux groupes
      // selon son intention (p. ex. architecture/packages en Consulter vs le
      // reste d'architecture en Comprendre).
      //
      // Stratégie : `link:` explicites pour les pages STABLES réparties par
      // intention (architecture, quality, collaboration) ; `autogenerate`
      // conservé pour les COLLECTIONS DATÉES volumineuses (decisions, audit,
      // plans), placé dans le groupe du mode dominant de leur corpus, avec un
      // rappel de leur index en lien dans « Consulter ».
      //
      // GARDE-FOU `pnpm audit:docs` (contrôle B9, scripts/audit/documentation.mjs) :
      // une page est joignable si son dossier de 1er niveau a un
      // `autogenerate.directory` OU si elle a un `link:` exact. Comme
      // architecture/quality/collaboration ne sont plus autogénérés, CHACUNE de
      // leurs pages DOIT figurer en `link:` ci-dessous — sinon B9 la déclare
      // orpheline et l'audit casse. Toute page ajoutée à ces dossiers doit donc
      // être ajoutée ici (le build la rattrape sinon).
      sidebar: [
        {
          // tutorial — vide aujourd'hui (trou identifié ADR 0074). Un groupe
          // sans items n'est pas rendu par Starlight : on réserve l'intention.
          label: "Apprendre",
          items: [],
        },
        {
          // how-to — accomplir une tâche.
          label: "Faire",
          items: [
            { label: "Travailler ensemble", link: "/collaboration/workflow/" },
            {
              label: "Environnement local",
              link: "/collaboration/environnement-local/",
            },
            {
              label: "Installer les CLIs",
              link: "/collaboration/installer-les-clis/",
            },
            {
              label: "Paramétrer GitHub",
              link: "/collaboration/parametrage-github/",
            },
            {
              label: "Avant une mise en service",
              link: "/collaboration/checklist-deploiement/",
            },
            {
              label: "Réponse à incident",
              link: "/quality/incident-response/",
            },
            {
              label: "Plans de résorption",
              collapsed: true,
              items: [{ autogenerate: { directory: "plans" } }],
            },
          ],
        },
        {
          // reference — consulter un fait.
          label: "Consulter",
          items: [
            {
              label: "Bonnes pratiques (portail)",
              link: "/quality/bonnes-pratiques/",
            },
            { label: "Gouvernance (portail)", link: "/quality/gouvernance/" },
            {
              label: "Normes et pratiques appliquées",
              link: "/quality/normes/",
            },
            { label: "Sécurité", link: "/quality/security/" },
            { label: "Pipeline CI", link: "/quality/ci-pipeline/" },
            { label: "Hooks Git", link: "/quality/hooks/" },
            { label: "Accessibilité", link: "/quality/accessibilite/" },
            { label: "Tableau de bord", link: "/quality/tableau-de-bord/" },
            {
              label: "Matrice de couverture E2E",
              link: "/quality/matrice-e2e/",
            },
            { label: "Preuves", link: "/quality/preuves/" },
            { label: "Carte des paquets", link: "/architecture/packages/" },
            { label: "Releases", link: "/collaboration/releases/" },
            { label: "Glossaire", link: "/glossary/" },
            { label: "Index des ADR", link: "/decisions/" },
            { label: "Index des audits", link: "/audit/" },
            {
              label: "Registre des drifts",
              link: "/audit/registre-drifts/",
            },
            { label: "Index des plans", link: "/plans/" },
          ],
        },
        {
          // explanation — comprendre le pourquoi.
          label: "Comprendre",
          items: [
            { label: "Structure du monorepo", link: "/architecture/monorepo/" },
            {
              label: "Comprendre le code",
              link: "/architecture/comprendre-le-code/",
            },
            { label: "Flux de données", link: "/architecture/data-flow/" },
            { label: "Choix techniques", link: "/architecture/tech-choices/" },
            {
              label: "Modèle d'uplift FWCI",
              link: "/architecture/modele-uplift-fwci/",
            },
            {
              label: "Ré-dérivabilité mart/index",
              link: "/architecture/re-derivabilite-mart-index/",
            },
            { label: "Style de code", link: "/quality/code-style/" },
            { label: "Tests", link: "/quality/tests/" },
            {
              label: "Politique de documentation",
              link: "/quality/documentation/",
            },
            {
              label: "Décisions (ADR)",
              collapsed: true,
              items: [{ autogenerate: { directory: "decisions" } }],
            },
            {
              label: "Rapports d'audit",
              collapsed: true,
              items: [{ autogenerate: { directory: "audit" } }],
            },
          ],
        },
      ],
    }),
    mdx(),
  ],
});
