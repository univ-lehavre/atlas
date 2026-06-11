import { Effect } from "effect";
import type postgres from "postgres";

import { PostgresError } from "../errors.js";

type Sql = postgres.Sql;

/**
 * Chargement de la recherche plein-texte lexicale (FTS) par chercheur (étape 4.2).
 *
 * Peuple `researchers.fts` (tsvector, cf. migration 0002) à partir d'un **document
 * texte par chercheur** — les labels de topics/mots-clés (issus de
 * `researcher-profiles`, même source et même clé `researcherId` que les vecteurs de
 * 4.3). Recherche lexicale PAR CHERCHEUR.
 *
 * **Honnêteté de périmètre** (cf. PR/plan 4.2) :
 * - cette source n'est PAS couverte par un `manifest.json` servi (researcher-profiles
 *   est un artefact in-memory), donc l'invariant « valider le contrat avant
 *   chargement » (3.6) ne s'applique pas à ce chemin — même souplesse que le chargement
 *   des vecteurs (4.3) ;
 * - on indexe le texte **par chercheur** (topics/mots-clés), pas les titres d'œuvres
 *   (le mart servi ne porte pas de titre) — la recherche par titre est différée.
 *
 * Idempotence par partition : un rechargement de `(dt, run)` **remplace** le `fts` de
 * chaque chercheur (upsert sur la clé `(researcher_id, dt, run)`), sans toucher à
 * l'`embedding` éventuellement posé par 4.3.
 */

/** Document FTS d'un chercheur pour une partition donnée. */
export interface ResearcherDocument {
  /** Identifiant d'auteur (clé chercheur), p. ex. `https://openalex.org/A…`. */
  readonly researcherId: string;
  /** Texte lexical (labels topics/mots-clés concaténés) à indexer. */
  readonly text: string;
}

/** Configuration de recherche textuelle. `simple` : pas de stemming linguistique
 * (labels techniques/multilingues) → déterministe. */
const _TS_CONFIG = "simple";

/**
 * Charge (upsert) le `fts` de chaque chercheur d'une partition `(dt, run)`.
 *
 * Sur conflit de clé `(researcher_id, dt, run)` (ligne déjà créée par 4.3 pour
 * l'embedding), met à jour `fts` sans écraser `embedding`. Renvoie le nombre de
 * documents chargés.
 */
const load_researcher_fts = (
  sql: Sql,
  dt: string,
  run: string,
  documents: ReadonlyArray<ResearcherDocument>,
): Effect.Effect<number, PostgresError, never> =>
  Effect.tryPromise({
    try: async () => {
      for (const doc of documents) {
        await sql`
          INSERT INTO researchers (researcher_id, fts, dt, run)
          VALUES (${doc.researcherId}, to_tsvector(${_TS_CONFIG}, ${doc.text}), ${dt}, ${run})
          ON CONFLICT (researcher_id, dt, run)
          DO UPDATE SET fts = EXCLUDED.fts
        `;
      }
      return documents.length;
    },
    catch: (cause: unknown) =>
      new PostgresError(`Impossible de charger le FTS des chercheurs`, {
        cause,
      }),
  });

/**
 * Recherche lexicale : renvoie les `researcher_id` d'une partition dont le document FTS
 * matche la requête (`@@ to_tsquery`), ordonnés par pertinence (`ts_rank`).
 */
const search_researchers_fts = (
  sql: Sql,
  dt: string,
  run: string,
  query: string,
  limit = 20,
): Effect.Effect<
  ReadonlyArray<{ researcher_id: string; rank: number }>,
  PostgresError,
  never
> =>
  Effect.tryPromise({
    try: () =>
      sql<{ researcher_id: string; rank: number }[]>`
        SELECT researcher_id, ts_rank(fts, to_tsquery(${_TS_CONFIG}, ${query})) AS rank
        FROM researchers
        WHERE dt = ${dt} AND run = ${run}
          AND fts @@ to_tsquery(${_TS_CONFIG}, ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `,
    catch: (cause: unknown) =>
      new PostgresError(`Impossible d'exécuter la recherche FTS`, { cause }),
  });

export { load_researcher_fts, search_researchers_fts };
