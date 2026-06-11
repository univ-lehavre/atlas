/**
 * Contrat de données du pipeline DataOps : le `manifest.json` du mart servi.
 *
 * MIROIR EXACT du producteur Python (étape 3.4,
 * `dataops/citation-dagster/src/citation_dagster/assets/manifest.py`). Le manifest
 * est l'autorité du contrat de transfert (ADR 0029) : un consommateur le valide
 * (`row_count` + `sha256` de chaque part) AVANT de lire le Parquet et refuse une
 * `schema_version` inconnue. La logique de validation vit dans
 * `@univ-lehavre/atlas-citation` ; ce module n'expose que la forme et la version.
 */

/**
 * Version du schéma du contrat. DOIT rester égale à la constante Python
 * `MANIFEST_SCHEMA_VERSION` (= 1). Un bump (forme du manifest modifiée) incrémente
 * cette valeur des deux côtés ; le consommateur refuse toute version qu'il ne connaît
 * pas (pas de best-effort).
 */
export const MANIFEST_SCHEMA_VERSION = 1;

/** Une part du mart : objet Parquet, son `sha256` (hex 64) et sa taille en octets. */
export interface ManifestPart {
  /** Clé S3 **relative au bucket** (résoluble en `s3://<bucket>/<key>`). */
  readonly key: string;
  /** Empreinte SHA-256 hexadécimale (64 caractères) des octets de la part. */
  readonly sha256: string;
  /** Taille de la part en octets. */
  readonly bytes: number;
}

/** Le `manifest.json` du mart servi (forme exacte produite par l'asset Dagster). */
export interface Manifest {
  /** Identifiant de partition : `dt=YYYY-MM/run=<id>`. */
  readonly partition: string;
  /** Version du schéma du contrat (cf. {@link MANIFEST_SCHEMA_VERSION}). */
  readonly schema_version: number;
  /** Nombre total de lignes du mart (somme des parts). */
  readonly row_count: number;
  /** Les parts Parquet du mart (triées par clé côté producteur). */
  readonly parts: readonly ManifestPart[];
  /** Horodatage ISO 8601 UTC de production (métadonnée, hors contrat de hachage). */
  readonly produced_at: string;
}
