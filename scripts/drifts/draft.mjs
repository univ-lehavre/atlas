/**
 * @fileoverview Écriture d'un brouillon de drift au point d'échec (ADR 0080, volet a).
 *
 * Un _brouillon_ est un fichier **local, gitignoré, jamais commité** que les
 * capteurs (reporter Playwright, hook pytest) déposent quand un run du harnais
 * Atlas échoue. Il capture le `symptome` **à chaud** — le message d'erreur tel
 * qu'il s'affiche — pour que l'humain n'ait plus à le reconstituer de mémoire.
 *
 * Le brouillon n'est PAS une entrée de registre : c'est une capture brute que
 * `pnpm drift:new` (ADR 0080, volet b) promeut ensuite en entrée conforme, APRÈS
 * que l'humain a jugé l'écart _marquant_ (ce jugement reste humain, ADR 0056).
 *
 * Contrat de format (JSON, lu par le CLI de promotion, écrit par les deux
 * capteurs Node ET un capteur Python — d'où un format minimal et stable) :
 *
 *   {
 *     "schema": 1,
 *     "source": "playwright:amarre-smoke" | "pytest:citation-dagster" | …,
 *     "symptome": "<message d'erreur capturé à chaud>",
 *     "campagne": "<intitulé du test ou du chantier, indicatif>",
 *     "capturedAt": "<ISO 8601>"
 *   }
 *
 * Un fichier par run échoué (nom unique : source + horodatage + suffixe), pour ne
 * pas écraser un brouillon antérieur non promu. Le dossier est gitignoré.
 *
 * @module
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Dossier des brouillons, à la racine du dépôt. Gitignoré (cf. `.gitignore`,
 * section « Brouillons de drifts »). On le résout depuis ce module : `scripts/
 * drifts/` → deux niveaux au-dessus = racine.
 */
export const DRAFTS_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  ".drifts-drafts",
);

/** Version du contrat de brouillon (incrémentée si le format change). */
const DRAFT_SCHEMA = 1;

/**
 * Tronque un message d'erreur pour qu'un brouillon reste lisible : on garde la
 * tête (là où vit la cause apparente) et on borne la taille. Le détail complet
 * reste dans les artefacts du run (trace Playwright, sortie pytest).
 * @param {string} message message d'erreur brut.
 * @param {number} max longueur maximale conservée.
 * @returns {string} message borné, espaces de bord retirés.
 */
export const boundSymptom = (message, max = 1200) => {
  const trimmed = (message ?? "").trim();
  return trimmed.length > max
    ? `${trimmed.slice(0, max)}\n…(tronqué)`
    : trimmed;
};

/**
 * Nom de fichier unique et trié dans le temps pour un brouillon : horodatage
 * compact + source assainie. Deux échecs simultanés (workers parallèles)
 * obtiennent des noms distincts via `discriminator`.
 * @param {string} source identifiant du capteur (`playwright:…`, `pytest:…`).
 * @param {Date} now instant de capture.
 * @param {string} discriminator suffixe d'unicité (index de worker, pid…).
 * @returns {string} nom de fichier `.drift.json`.
 */
export const draftFilename = (source, now, discriminator = "") => {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const safeSource = source.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const tail = discriminator ? `-${discriminator}` : "";
  return `${stamp}-${safeSource}${tail}.drift.json`;
};

/**
 * Écrit un brouillon de drift dans `DRAFTS_DIR`. Idempotent quant au dossier
 * (créé au besoin). N'échoue jamais le run en cours : la capture est un service
 * rendu, pas un test — une erreur d'écriture est avalée (le run garde son verdict
 * d'origine), seul un avertissement est tracé.
 *
 * @param {object} fields
 * @param {string} fields.source identifiant du capteur.
 * @param {string} fields.symptome message d'erreur capturé à chaud.
 * @param {string} [fields.campagne] intitulé indicatif (test/chantier).
 * @param {Date} [fields.now] instant de capture (injectable pour les tests).
 * @param {string} [fields.discriminator] suffixe d'unicité.
 * @returns {string | null} chemin du brouillon écrit, ou `null` si l'écriture a échoué.
 */
export const writeDraft = ({
  source,
  symptome,
  campagne = "",
  now = new Date(),
  discriminator = "",
}) => {
  try {
    mkdirSync(DRAFTS_DIR, { recursive: true });
    const file = path.join(
      DRAFTS_DIR,
      draftFilename(source, now, discriminator),
    );
    const payload = {
      schema: DRAFT_SCHEMA,
      source,
      symptome: boundSymptom(symptome),
      campagne,
      capturedAt: now.toISOString(),
    };
    writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return file;
  } catch (err) {
    // La capture ne doit jamais masquer ni aggraver l'échec du run lui-même.
    process.stderr.write(
      `[drift] capture du brouillon impossible (ignoré) : ${err}\n`,
    );
    return null;
  }
};
