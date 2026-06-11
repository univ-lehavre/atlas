# @univ-lehavre/atlas-citation

Bibliothèque de curation OpenAlex pour recherche d'auteurs et récupération de publications.

Le package expose la recherche d'auteurs, la récupération d'articles par auteur ou par identifiants de travaux, la lecture de configuration d'environnement et les erreurs métier associées. Il sert de couche fonctionnelle au CLI OpenAlex qui guide la sélection des formes de nom, affiliations et publications.

## Usage

```typescript
import { Effect } from "effect";
import {
  searchAuthors,
  retrieve_articles,
  retrieve_articles_given_work_ids,
} from "@univ-lehavre/atlas-citation";

const authors = await Effect.runPromise(searchAuthors("Dupont Jean"));
const works = await Effect.runPromise(
  retrieve_articles(
    ["https://openalex.org/A123456789"],
    ["https://openalex.org/I4210166736"],
  ),
);
```

Pour un usage interactif en terminal, voir `@univ-lehavre/atlas-citation-cli` dans `cli/citation`.

## Configuration

Requires a `.env` file:

```ini
OPENALEX_API_URL=https://api.openalex.org
PER_PAGE=25
OPENALEX_API_KEY=          # optional
```

## Validateur du contrat de données (manifest)

Le package expose aussi le **validateur du contrat** producteur↔consommateur du
pipeline DataOps. Le pipeline (Python, `dataops/`) produit un `manifest.json` à côté du
mart Parquet servi ; **avant de lire**, un consommateur (chargement d'index, `atlas-api`)
valide ce manifest. La forme du contrat (`Manifest`, `MANIFEST_SCHEMA_VERSION`) vit dans
[`@univ-lehavre/atlas-citation-types`](/atlas/packages/packages/citation-types/) —
**miroir exact** du producteur Python (ADR 0029).

```typescript
import { Effect } from "effect";
import { validateManifest, verifyPart } from "@univ-lehavre/atlas-citation";

// 1) Valide la FORME + REFUSE une schema_version inconnue (pas de best-effort).
const manifest = await Effect.runPromise(validateManifest(jsonFromS3));

// 2) Pour chaque part, vérifie l'intégrité AVANT de lire (octets fournis par l'appelant).
for (const part of manifest.parts) {
  const bytes = await readObject(part.key); // lecture S3/disque côté consommateur
  await Effect.runPromise(verifyPart(bytes, part.sha256));
}
```

Échecs (`ManifestError`) : `schema_version` inconnue, manifest mal formé, `sha256`
divergent. Le validateur est **pur** (aucune I/O S3) : l'appelant fournit les octets.

## Index PostgreSQL/pgvector (étape 4.1)

Le package fournit l'accès à l'**index d'exploration** PostgreSQL/pgvector — **dérivé**
du mart servi (jamais l'autorité du contrat, donc régénérable). Module Effect
`src/pg/` : connexion via [`postgres`](https://github.com/porsager/postgres)
enveloppé dans `Effect.tryPromise` (même patron que le module DuckDB), un **runner de
migrations** raw-SQL idempotent, et la DSN construite **depuis l'environnement** (jamais
de secret en dur — variables `POSTGRES_*` du Secret cluster `pg-role-pgvector`).

```typescript
import { Effect } from "effect";
import {
  dsn_from_env,
  pg_connect,
  read_migrations,
  migrate,
  pg_close,
} from "@univ-lehavre/atlas-citation";

await Effect.runPromise(
  Effect.gen(function* () {
    const sql = yield* pg_connect(yield* dsn_from_env());
    yield* migrate(sql, yield* read_migrations()); // idempotent
    yield* pg_close(sql);
  }),
);
```

Schéma (`migrations/`) : extension `vector` (nom SQL `vector`, pas
`pgvector`), table **`pairs`** (paires + `cross_citations`, source = mart servi) et table
**`researchers`** (`embedding vector(384)` + index HNSW cosinus, source = embeddings
`all-MiniLM-L6-v2` réutilisés). Métadonnées de partition `(dt, run)` pour le chargement et
la purge par partition (étapes 4.2–4.4). L'extension et la dimension 384 sont vérifiées en
hermétique contre un PostgreSQL+pgvector épinglé par digest ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).

### Recherche plein-texte lexicale (FTS, étape 4.2)

`researchers` porte aussi une colonne **`fts tsvector`** (index GIN, migration `0002`)
pour la recherche **par mots-clés**, en complément du vecteur sémantique. Le document
lexical d'un chercheur est construit à partir de ses **labels de topics/mots-clés**
(`researcher-profiles`, même source et même clé `researcherId` que les vecteurs) —
`load_researcher_fts(sql, dt, run, documents)` peuple la colonne (`to_tsvector`, upsert
par partition sans écraser l'embedding), `search_researchers_fts(sql, dt, run, query)`
interroge (`fts @@ to_tsquery`, classé par `ts_rank`).

> **Périmètre assumé** : recherche **par chercheur** (topics/mots-clés), **pas par titre
> d'œuvre** — le mart servi ne porte pas de titre (la recherche par titre est différée).
> Comme le chargement des vecteurs (4.3), cette source vient de `researcher-profiles` et
> **n'est pas couverte par un `manifest.json` servi** : l'invariant « valider le contrat
> avant chargement » (3.6) ne s'applique pas à ce chemin.

### Recherche sémantique kNN (vecteurs, étape 4.3)

`load_researcher_vectors(sql, dt, run, vectors)` peuple `researchers.embedding`
(`vector(384)`) à partir des embeddings `all-MiniLM-L6-v2` **déjà produits** par
`researcher-profiles` (`{ researcherId, vector: Float32Array }`) — **aucun nouveau
modèle, aucun GPU**, un vecteur par chercheur. Le `Float32Array` est sérialisé au format
texte pgvector (`[f1,f2,…]`) ; l'upsert par partition **n'écrase pas le `fts`** posé par
4.2 (symétrique du loader FTS). Une dimension ≠ 384 est rejetée tôt (avant l'upsert).
`search_researchers_knn(sql, dt, run, query, limit)` interroge l'index HNSW
(distance cosinus `<=>`), du plus proche au plus lointain.

## Internals

### `src/fetch/`

| Export                                         | Description                                         |
| ---------------------------------------------- | --------------------------------------------------- |
| `searchAuthors(name)`                          | Searches OpenAlex authors by display name           |
| `retrieve_articles(authorIds, institutionIds)` | Fetches articles for given authors and institutions |
| `retrieve_articles_given_work_ids(workIds)`    | Fetches articles by OpenAlex work IDs               |

### `src/group/`

Utilitaires internes de similarité pour regrouper des chaînes d'affiliation:

| Export                                           | Description                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `groupBySimilarity(strings, threshold)`          | Groups strings by Levenshtein similarity                     |
| `groupBySimilarityWithScore(strings, threshold)` | Same, with per-group similarity score                        |
| `groupByNGramSimilarity(strings, threshold)`     | Groups strings by n-gram (bigram/trigram) Jaccard similarity |
| `normalizeString(input, options)`                | Normalizes a string (diacritics, punctuation, case)          |
