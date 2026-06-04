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
   */
  getInFlight(): Promise<number> | null;
  /** Enregistre la promesse en vol (ou la libère avec `null` une fois finie). */
  setInFlight(promise: Promise<number> | null): void;
  /** Horodatage (ms) de la dernière actualisation aboutie. */
  getLastRefreshAt(): number;
  /** Mémorise l'horodatage de la dernière actualisation aboutie. */
  setLastRefreshAt(at: number): void;
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
    getLastRefreshAt: () => lastRefreshAt,
    setLastRefreshAt: (at) => {
      lastRefreshAt = at;
    },
  };
};

/**
 * Coordinateur partagé par défaut du processus.
 *
 * Point d'injection : pour un déploiement multi-instance, remplacer cette
 * valeur par une implémentation adossée à un backing-service partagé (cf. la
 * note de module et l'ADR 0040). L'endpoint `/api/refresh` n'a alors aucune
 * ligne à changer.
 */
export const defaultRefreshCoordinator: RefreshCoordinator = createInMemoryRefreshCoordinator();
