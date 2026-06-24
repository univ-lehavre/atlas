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
//
// Registre VIVANT (ADR 0071, volet a) : un drift non clos (`ouvert` ou `en-cours`
// de résorption) doit lier une issue GitHub de suivi (`issue`, ex. `#42`). Le
// `superRefine` ci-dessous EXIGE cette issue pour ces statuts — un drift non clos
// sans issue fait échouer le `docs:build` (donc la CI), comme une entrée malformée.
// Les statuts terminaux `corrige`/`caduc` n'en demandent pas (l'écart est clos ou
// caduc, plus rien à suivre).
const drifts = defineCollection({
  loader: file("src/content/drifts/registre-drifts.yaml"),
  schema: z
    .object({
      id: z.string().regex(/^D\d+$/),
      campagne: z.string(),
      nature: z.enum(["drift-e2e", "piege-revue"]),
      portee: z.enum(["code", "env", "harnais"]),
      symptome: z.string(),
      cause: z.string(),
      correctif: z.string(),
      statut: z.enum(["corrige", "caduc", "ouvert", "en-cours"]),
      // Référence d'issue GitHub de suivi (ex. `#42`). Requise pour un drift non
      // clos (voir `superRefine`).
      issue: z
        .string()
        .regex(/^#\d+$/)
        .optional(),
    })
    .superRefine((drift, ctx) => {
      const nonClos = drift.statut === "ouvert" || drift.statut === "en-cours";
      if (nonClos && !drift.issue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["issue"],
          message: `Drift ${drift.id} au statut « ${drift.statut} » doit lier une issue de suivi (champ \`issue\`, ex. \`#42\`) — ADR 0071, volet a.`,
        });
      }
    }),
});

export const collections = {
  docs,
  packageReadmes,
  drifts,
};
