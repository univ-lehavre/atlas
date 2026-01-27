# Guide d'Implémentation - Survey Microservice

**Date:** 20 décembre 2025  
**Version:** 1.0  
**Lié à:** [Audit Microservices](./MICROSERVICES_AUDIT.md) | [Diagrammes](./ARCHITECTURE_DIAGRAMS.md)

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du service](#architecture-du-service)
3. [Configuration et Secrets](#configuration-et-secrets)
4. [Authentification inter-services](#authentification-inter-services)
5. [Exemples de code](#exemples-de-code)
6. [Tests](#tests)
7. [Déploiement](#déploiement)
8. [Monitoring](#monitoring)
9. [Checklist d'implémentation](#checklist-dimplémentation)

---

## Vue d'ensemble

### Objectif

Extraire la logique de gestion des enquêtes (Surveys) de l'application AMARRE monolithique vers un microservice indépendant.

### Périmètre fonctionnel

Le service Survey gère :

- Création de nouvelles demandes d'enquête
- Liste des demandes par utilisateur
- Génération de liens d'enquête REDCap
- Téléchargement des données d'enquête
- Validation des règles métier (limite de demandes incomplètes)

### Stack technique recommandée

```yaml
Runtime: Node.js 20+ LTS
Framework: Fastify (performance) ou Express (simplicité)
Validation: Zod (réutiliser schémas existants)
HTTP Client: node-fetch ou axios
Testing: Vitest + Supertest
Logging: Pino (structured logging)
Documentation: OpenAPI 3.1 + Swagger UI
```

---

## Architecture du service

### Structure du projet

```
survey-service/
├── src/
│   ├── index.ts                 # Entry point
│   ├── app.ts                   # Application setup
│   ├── config/
│   │   └── index.ts             # Configuration management
│   ├── routes/
│   │   └── surveys.ts           # API routes
│   ├── services/
│   │   └── surveyService.ts     # Business logic
│   ├── clients/
│   │   └── redcapClient.ts      # REDCap API client
│   ├── middleware/
│   │   ├── auth.ts              # Authentication
│   │   └── errorHandler.ts     # Error handling
│   ├── validators/
│   │   └── schemas.ts           # Zod schemas
│   └── types/
│       └── index.ts             # TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Configuration et Secrets

### Variables d'environnement

```bash
# .env.example

# Server configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Authentication
API_KEY=your_secure_api_key_here
# OU
JWT_SECRET=your_jwt_secret_here
JWT_ISSUER=amarre-gateway
JWT_AUDIENCE=survey-service

# REDCap configuration
REDCAP_API_URL=https://redcap.example.com/api/
REDCAP_API_TOKEN=your_redcap_token_here

# Logging
LOG_LEVEL=info
LOG_PRETTY=true

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Configuration TypeScript

```typescript
// src/config/index.ts
import { z } from 'zod';

const configSchema = z.object({
  node_env: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().default(3001),
  host: z.string().default('0.0.0.0'),

  cors: z.object({ origins: z.string().transform((s) => s.split(',')) }),

  auth: z.object({
    apiKey: z.string().optional(),
    jwt: z
      .object({
        secret: z.string().optional(),
        issuer: z.string().optional(),
        audience: z.string().optional(),
      })
      .optional(),
  }),

  redcap: z.object({ apiUrl: z.string().url(), apiToken: z.string().min(32) }),

  logging: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    pretty: z.coerce.boolean().default(false),
  }),

  metrics: z.object({
    enabled: z.coerce.boolean().default(true),
    port: z.coerce.number().default(9090),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const raw = {
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    host: process.env.HOST,
    cors: { origins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000' },
    auth: {
      apiKey: process.env.API_KEY,
      jwt: {
        secret: process.env.JWT_SECRET,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      },
    },
    redcap: { apiUrl: process.env.REDCAP_API_URL, apiToken: process.env.REDCAP_API_TOKEN },
    logging: { level: process.env.LOG_LEVEL, pretty: process.env.LOG_PRETTY },
    metrics: { enabled: process.env.ENABLE_METRICS, port: process.env.METRICS_PORT },
  };

  return configSchema.parse(raw);
}
```

---

## Authentification inter-services

### Option 1 : API Key (Simple, recommandée pour démarrer)

```typescript
// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';

export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'];

  if (!apiKey) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing API key' });
  }

  if (apiKey !== config.auth.apiKey) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Invalid API key' });
  }

  // API key is valid, continue
}
```

### Option 2 : JWT Token (Pour multi-tenancy)

```typescript
// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface JWTPayload {
  userId: string;
  roles?: string[];
  iss: string;
  aud: string;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function jwtAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply
      .status(401)
      .send({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.auth.jwt!.secret!, {
      issuer: config.auth.jwt!.issuer,
      audience: config.auth.jwt!.audience,
    }) as JWTPayload;

    request.user = decoded;
  } catch (error) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Invalid or expired token' });
  }
}
```

---

## Exemples de code

### 1. Client REDCap

```typescript
// src/clients/redcapClient.ts
import { config } from '../config';

interface RedcapRequestOptions {
  content?: string;
  action?: string;
  format?: string;
  type?: string;
  filterLogic?: string;
  fields?: string;
  instrument?: string;
  record?: string;
  data?: string;
  returnContent?: string;
  [key: string]: string | undefined;
}

const DEFAULT_OPTIONS: RedcapRequestOptions = {
  content: 'record',
  action: 'export',
  format: 'json',
  type: 'eav',
  csvDelimiter: '',
  records: '',
  fields: '',
  forms: '',
  rawOrLabel: 'raw',
  rawOrLabelHeaders: 'raw',
  exportCheckboxLabel: 'false',
  exportSurveyFields: 'false',
  exportDataAccessGroups: 'false',
  returnFormat: 'json',
  filterLogic: '',
};

export class RedcapClient {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor() {
    this.apiUrl = config.redcap.apiUrl;
    this.apiToken = config.redcap.apiToken;
  }

  private async request(params: RedcapRequestOptions): Promise<Response> {
    const requestData = { ...DEFAULT_OPTIONS, ...params, token: this.apiToken };

    const body = new URLSearchParams(
      Object.entries(requestData).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString();

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });

    if (!response.ok) {
      throw new Error(`REDCap API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async requestJSON<T>(params: RedcapRequestOptions): Promise<T> {
    const response = await this.request(params);
    return response.json() as Promise<T>;
  }

  async requestText(params: RedcapRequestOptions): Promise<string> {
    const response = await this.request(params);
    return response.text();
  }

  async getSurveyLink(record: string, instrument: string): Promise<string> {
    return this.requestText({ content: 'surveyLink', instrument, record });
  }

  async exportRecords<T>(filterLogic: string, fields?: string[]): Promise<T> {
    return this.requestJSON<T>({ type: 'flat', filterLogic, fields: fields?.join(',') });
  }

  async importRecords<T>(data: unknown): Promise<T> {
    return this.requestJSON<T>({
      action: 'import',
      type: 'flat',
      overwriteBehavior: 'normal',
      forceAutoNumber: 'false',
      data: JSON.stringify(data),
      returnContent: 'count',
    });
  }
}
```

### 2. Service métier

```typescript
// src/services/surveyService.ts
import { RedcapClient } from '../clients/redcapClient';
import { nanoid } from 'nanoid';

export interface SurveyRequest {
  record_id: string;
  created_at: string;
  userid: string;
  email: string;
  form_complete?: string;
  demandeur_composante_complete?: string;
  labo_complete?: string;
  encadrant_complete?: string;
  validation_finale_complete?: string;
}

export interface CreateSurveyRequestInput {
  userId: string;
  email: string;
}

export class SurveyService {
  private readonly redcapClient: RedcapClient;

  constructor(redcapClient: RedcapClient) {
    this.redcapClient = redcapClient;
  }

  async createRequest(input: CreateSurveyRequestInput): Promise<{ count: number }> {
    const payload = [
      {
        record_id: nanoid(),
        created_at: new Date().toISOString(),
        userid: input.userId,
        email: input.email,
        contact_complete: 1,
      },
    ];

    const result = await this.redcapClient.importRecords<{ count: number }>(payload);
    return result;
  }

  async listRequests(userId: string): Promise<SurveyRequest[]> {
    const filterLogic = `[userid] = "${userId}"`;
    const fields = [
      'record_id',
      'created_at',
      'form_complete',
      'demandeur_composante_complete',
      'labo_complete',
      'encadrant_complete',
      'validation_finale_complete',
    ];

    const requests = await this.redcapClient.exportRecords<SurveyRequest[]>(filterLogic, fields);

    return requests;
  }

  async getSurveyLink(recordId: string, instrument: string): Promise<string> {
    return this.redcapClient.getSurveyLink(recordId, instrument);
  }

  async downloadData(userId: string): Promise<unknown> {
    const filterLogic = `[userid] = "${userId}"`;
    return this.redcapClient.exportRecords<unknown>(filterLogic);
  }

  async canCreateNewRequest(userId: string): Promise<boolean> {
    const requests = await this.listRequests(userId);

    // Business rule: pas de demandes incomplètes
    const hasIncomplete = requests.some(
      (r) =>
        r.form_complete !== '2' ||
        r.demandeur_composante_complete !== '2' ||
        r.labo_complete !== '2' ||
        r.encadrant_complete !== '2' ||
        r.validation_finale_complete !== '2'
    );

    return !hasIncomplete;
  }
}
```

### 3. Routes API (Fastify)

```typescript
// src/routes/surveys.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SurveyService } from '../services/surveyService';

const createRequestSchema = z.object({ userId: z.string().min(1), email: z.string().email() });

const listRequestsQuerySchema = z.object({ userId: z.string().min(1) });

const surveyLinkQuerySchema = z.object({
  record: z.string().min(1),
  instrument: z.string().min(1),
});

export async function surveyRoutes(
  fastify: FastifyInstance,
  surveyService: SurveyService
): Promise<void> {
  // POST /api/v1/surveys/requests
  fastify.post('/api/v1/surveys/requests', async (request, reply) => {
    try {
      const body = createRequestSchema.parse(request.body);

      // Check if user can create new request
      const canCreate = await surveyService.canCreateNewRequest(body.userId);
      if (!canCreate) {
        return reply.status(409).send({
          data: null,
          error: { code: 'conflict', message: 'There are incomplete survey requests' },
        });
      }

      const result = await surveyService.createRequest(body);

      return reply.status(200).send({ data: { newRequestCreated: result.count }, error: null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          data: null,
          error: {
            code: 'validation_error',
            message: 'Invalid request data',
            details: error.format(),
          },
        });
      }
      throw error;
    }
  });

  // GET /api/v1/surveys/requests
  fastify.get('/api/v1/surveys/requests', async (request, reply) => {
    try {
      const query = listRequestsQuerySchema.parse(request.query);
      const requests = await surveyService.listRequests(query.userId);

      return reply.status(200).send({ data: requests, error: null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          data: null,
          error: {
            code: 'validation_error',
            message: 'Invalid query parameters',
            details: error.format(),
          },
        });
      }
      throw error;
    }
  });

  // GET /api/v1/surveys/links
  fastify.get('/api/v1/surveys/links', async (request, reply) => {
    try {
      const query = surveyLinkQuerySchema.parse(request.query);
      const url = await surveyService.getSurveyLink(query.record, query.instrument);

      return reply.status(200).send({ data: { url }, error: null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          data: null,
          error: {
            code: 'validation_error',
            message: 'Invalid query parameters',
            details: error.format(),
          },
        });
      }
      throw error;
    }
  });

  // GET /api/v1/surveys/data
  fastify.get('/api/v1/surveys/data', async (request, reply) => {
    try {
      const query = listRequestsQuerySchema.parse(request.query);
      const data = await surveyService.downloadData(query.userId);

      return reply.status(200).send({ data, error: null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          data: null,
          error: {
            code: 'validation_error',
            message: 'Invalid query parameters',
            details: error.format(),
          },
        });
      }
      throw error;
    }
  });
}
```

### 4. Application setup (Fastify)

```typescript
// src/app.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config';
import { RedcapClient } from './clients/redcapClient';
import { SurveyService } from './services/surveyService';
import { surveyRoutes } from './routes/surveys';
import { apiKeyAuth } from './middleware/auth';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      transport: config.logging.pretty
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Security middleware
  await fastify.register(helmet);
  await fastify.register(cors, { origin: config.cors.origins, credentials: true });

  // Authentication middleware
  fastify.addHook('onRequest', apiKeyAuth);

  // Health check (no auth required)
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Dependencies
  const redcapClient = new RedcapClient();
  const surveyService = new SurveyService(redcapClient);

  // Register routes
  await surveyRoutes(fastify, surveyService);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    reply.status(error.statusCode || 500).send({
      data: null,
      error: {
        code: error.code || 'internal_error',
        message: error.message || 'An unexpected error occurred',
      },
    });
  });

  return fastify;
}
```

### 5. Entry point

```typescript
// src/index.ts
import { buildApp } from './app';
import { loadConfig } from './config';

async function main() {
  try {
    const config = loadConfig();
    const app = await buildApp();

    await app.listen({ port: config.port, host: config.host });

    app.log.info(`Survey service listening on ${config.host}:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
```

---

## Tests

### Tests unitaires

```typescript
// tests/unit/surveyService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SurveyService } from '../../src/services/surveyService';
import { RedcapClient } from '../../src/clients/redcapClient';

describe('SurveyService', () => {
  let mockRedcapClient: RedcapClient;
  let surveyService: SurveyService;

  beforeEach(() => {
    mockRedcapClient = {
      importRecords: vi.fn(),
      exportRecords: vi.fn(),
      getSurveyLink: vi.fn(),
    } as unknown as RedcapClient;

    surveyService = new SurveyService(mockRedcapClient);
  });

  describe('createRequest', () => {
    it('should create a new survey request', async () => {
      vi.mocked(mockRedcapClient.importRecords).mockResolvedValue({ count: 1 });

      const result = await surveyService.createRequest({
        userId: 'user123',
        email: 'test@example.com',
      });

      expect(result).toEqual({ count: 1 });
      expect(mockRedcapClient.importRecords).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userid: 'user123', email: 'test@example.com' }),
        ])
      );
    });
  });

  describe('canCreateNewRequest', () => {
    it('should return true when no incomplete requests', async () => {
      vi.mocked(mockRedcapClient.exportRecords).mockResolvedValue([
        {
          record_id: '1',
          form_complete: '2',
          demandeur_composante_complete: '2',
          labo_complete: '2',
          encadrant_complete: '2',
          validation_finale_complete: '2',
        },
      ]);

      const result = await surveyService.canCreateNewRequest('user123');
      expect(result).toBe(true);
    });

    it('should return false when incomplete requests exist', async () => {
      vi.mocked(mockRedcapClient.exportRecords).mockResolvedValue([
        {
          record_id: '1',
          form_complete: '1', // Incomplete
          demandeur_composante_complete: '2',
          labo_complete: '2',
          encadrant_complete: '2',
          validation_finale_complete: '2',
        },
      ]);

      const result = await surveyService.canCreateNewRequest('user123');
      expect(result).toBe(false);
    });
  });
});
```

### Tests d'intégration

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Survey API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/surveys/requests', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/surveys/requests',
        payload: { userId: 'user123', email: 'test@example.com' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create a new request with valid auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/surveys/requests',
        headers: { 'x-api-key': process.env.API_KEY || 'test-key' },
        payload: { userId: 'user123', email: 'test@example.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('newRequestCreated');
      expect(body.error).toBeNull();
    });
  });
});
```

---

## Déploiement

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy dependencies and build from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
```

### Docker Compose (Dev/Staging)

```yaml
# docker-compose.yml
version: '3.9'

services:
  survey-service:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - PORT=3001
      - ALLOWED_ORIGINS=http://localhost:3000
      - API_KEY=${API_KEY}
      - REDCAP_API_URL=${REDCAP_API_URL}
      - REDCAP_API_TOKEN=${REDCAP_API_TOKEN}
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: survey-service
  namespace: amarre-surveys
  labels:
    app: survey-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: survey-service
  template:
    metadata:
      labels:
        app: survey-service
    spec:
      containers:
        - name: survey-service
          image: your-registry/survey-service:latest
          ports:
            - containerPort: 3001
              name: http
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3001'
            - name: ALLOWED_ORIGINS
              valueFrom:
                configMapKeyRef:
                  name: survey-config
                  key: allowed-origins
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: survey-secrets
                  key: api-key
            - name: REDCAP_API_URL
              valueFrom:
                configMapKeyRef:
                  name: survey-config
                  key: redcap-api-url
            - name: REDCAP_API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: survey-secrets
                  key: redcap-api-token
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: survey-service
  namespace: amarre-surveys
spec:
  selector:
    app: survey-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
  type: ClusterIP
```

---

## Monitoring

### Métriques Prometheus

```typescript
// src/metrics.ts
import { register, Counter, Histogram } from 'prom-client';

export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const redcapRequestCounter = new Counter({
  name: 'redcap_requests_total',
  help: 'Total number of REDCap API requests',
  labelNames: ['operation', 'status'],
});

export const redcapRequestDuration = new Histogram({
  name: 'redcap_request_duration_seconds',
  help: 'Duration of REDCap API requests in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Endpoint metrics
export async function metricsHandler() {
  return register.metrics();
}
```

### Dashboard Grafana

```json
{
  "dashboard": {
    "title": "Survey Service Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{ "expr": "rate(http_requests_total{job=\"survey-service\"}[5m])" }]
      },
      {
        "title": "Request Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"survey-service\"}[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          { "expr": "rate(http_requests_total{job=\"survey-service\",status=~\"5..\"}[5m])" }
        ]
      }
    ]
  }
}
```

---

## Checklist d'implémentation

### Phase Préparation

- [ ] Créer repository `survey-service`
- [ ] Initialiser projet Node.js + TypeScript
- [ ] Configurer Fastify + dépendances
- [ ] Définir structure de projet
- [ ] Configurer linting et formatting
- [ ] Configurer CI/CD (GitHub Actions)

### Phase Développement

- [ ] Implémenter configuration (env vars)
- [ ] Implémenter REDCap client
- [ ] Migrer logique métier (SurveyService)
- [ ] Implémenter routes API
- [ ] Implémenter middleware auth (API Key)
- [ ] Implémenter error handling
- [ ] Implémenter logging (Pino)
- [ ] Documenter API (OpenAPI spec)

### Phase Tests

- [ ] Tests unitaires (couverture ≥ 80%)
  - [ ] RedcapClient
  - [ ] SurveyService
  - [ ] Validators
- [ ] Tests d'intégration
  - [ ] API endpoints
  - [ ] Error handling
  - [ ] Authentication
- [ ] Tests E2E
  - [ ] Scénarios complets
  - [ ] Mock REDCap si nécessaire

### Phase Infrastructure

- [ ] Créer Dockerfile
- [ ] Créer docker-compose.yml
- [ ] Tester build et run local
- [ ] Créer manifests Kubernetes
- [ ] Configurer secrets management
- [ ] Setup monitoring (Prometheus + Grafana)

### Phase Intégration

- [ ] Modifier app SvelteKit
  - [ ] Implémenter proxy vers survey-service
  - [ ] Ajouter authentification inter-services
  - [ ] Gérer timeout et retry
  - [ ] Error handling
- [ ] Tests end-to-end complets
- [ ] Load testing
- [ ] Documentation exploitation

### Phase Déploiement

- [ ] Déploiement staging
- [ ] Tests fonctionnels staging
- [ ] Validation stakeholders
- [ ] Déploiement production (canary)
- [ ] Monitoring actif 24/7 première semaine
- [ ] Rollback plan prêt

### Phase Post-Déploiement

- [ ] Rétrospective équipe
- [ ] Documentation mise à jour
- [ ] Validation métriques de succès
- [ ] Formation équipe ops
- [ ] Amélioration continue

---

## Ressources

### Liens utiles

- [Fastify Documentation](https://www.fastify.io/)
- [Zod Documentation](https://zod.dev/)
- [Pino Logging](https://getpino.io/)
- [Prometheus Node.js Client](https://github.com/siimon/prom-client)

### Contacts

- Équipe développement : dev@example.com
- Équipe infrastructure : ops@example.com

---

_Document généré le 20 décembre 2025_  
_Dernière mise à jour : 20 décembre 2025_
