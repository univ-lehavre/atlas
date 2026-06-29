/**
 * Coordination des actualisations de cache concurrentes.
 *
 * L'endpoint SSE `/api/refresh` doit (1) **dédupliquer** les actualisations qui
 * se chevauchent — si l'une est déjà en vol, les requêtes suivantes attendent
 * son résultat au lieu de relancer un fetch — et (2) **brider la cadence** :
 * pas plus d'une actualisation réelle par fenêtre `minIntervalMs`.
 *
 * Ces deux états (l'actualisation en vol, l'horodatage de la dernière) sont du
 * **state partagé entre requêtes**. Avec une implémentation en mémoire de
 * processus (le défaut ci-dessous), la coordination est correcte tant qu'il n'y
 * a **qu'une seule instance**. En déploiement multi-instance, chaque réplique
 * aurait son propre état : la déduplication et le bridage ne vaudraient que
 * *par instance*, pas globalement (N instances ⇒ jusqu'à N fetchs simultanés).
 *
 * D'où cette **indirection** : l'endpoint ne touche jamais directement à des
 * variables de module ; il passe par l'interface {@link RefreshCoordinator}.
 * Le défaut {@link inMemoryRefreshCoordinator} reproduit *exactement* le
 * comportement mono-instance historique. Un déploiement multi-instance réel
 * injectera une implémentation adossée à une ressource partagée (verrou +
 * clé d'horodatage dans un cache réseau), sans toucher à l'endpoint.
 *
 * Voir l'ADR 0040 (« caches de flux : backing-service partagé vs fichier ») —
 * ce module est le point d'extension côté application qu'elle décrit.
 *
 * @module
 */

import { createPgRefreshState } from '@univ-lehavre/atlas-cache';

/**
 * État de coordination partagé entre les requêtes d'actualisation.
 *
 * Volontairement minimal et sérialisable : une promesse en vol (locale au
 * processus, jamais partagée — voir note ci-dessous) et un horodatage
 * (un simple nombre, lui partageable via un cache réseau). Une implémentation
 * adossée à un backing-service mappe `lastRefreshAt` sur une clé partagée et
 * `inFlight` sur un verrou distribué + un canal de diffusion du résultat.
 */
export interface RefreshCoordinator {
  /** Fenêtre minimale entre deux actualisations réelles, en millisecondes. */
  readonly minIntervalMs: number;
  /**
   * L'actualisation actuellement en vol, ou `null`. Une requête concurrente
   * qui voit une promesse non nulle l'attend au lieu d'en relancer une.
   *
   * La promesse en vol reste **locale au processus** (on ne sérialise pas une
   * promesse) : la déduplication inter-instances repose, elle, sur l'horodatage
   * partagé `lastRefreshAt` + le bridage `minIntervalMs`, pas sur ce champ.
   */
  getInFlight(): Promise<number> | null;
  /** Enregistre la promesse en vol (ou la libère avec `null` une fois finie). */
  setInFlight(promise: Promise<number> | null): void;
  /**
   * Horodatage (ms) de la dernière actualisation aboutie. **Asynchrone** : une
   * implémentation partagée (Postgres) le lit depuis le backing-service ;
   * l'implémentation en mémoire résout immédiatement.
   */
  getLastRefreshAt(): Promise<number>;
  /** Mémorise l'horodatage de la dernière actualisation aboutie. */
  setLastRefreshAt(at: number): Promise<void>;
}

const DEFAULT_MIN_INTERVAL_MS = 60_000;

/**
 * Implémentation par défaut, en mémoire de processus.
 *
 * Comportement identique aux variables de module historiques : correct pour un
 * **déploiement mono-instance**. La promesse `inFlight` reste forcément locale
 * au processus (on ne sérialise pas une promesse) ; seul `lastRefreshAt` serait
 * porté par un backing-service dans une variante partagée — la déduplication
 * inter-instances, elle, repose sur le verrou distribué qu'une telle variante
 * introduirait.
 */
export const createInMemoryRefreshCoordinator = (
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS
): RefreshCoordinator => {
  let inFlight: Promise<number> | null = null;
  let lastRefreshAt = 0;
  return {
    minIntervalMs,
    getInFlight: () => inFlight,
    setInFlight: (promise) => {
      inFlight = promise;
    },
    getLastRefreshAt: () => Promise.resolve(lastRefreshAt),
    setLastRefreshAt: (at) => {
      lastRefreshAt = at;
      return Promise.resolve();
    },
  };
};

/**
 * Implémentation **Postgres** (multi-instance) : le bridage `lastRefreshAt` est
 * porté par le backing-service partagé (table `flux_cache`, ADR 0083), donc vu
 * par toutes les répliques. La promesse `inFlight` reste locale au processus
 * (non sérialisable) ; la déduplication inter-instances repose sur le bridage
 * global `lastRefreshAt` + `minIntervalMs`. Sélectionnée quand
 * `ATLAS_STATS_CACHE_PATH` est une DSN `postgres://…`.
 */
const createPgRefreshCoordinator = (
  dsn: string,
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS
): RefreshCoordinator => {
  const shared = createPgRefreshState(dsn, 'atlas-stats:lastRefreshAt');
  let inFlight: Promise<number> | null = null;
  return {
    minIntervalMs,
    getInFlight: () => inFlight,
    setInFlight: (promise) => {
      inFlight = promise;
    },
    getLastRefreshAt: () => shared.getLastRefreshAt(),
    setLastRefreshAt: (at) => shared.setLastRefreshAt(at),
  };
};

const POSTGRES_DSN = /^postgres(?:ql)?:\/\//;

/**
 * Coordinateur partagé par défaut du processus, **sélectionné explicitement par
 * l'environnement** (ADR 0083, jamais magique) : si `ATLAS_STATS_CACHE_PATH` est
 * une DSN `postgres://…`, le bridage `lastRefreshAt` est partagé via Postgres
 * (multi-instance) ; sinon, l'implémentation en mémoire mono-instance. L'endpoint
 * `/api/refresh` n'a aucune ligne à changer — il passe par l'interface.
 */
const selectDefaultCoordinator = (): RefreshCoordinator => {
  const resource = process.env.ATLAS_STATS_CACHE_PATH;
  return resource !== undefined && POSTGRES_DSN.test(resource)
    ? createPgRefreshCoordinator(resource)
    : createInMemoryRefreshCoordinator();
};

export const defaultRefreshCoordinator: RefreshCoordinator = selectDefaultCoordinator();
