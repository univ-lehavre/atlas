import { Data } from "effect";

/**
 * Échec d'une opération de cache (lecture, écriture, connexion, DDL).
 * Erreur typée à la manière de `PostgresError` du paquet `citation` — le détail
 * technique vit dans `cause`, jamais propagé en clair à l'appelant.
 */
export class CacheError extends Data.TaggedError("CacheError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
