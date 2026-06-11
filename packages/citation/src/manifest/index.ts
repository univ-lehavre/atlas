/**
 * Validateur du contrat de données (manifest, étape 3.6).
 *
 * Un consommateur (chargement d'index Phase 4, `atlas-api` Phase 5) valide le
 * `manifest.json` du mart servi AVANT de lire le Parquet :
 *
 *  - {@link validateManifest} : décode la FORME (Schema) et REFUSE une
 *    `schema_version` inconnue (pas de best-effort) ;
 *  - {@link verifyPart} : recalcule le `sha256` des octets d'une part et refuse en
 *    cas de divergence (intégrité avant lecture).
 *
 * Le validateur est PUR : il ne lit pas S3. Le consommateur fournit les octets de
 * chaque part (lus de S3/disque) à {@link verifyPart}. Forme du contrat : voir
 * `@univ-lehavre/atlas-citation-types` (miroir du producteur Python, ADR 0029).
 */

import { createHash } from "node:crypto";

import {
  MANIFEST_SCHEMA_VERSION,
  type Manifest,
} from "@univ-lehavre/atlas-citation-types";
import { Effect, Schema } from "effect";

import { ManifestError } from "../errors.js";

const _SHA256_HEX = /^[0-9a-f]{64}$/;

/** Schéma de décodage du manifest (mirroir de la forme produite par Dagster). */
const ManifestSchema = Schema.Struct({
  partition: Schema.NonEmptyString,
  schema_version: Schema.Number,
  row_count: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
  parts: Schema.Array(
    Schema.Struct({
      key: Schema.NonEmptyString,
      sha256: Schema.String.pipe(Schema.pattern(_SHA256_HEX)),
      bytes: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
    }),
  ),
  produced_at: Schema.NonEmptyString,
});

/**
 * Valide la forme du manifest puis REFUSE toute `schema_version` ≠ celle connue.
 *
 * Échoue (`ManifestError`) si : JSON mal formé / champ manquant / `sha256` non
 * hexadécimal 64 / `schema_version` inconnue. La validation se fait AVANT toute
 * lecture du Parquet (le manifest absent/illisible est traité par l'appelant).
 */
const validateManifest = (
  input: unknown,
): Effect.Effect<Manifest, ManifestError, never> =>
  Schema.decodeUnknown(ManifestSchema)(input).pipe(
    Effect.mapError(
      (cause) =>
        new ManifestError("Manifest mal formé (forme du contrat invalide)", {
          cause,
        }),
    ),
    Effect.flatMap((manifest) =>
      manifest.schema_version === MANIFEST_SCHEMA_VERSION
        ? Effect.succeed(manifest as Manifest)
        : Effect.fail(
            new ManifestError(
              `schema_version inconnue : ${String(manifest.schema_version)} ` +
                `(attendu ${String(MANIFEST_SCHEMA_VERSION)})`,
            ),
          ),
    ),
  );

/**
 * Vérifie l'intégrité d'une part : le `sha256` des `bytes` doit égaler
 * `expectedSha256`. Refuse (`ManifestError`) en cas de divergence — le consommateur
 * ne doit alors PAS lire la part.
 */
const verifyPart = (
  bytes: Uint8Array,
  expectedSha256: string,
): Effect.Effect<void, ManifestError, never> =>
  Effect.gen(function* () {
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== expectedSha256) {
      yield* Effect.fail(
        new ManifestError(
          `sha256 invalide : attendu ${expectedSha256}, obtenu ${actual}`,
        ),
      );
    }
  });

export { validateManifest, verifyPart };
