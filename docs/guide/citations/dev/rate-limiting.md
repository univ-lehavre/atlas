# Rate Limiting

La gestion des quotas est critique pour les APIs bibliographiques. Chaque package implémente une gestion uniforme du rate limiting.

## Limites par source

| Source | Limite | Headers |
|--------|--------|---------|
| OpenAlex | 100k/jour (avec API key) | `X-Rate-Limit-*` |
| Crossref | 50 req/s (polite pool avec email) | `X-Rate-Limit-Limit`, `X-Rate-Limit-Interval` |
| HAL | Non documenté | - |
| ArXiv | ~1 req/3s recommandé | - |
| ORCID | Variable selon tier | `X-RateLimit-*` |

## Erreurs typées

```typescript
import { Data } from 'effect';

// Erreur de rate limit (retryable)
export class RateLimitError extends Data.TaggedError('RateLimitError')<{
  readonly source: string;
  readonly retryAfter?: number;      // Secondes avant retry
  readonly remaining?: number;        // Requêtes restantes
  readonly limit?: number;            // Limite totale
  readonly resetAt?: Date;            // Reset du quota
}> {}

// Quota journalier épuisé (non retryable)
export class QuotaExhaustedError extends Data.TaggedError('QuotaExhaustedError')<{
  readonly source: string;
  readonly dailyLimit: number;
  readonly resetAt: Date;
}> {}
```

## Interface commune

Tous les clients implémentent `RateLimitedClient` :

```typescript
interface RateLimitStatus {
  source: string;
  remaining: number;
  limit: number;
  resetAt: Date;
  usedToday: number;
}

interface RateLimitedClient {
  // Obtenir le statut actuel des quotas
  getRateLimitStatus: () => Effect<RateLimitStatus, never>;

  // Attendre que du quota soit disponible
  waitForQuota: () => Effect<void, QuotaExhaustedError>;
}
```

## Stratégie de retry

Le retry est automatique avec backoff exponentiel et jitter :

```typescript
import { Schedule, pipe } from 'effect';

const rateLimitRetrySchedule = pipe(
  Schedule.exponential('1 second'),
  Schedule.jittered,
  Schedule.whileInput<RateLimitError>((e) => e.retryAfter !== undefined),
  Schedule.compose(Schedule.recurs(5))
);
```

## Utilisation

### Vérifier les quotas

```typescript
import { createOpenAlexClient } from '@univ-lehavre/atlas-openalex';

const client = createOpenAlexClient({ apiKey: '...' });

// Obtenir le statut
const status = yield* client.getRateLimitStatus();
console.log(`Remaining: ${status.remaining}/${status.limit}`);
console.log(`Reset at: ${status.resetAt}`);
```

### Gérer les erreurs de quota

```typescript
import { Effect, Match } from 'effect';

const program = pipe(
  client.listWorks({ perPage: 100 }),
  Effect.catchTag('RateLimitError', (error) =>
    Effect.gen(function* () {
      console.log(`Rate limited, waiting ${error.retryAfter}s...`);
      yield* Effect.sleep(`${error.retryAfter} seconds`);
      return yield* client.listWorks({ perPage: 100 });
    })
  ),
  Effect.catchTag('QuotaExhaustedError', (error) =>
    Effect.fail(new Error(`Daily quota exhausted. Resets at ${error.resetAt}`))
  )
);
```

### Attendre du quota

```typescript
// Attendre que du quota soit disponible
yield* client.waitForQuota();

// Puis exécuter la requête
const works = yield* client.listWorks();
```

## Crossref: Polite Pool

Crossref offre un meilleur rate limit si vous incluez un email dans vos requêtes :

```typescript
const client = createCrossrefClient({
  mailto: 'your-email@example.com',  // Active le "polite pool"
});
```

Avec le polite pool :
- Limite augmentée
- Priorité dans la file d'attente
- Notifications en cas de problème

## OpenAlex: API Key

OpenAlex offre 100k requêtes/jour avec une API key gratuite :

```typescript
const client = createOpenAlexClient({
  apiKey: process.env.OPENALEX_API_KEY,
});
```

Sans API key, la limite est basée sur l'IP et plus restrictive.

## Monitoring dans atlas-citations

L'agrégateur permet de monitorer tous les quotas :

```typescript
import { createCitationsClient } from '@univ-lehavre/atlas-citations';

const client = createCitationsClient();

// Obtenir les quotas de toutes les sources
const limits = yield* client.getRateLimits();
// {
//   openalex: { remaining: 99500, limit: 100000, resetAt: ... },
//   crossref: { remaining: 45, limit: 50, resetAt: ... },
//   hal: { remaining: null, limit: null, resetAt: null },
//   ...
// }

// Vérifier la santé des sources
const health = yield* client.getSourceHealth();
// {
//   openalex: { status: 'healthy', latency: 120 },
//   crossref: { status: 'degraded', latency: 850 },
//   arxiv: { status: 'healthy', latency: 200 },
//   ...
// }
```
