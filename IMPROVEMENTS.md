# Plan d'Amélioration - Actions Concrètes

Ce document liste les actions concrètes issues de la revue de code, avec un ordre de priorité et des estimations d'effort.

## 🔴 Priorité Haute (Sprint Actuel)

### 1. Extraire les Schémas Dupliqués

**Status**: ✅ **FAIT** (commit 5ce6db0)

**Fichier**: `apps/redcap-service/src/schemas.ts`

```typescript
import { Schema as S } from 'effect';

export const ErrorResponseSchema = S.Struct({
  data: S.Null,
  error: S.Struct({
    code: S.String,
    message: S.String,
  }),
}).annotations({ identifier: 'ErrorResponse', description: 'Error API response' });

export const SuccessResponseOpenAPI = {
  type: 'object' as const,
  required: ['data'] as string[],
  properties: {
    data: { description: 'Response data - structure varies by endpoint' },
  },
  additionalProperties: false,
};

// Patterns de validation REDCap
export const REDCAP_NAME_PATTERN = /^[\w,]*$/;
export const INSTRUMENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
export const RECORD_ID_PATTERN = /^[a-zA-Z0-9]{20,}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
```

**Fichiers à modifier**:

- `apps/redcap-service/src/routes/project.ts`
- `apps/redcap-service/src/routes/records.ts`
- `apps/redcap-service/src/routes/users.ts`

**Effort**: 30 min
**Impact**: 🟢 Réduction de ~150 lignes de code dupliqué

---

### 2. Extraire le Validation Hook

**Status**: ✅ **FAIT** (commit 5ce6db0)

**Fichier**: `apps/redcap-service/src/middleware/validation.ts`

```typescript
import type { Context } from 'hono';

/**
 * Validation error hook that returns errors in the correct API format
 */
export const validationErrorHook = (
  result: { success: boolean; error?: readonly { message: string }[] },
  c: Context
): Response | undefined =>
  result.success
    ? undefined
    : c.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: result.error?.map((i) => i.message).join(', ') ?? 'Validation failed',
          },
        },
        400
      );
```

**Fichiers à modifier**:

- `apps/redcap-service/src/routes/records.ts`
- `apps/redcap-service/src/routes/users.ts`

**Effort**: 15 min
**Impact**: 🟢 Code plus DRY et maintenable

---

### 3. Ajouter .svelte-kit au .gitignore

**Status**: ✅ **FAIT**

---

## 🟡 Priorité Moyenne (Prochains Sprints)

### 4. Ajouter Timeouts aux Appels OPA

**Status**: ✅ **FAIT** (commit à venir)

**Fichier**: `apps/ecrin/src/lib/server/opa.ts`

```typescript
// Avant
const res = await fetch(`${OPA_URL}/v1/data/ecrin/authz/allow`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input }),
});

// Après
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const res = await fetch(`${OPA_URL}/v1/data/ecrin/authz/allow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  // ...
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('OPA request timeout');
  }
  return false; // Fail closed
}
```

**Effort**: 1h
**Impact**: 🟡 Évite les hangs en production

---

### 5. Tests Unitaires pour Routes HTTP

**Fichiers à créer**:

- `apps/redcap-service/src/routes/project.test.ts`
- `apps/redcap-service/src/routes/records.test.ts`
- `apps/redcap-service/src/routes/users.test.ts`

**Exemple de test**:

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { project } from './project';

describe('Project Routes', () => {
  const app = new Hono();
  app.route('/api/v1/project', project);

  it('should return 503 when REDCap is unavailable', async () => {
    const res = await app.request('/api/v1/project/version');
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: {
        code: 'network_error',
        message: 'Failed to connect to REDCap',
      },
    });
  });

  it('should validate OpenAPI schema for /version', async () => {
    // Test OpenAPI contract
  });
});
```

**Effort**: 4-6h
**Impact**: 🟢 Coverage 80%+, confiance dans le code

---

### 6. Rate Limiting

**Option 1: Middleware Hono**

```typescript
import { rateLimiter } from 'hono-rate-limiter';

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
});

app.use('*', limiter);
```

**Option 2: Cilium Network Policy** (recommandé en prod)

```yaml
apiVersion: cilium.io/v2
kind:CiliumClusterwideNetworkPolicy
metadata:
  name: rate-limit-redcap-service
spec:
  endpointSelector:
    matchLabels:
      app: redcap-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: ecrin
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/api/v1/.*"
                rateLimit:
                  requests: 100
                  per: "60s"
```

**Effort**: 2-3h
**Impact**: 🟡 Protection contre abus

---

### 7. Retry Logic REDCap

**Fichier**: `packages/redcap-api/src/client.ts`

```typescript
import { Effect, Schedule } from 'effect';

// Dans makeRequest()
const makeRequest = (
  config: RedcapConfig,
  params: Record<string, string>,
  fetchFn: typeof fetch
): Effect.Effect<Response, RedcapNetworkError> =>
  pipe(
    Effect.tryPromise({
      try: () =>
        fetchFn(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: new URLSearchParams(buildParams(config, params)).toString(),
        }),
      catch: (cause) => new RedcapNetworkError({ cause }),
    }),
    // Ajouter retry avec backoff exponentiel
    Effect.retry(
      Schedule.exponential('100 millis').pipe(
        Schedule.jittered,
        Schedule.compose(Schedule.recurs(3)) // Max 3 retries
      )
    )
  );
```

**Effort**: 2h
**Impact**: 🟢 Meilleure résilience

---

## 🔵 Priorité Basse (Roadmap)

### 8. OpenTelemetry Integration

**Packages à ajouter**:

```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

**Configuration**: `apps/redcap-service/src/telemetry.ts`

**Effort**: 1-2 jours
**Impact**: 🟡 Observabilité avancée

---

### 9. Performance Benchmarks

**Fichier**: `apps/redcap-service/benchmarks/api.bench.ts`

```typescript
import { bench, describe } from 'vitest';
import { app } from '../src/index';

describe('API Performance', () => {
  bench('GET /api/v1/project/version', async () => {
    await app.request('/api/v1/project/version');
  });

  bench('GET /api/v1/records', async () => {
    await app.request('/api/v1/records');
  });
});
```

**Effort**: 1 jour
**Impact**: 🔵 Baselines de performance

---

## 10. Améliorer Logs OPA

**Fichier**: `apps/ecrin/src/lib/server/opa.ts`

```typescript
// Avant
console.error(`OPA error: ${res.status} ${res.statusText}`);

// Après
import { logSecurityEvent } from './audit';

if (!res.ok) {
  // Log sécurisé sans détails sensibles
  logSecurityEvent('opa_error', {
    status: res.status,
    // Ne PAS inclure statusText ou body en production
  });
  return false;
}
```

**Effort**: 30 min
**Impact**: 🟡 Éviter information disclosure

---

## Checklist

- [x] 1. Extraire schémas dupliqués
- [x] 2. Extraire validation hook
- [x] 3. Ajouter .svelte-kit au .gitignore
- [x] 4. Timeouts OPA
- [ ] 5. Tests unitaires routes
- [ ] 6. Rate limiting
- [ ] 7. Retry logic REDCap
- [ ] 8. OpenTelemetry
- [ ] 9. Performance benchmarks
- [ ] 10. Améliorer logs OPA

---

## Estimation Totale

- **Sprint actuel** (Priorité Haute): ~1h
- **Prochains sprints** (Priorité Moyenne): ~10-12h
- **Roadmap** (Priorité Basse): ~3-4 jours

---

_Document généré par la revue de code du 2026-01-23_
