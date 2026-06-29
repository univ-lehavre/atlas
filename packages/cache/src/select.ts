import type { Layer } from "effect";

import type { CacheError } from "./errors.js";
import { FileCacheLayer } from "./file.js";
import { PostgresCacheLayer } from "./postgres.js";
import type { CacheStore } from "./store.js";

const POSTGRES_DSN = /^postgres(ql)?:\/\//;

/**
 * Sélection **explicite** du back-end (ADR 0040/0083 : jamais de détection
 * magique). Si `resource` est une DSN `postgres://…`, on arme le back-end
 * Postgres ; sinon, `resource` est un répertoire de cache fichier (comportement
 * local mono-instance inchangé). Un appelant qui ne configure rien passe un
 * répertoire et reste sur fichier — jamais silencieusement sur un cache partagé.
 */
export const selectCacheLayer = (
  resource: string,
): Layer.Layer<CacheStore, CacheError> =>
  POSTGRES_DSN.test(resource)
    ? PostgresCacheLayer(resource)
    : FileCacheLayer(resource);
