/**
 * Rate limiter à fenêtre fixe par clé (typiquement par IP), pour limiter
 * les requêtes HTTP entrantes sur les endpoints publics et renvoyer
 * 429 Too Many Requests quand la limite est dépassée.
 *
 * Limitations connues :
 * - In-memory : l'état est local au processus. Multi-instance (load
 *   balancer) → chaque instance compte séparément. Pour atlas en
 *   adapter-node single-instance c'est acceptable ; sinon migrer vers
 *   un store partagé (Redis, Upstash).
 * - Fenêtre fixe (pas glissante) : un client qui consomme la totalité
 *   de son quota en fin de fenêtre peut immédiatement consommer la
 *   suivante. Acceptable pour la protection anti-abus visée ici.
 */

export interface RateLimitConfig {
  /** Nombre maximum de requêtes autorisées par fenêtre */
  limit: number;
  /** Durée de la fenêtre en millisecondes */
  windowMs: number;
}

interface BucketState {
  count: number;
  resetAt: number;
}

export interface RateLimitOk {
  ok: true;
  remaining: number;
  resetAt: number;
}

export interface RateLimitDenied {
  ok: false;
  remaining: 0;
  resetAt: number;
}

export type RateLimitResult = RateLimitOk | RateLimitDenied;

export interface RateLimiter {
  /** Quota maximum par fenêtre, exposé pour `rateLimitHeaders`. */
  readonly limit: number;
  /** Durée de la fenêtre en millisecondes. */
  readonly windowMs: number;
  /**
   * Consomme un crédit pour la clé donnée et renvoie le verdict.
   * Si `ok` est false, l'appelant doit renvoyer 429 sans exécuter
   * le traitement.
   */
  check: (key: string) => RateLimitResult;
}

/**
 * Crée un rate limiter à fenêtre fixe.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
 *
 * export const GET: RequestHandler = ({ getClientAddress }) => {
 *   const result = limiter.check(getClientAddress());
 *   if (!result.ok) {
 *     return new Response('Too Many Requests', {
 *       status: 429,
 *       headers: rateLimitHeaders(result, 30),
 *     });
 *   }
 *   // ... handler
 * };
 * ```
 */
export const createRateLimiter = (config: RateLimitConfig): RateLimiter => {
  const buckets = new Map<string, BucketState>();

  // Nettoyage probabiliste des buckets expirés pour éviter une croissance
  // mémoire non bornée. À chaque check, on a ~1% de chance de scanner la
  // Map. Évite d'avoir à gérer un setInterval (fragile en SSR/scope).
  const cleanupExpired = (now: number): void => {
    for (const [key, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(key);
    }
  };

  return {
    limit: config.limit,
    windowMs: config.windowMs,
    check(key: string): RateLimitResult {
      const now = Date.now();

      if (Math.random() < 0.01) cleanupExpired(now);

      const bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        const resetAt = now + config.windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { ok: true, remaining: config.limit - 1, resetAt };
      }

      if (bucket.count >= config.limit) {
        return { ok: false, remaining: 0, resetAt: bucket.resetAt };
      }

      bucket.count++;
      return {
        ok: true,
        remaining: config.limit - bucket.count,
        resetAt: bucket.resetAt,
      };
    },
  };
};

/**
 * Construit les headers HTTP standards à renvoyer pour communiquer
 * l'état du rate limiter au client.
 *
 * - `X-RateLimit-Limit` : quota total par fenêtre.
 * - `X-RateLimit-Remaining` : nombre de requêtes restantes.
 * - `X-RateLimit-Reset` : instant Unix (secondes) de réinitialisation.
 * - `Retry-After` : ajouté uniquement si la requête a été refusée
 *   (résultat `ok: false`).
 */
export const rateLimitHeaders = (
  result: RateLimitResult,
  limit: number
): Record<string, string> => {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.ok) {
    headers['Retry-After'] = String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)));
  }
  return headers;
};
