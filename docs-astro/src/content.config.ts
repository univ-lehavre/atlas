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
    pattern: "{packages,cli,services,apps,config,ui,assets}/*/README.md",
    base: "..",
  }),
  schema: z.object({}).passthrough(),
});

export const collections = {
  docs,
  packageReadmes,
};
