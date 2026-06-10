import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { file, glob } from "astro/loaders";

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

// Registre des drifts (ADR 0056) : YAML source de vérité, parsé nativement par le
// loader `file()` d'Astro (aucune dépendance ajoutée). Le schéma Zod est le
// garde-fou : `docs:build` échoue si une entrée est malformée.
const drifts = defineCollection({
  loader: file("src/content/drifts/registre-drifts.yaml"),
  schema: z.object({
    id: z.string().regex(/^D\d+$/),
    campagne: z.string(),
    nature: z.enum(["drift-e2e", "piege-revue"]),
    portee: z.enum(["code", "env", "harnais"]),
    symptome: z.string(),
    cause: z.string(),
    correctif: z.string(),
    statut: z.enum(["corrige", "caduc", "ouvert"]),
  }),
});

export const collections = {
  docs,
  packageReadmes,
  drifts,
};
