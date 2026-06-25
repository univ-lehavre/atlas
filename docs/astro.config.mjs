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
      // Sidebar THÉMATIQUE par DOMAINE d'ingénierie (ADR 0078, qui amende le
      // volet « sidebar par intention » de l'ADR 0076). Six groupes : un lecteur
      // retrouve son SUJET d'un bloc. Diátaxis (ADR 0074) reste un principe de
      // RÉDACTION (une page = un mode dominant) ; la navigation Diátaxis se
      // matérialise par l'ORDRE des entrées au sein de chaque catégorie
      // (comprendre → consulter → faire), via l'ordre des `items` ci-dessous —
      // jamais en badge affiché au lecteur (cargo-cult écarté par l'ADR 0074).
      //
      // Migration « config-only » (ADR 0078) : aucun fichier n'est déplacé,
      // aucune URL ne change ; seul le rattachement de groupe évolue. D'où le
      // décalage assumé entre l'URL (p. ex. /quality/security/) et le libellé
      // de catégorie (« Sécurité »).
      //
      // GARDE-FOU `pnpm audit:docs` (contrôle B9, scripts/audit/documentation.mjs) :
      // une page est joignable si son dossier de 1er niveau a un
      // `autogenerate.directory` OU si elle a un `link:` exact. architecture/,
      // quality/, collaboration/, apprendre/ sont en `link:` explicites : CHACUNE
      // de leurs pages DOIT figurer ci-dessous. decisions/, audit/, plans/
      // restent en `autogenerate`. Toute page ajoutée à un dossier en `link:`
      // doit être ajoutée ici (le build la rattrape sinon).
      sidebar: [
        {
          // A. Architecture & code.
          label: "Architecture & code",
          items: [
            { label: "Structure du monorepo", link: "/architecture/monorepo/" },
            {
              label: "Comprendre le code",
              link: "/architecture/comprendre-le-code/",
            },
            { label: "Flux de données", link: "/architecture/data-flow/" },
            { label: "Choix techniques", link: "/architecture/tech-choices/" },
            { label: "Style de code", link: "/quality/code-style/" },
            {
              label: "Politique de documentation",
              link: "/quality/documentation/",
            },
            { label: "Carte des paquets", link: "/architecture/packages/" },
          ],
        },
        {
          // B. Données, modèles & RGPD (ouverte dès maintenant — grossira).
          label: "Données, modèles & RGPD",
          items: [
            {
              label: "Modèle d'uplift FWCI",
              link: "/architecture/modele-uplift-fwci/",
            },
            {
              label: "Ré-dérivabilité mart/index",
              link: "/architecture/re-derivabilite-mart-index/",
            },
          ],
        },
        {
          // C. Tests & qualité.
          label: "Tests & qualité",
          items: [
            { label: "Tests", link: "/quality/tests/" },
            {
              label: "Matrice de couverture E2E",
              link: "/quality/matrice-e2e/",
            },
            { label: "Tableau de bord", link: "/quality/tableau-de-bord/" },
            { label: "Preuves", link: "/quality/preuves/" },
            { label: "Accessibilité", link: "/quality/accessibilite/" },
          ],
        },
        {
          // D. Sécurité.
          label: "Sécurité",
          items: [
            { label: "Garde-fous et conventions", link: "/quality/security/" },
            {
              label: "Réponse à incident",
              link: "/quality/incident-response/",
            },
          ],
        },
        {
          // E. Contribuer & livrer (du tutoriel à la livraison).
          label: "Contribuer & livrer",
          items: [
            {
              label: "Première prise en main",
              link: "/apprendre/premiere-prise-en-main/",
            },
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
            { label: "Pipeline CI", link: "/quality/ci-pipeline/" },
            { label: "Hooks Git", link: "/quality/hooks/" },
            {
              label: "Avant une mise en service",
              link: "/collaboration/checklist-deploiement/",
            },
            { label: "Releases", link: "/collaboration/releases/" },
          ],
        },
        {
          // F. Gouvernance : réunit Décisions + Audits + Plans (collections
          // datées, autogenerate). Le bilan vérifiable (normes) en tête.
          label: "Gouvernance",
          items: [
            {
              label: "Normes et pratiques appliquées",
              link: "/quality/normes/",
            },
            {
              label: "Décisions (ADR)",
              collapsed: true,
              items: [{ autogenerate: { directory: "decisions" } }],
            },
            {
              label: "Audits & écarts",
              collapsed: true,
              items: [{ autogenerate: { directory: "audit" } }],
            },
            {
              label: "Plans de résorption",
              collapsed: true,
              items: [{ autogenerate: { directory: "plans" } }],
            },
          ],
        },
        // Transverse : outil multi-audience, hors catégorie.
        { label: "Glossaire", link: "/glossary/" },
      ],
    }),
    mdx(),
  ],
});
