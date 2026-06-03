import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

// Collection de documentation Starlight (pages migrées dans src/content/docs).
const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });

// README des paquets, inclus EN PLACE (source unique, ADR 0036) : un glob lit
// les README là où ils vivent dans le monorepo, sans copie. Le titre est dérivé
// du premier H1 du fichier (ces README n'ont pas de frontmatter).
const packageReadmes = defineCollection({
  loader: glob({
    // Les huit catégories de workspaces (ADR 0002). `sandbox` inclus : la carte
    // des paquets lie ses README (section « Bancs d'essai »), donc leur route
    // doit exister sous /packages/sandbox/* sous peine de liens morts.
    pattern:
      "{apps,assets,cli,config,packages,sandbox,services,ui}/*/README.md",
    base: "..",
  }),
  schema: z.object({}).passthrough(),
});

// Référence API générée par TypeDoc (markdown, dans .generated/api, gitignoré
// et régénéré au build par `pnpm docs:api`). On exclut `_media/` (copies
// internes de README/ADR référencés depuis la JSDoc, pas des pages d'API).
const api = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!_media/**"],
    base: ".generated/api",
  }),
  schema: z.object({}).passthrough(),
});

export const collections = {
  docs,
  packageReadmes,
  api,
};
