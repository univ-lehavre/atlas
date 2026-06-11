import { Effect } from "effect";
import type postgres from "postgres";

import { PostgresError } from "../errors.js";

type Sql = postgres.Sql;

/**
 * Chargement des vecteurs sémantiques par chercheur (étape 4.3).
 *
 * Peuple `researchers.embedding` (`vector(384)`, cf. migration 0001) à partir des
 * embeddings `all-MiniLM-L6-v2` **déjà produits** par `researcher-profiles`
 * (`EmbeddingProfile { researcherId, vector: Float32Array }`) — **aucun nouveau modèle,
 * aucun GPU** : on réutilise les vecteurs tels quels. Un vecteur PAR chercheur, clé
 * `researcherId`. L'index pgvector HNSW (cosinus) existe déjà (0001).
 *
 * Idempotence par partition : un rechargement de `(dt, run)` **remplace** l'`embedding`
 * de chaque chercheur (upsert sur `(researcher_id, dt, run)`), sans toucher au `fts`
 * éventuellement posé par 4.2.
 *
 * **Honnêteté de périmètre** (comme le FTS 4.2) : la source vient de
 * `researcher-profiles` (artefact in-memory), **pas** d'un `manifest.json` servi —
 * l'invariant « valider le contrat avant chargement » (3.6) ne s'applique pas à ce chemin.
 */

/** Dimension du vecteur (all-MiniLM-L6-v2). Le schéma fige `vector(384)`. */
const _DIM = 384;

/** Vecteur d'un chercheur pour une partition donnée. */
export interface ResearcherVector {
  /** Identifiant d'auteur (clé chercheur). */
  readonly researcherId: string;
  /** Embedding de dimension 384 (réutilisé de `researcher-profiles`). */
  readonly vector: ReadonlyArray<number> | Float32Array;
}

/** Sérialise un vecteur au format texte attendu par pgvector : `[f1,f2,…]`. */
const _to_pgvector_literal = (
  vector: ReadonlyArray<number> | Float32Array,
): string => `[${Array.from(vector).join(",")}]`;

/**
 * Charge (upsert) l'`embedding` de chaque chercheur d'une partition `(dt, run)`.
 *
 * Échoue (`PostgresError`) si un vecteur n'a pas la dimension 384 (le schéma
 * `vector(384)` le rejetterait de toute façon — on échoue tôt, message clair). Sur
 * conflit de clé, met à jour `embedding` sans écraser `fts`. Renvoie le nombre chargé.
 */
const load_researcher_vectors = (
  sql: Sql,
  dt: string,
  run: string,
  vectors: ReadonlyArray<ResearcherVector>,
): Effect.Effect<number, PostgresError, never> =>
  Effect.gen(function* () {
    for (const v of vectors) {
      // Float32Array et number[] exposent tous deux `.length`.
      const length = v.vector.length;
      if (length !== _DIM) {
        return yield* Effect.fail(
          new PostgresError(
            `Vecteur de dimension ${String(length)} pour ${v.researcherId} ` +
              `(attendu ${String(_DIM)})`,
          ),
        );
      }
    }
    yield* Effect.tryPromise({
      try: async () => {
        for (const v of vectors) {
          const literal = _to_pgvector_literal(v.vector);
          await sql`
            INSERT INTO researchers (researcher_id, embedding, dt, run)
            VALUES (${v.researcherId}, ${literal}::vector, ${dt}, ${run})
            ON CONFLICT (researcher_id, dt, run)
            DO UPDATE SET embedding = EXCLUDED.embedding
          `;
        }
      },
      catch: (cause: unknown) =>
        new PostgresError(`Impossible de charger les vecteurs des chercheurs`, {
          cause,
        }),
    });
    return vectors.length;
  });

/**
 * Recherche sémantique kNN : renvoie les `researcher_id` d'une partition les plus
 * proches du vecteur de requête (distance cosinus pgvector `<=>`), du plus proche au
 * plus lointain.
 */
const search_researchers_knn = (
  sql: Sql,
  dt: string,
  run: string,
  query: ReadonlyArray<number> | Float32Array,
  limit = 20,
): Effect.Effect<
  ReadonlyArray<{ researcher_id: string; distance: number }>,
  PostgresError,
  never
> =>
  Effect.gen(function* () {
    if (query.length !== _DIM) {
      return yield* Effect.fail(
        new PostgresError(
          `Vecteur de requête de dimension ${String(query.length)} (attendu 384)`,
        ),
      );
    }
    const literal = _to_pgvector_literal(query);
    return yield* Effect.tryPromise({
      try: () =>
        sql<{ researcher_id: string; distance: number }[]>`
          SELECT researcher_id, (embedding <=> ${literal}::vector) AS distance
          FROM researchers
          WHERE dt = ${dt} AND run = ${run} AND embedding IS NOT NULL
          ORDER BY embedding <=> ${literal}::vector
          LIMIT ${limit}
        `,
      catch: (cause: unknown) =>
        new PostgresError(`Impossible d'exécuter la recherche kNN`, { cause }),
    });
  });

export { load_researcher_vectors, search_researchers_knn };
