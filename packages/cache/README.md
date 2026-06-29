# @univ-lehavre/atlas-cache

Cache de flux partagé : une interface unique, deux back-ends sélectionnés à
l'exécution. Acté par [ADR 0083](../../docs/src/content/docs/decisions/0083-cache-flux-postgres-package-partage.md)
(exécution de [ADR 0040](../../docs/src/content/docs/decisions/0040-caches-flux-backing-service-vs-fichier.md)).

## Interface

Un service Effect `CacheStore` (`Context.Tag`) clé-valeur :

```ts
import {
  CacheStore,
  selectCacheLayer,
  isStale,
} from "@univ-lehavre/atlas-cache";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const store = yield* CacheStore;
  yield* store.set("atlas-stats", { releases: [] });
  const entry = yield* store.get<{ releases: unknown[] }>("atlas-stats");
  if (entry && !isStale(entry, Date.now())) return entry.data;
  return null;
});

// Sélection explicite du back-end (jamais magique) :
//  - une DSN `postgres://…` → back-end Postgres (CNPG du cluster, ADR 0093) ;
//  - sinon → répertoire de cache fichier (local mono-instance).
Effect.runPromise(
  program.pipe(Effect.scoped, Effect.provide(selectCacheLayer(resource))),
);
```

Le store horodate chaque entrée (`savedAt`) — **source unique** du TTL, jugé via
`isStale`. Le payload est opaque (JSON) ; chaque consommateur range le sien sous
une clé stable.

## Back-ends

- **Fichier** (`FileCacheLayer(dir)`) : un fichier `<dir>/<key>.json` par clé,
  écriture atomique (tmp + `rename`). Fallback local mono-instance uniquement.
- **Postgres** (`PostgresCacheLayer(dsn)`) : table `flux_cache(key, value JSONB,
saved_at)`, UPSERT atomique `ON CONFLICT`, DDL idempotente sous
  `pg_advisory_xact_lock`. DSN composée des `POSTGRES_CACHE_*` via `dsnFromEnv`
  (nom court `pg-rw.postgres`, jamais le FQDN).

## Tests

`pnpm test` couvre le back-end fichier et le sélecteur sans dépendance externe.
Le back-end Postgres a un **test d'intégration hermétique** (image PostgreSQL
épinglée par digest, _self-skip_ si Docker est absent — [ADR 0057](../../docs/src/content/docs/decisions/0057-reproductibilite-tests-hermetiques.md)).
