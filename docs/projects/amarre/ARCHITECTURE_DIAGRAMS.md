# Architecture Diagrams - AMARRE

::: warning Project Under Development
These diagrams describe the target architecture for AMARRE. The implementation is not yet complete.
:::

**Date:** December 20, 2025
**Version:** 1.0

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Proposed Architecture - Phase 1](#proposed-architecture---phase-1)
3. [Proposed Architecture - Phase 2](#proposed-architecture---phase-2)
4. [Data Flows](#data-flows)
5. [Deployment](#deployment)

---

## Current Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Client Browser                                       │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────┴────────────────────────────────────────┐
│                                                                         │
│                   AMARRE Application (SvelteKit)                        │
│                          Port 3000 / 5173                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         Frontend Layer                            │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐              │  │
│  │  │  +page      │  │  login      │  │  UI        │              │  │
│  │  │  .svelte    │  │  /+page     │  │  Components│              │  │
│  │  │             │  │  .svelte    │  │  (Svelte)  │              │  │
│  │  └─────────────┘  └─────────────┘  └────────────┘              │  │
│  │                                                                   │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
│  ┌───────────────────────────┴───────────────────────────────────────┐  │
│  │                         API Routes Layer                          │  │
│  │                         (/api/v1/*)                               │  │
│  │                                                                   │  │
│  │  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   /auth   │  │  /surveys  │  │    /me     │  │  /health   │ │  │
│  │  │           │  │            │  │            │  │            │ │  │
│  │  │ • login   │  │ • list     │  │ • profile  │  │ • online   │ │  │
│  │  │ • logout  │  │ • new      │  │            │  │            │ │  │
│  │  │ • signup  │  │ • links    │  │            │  │            │ │  │
│  │  │           │  │ • download │  │            │  │            │ │  │
│  │  └─────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘ │  │
│  │        │                │                │                │       │  │
│  └────────┼────────────────┼────────────────┼────────────────┼───────┘  │
│           │                │                │                │          │
│  ┌────────┼────────────────┼────────────────┼────────────────┼───────┐  │
│  │        │                │                │                │       │  │
│  │        ↓                ↓                ↓                ↓       │  │
│  │  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   auth    │  │  surveys   │  │  profile   │  │    net     │ │  │
│  │  │  service  │  │  service   │  │  service   │  │  service   │ │  │
│  │  │  (53 L)   │  │  (62 L)    │  │  (6 L)     │  │  (207 L)   │ │  │
│  │  └─────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘ │  │
│  │        │                │                │                │       │  │
│  │        ↓                ↓                ↓                ↓       │  │
│  │  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │ Appwrite  │  │   REDCap   │  │ Appwrite   │  │ TCP/TLS    │ │  │
│  │  │  Client   │  │   Client   │  │   Client   │  │   Checks   │ │  │
│  │  │  (58 L)   │  │   (42 L)   │  │  (19 L)    │  │            │ │  │
│  │  └─────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘ │  │
│  │        │                │                │                │       │  │
│  └────────┼────────────────┼────────────────┼────────────────┼───────┘  │
│           │                │                │                │          │
│  ┌────────┴────────────────┴────────────────┴────────────────┴───────┐  │
│  │                    hooks.server.ts                                │  │
│  │                 (Session Management)                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────┬───────────────────┬────────────────────┬───────────┘
                     │                   │                    │
                     │ HTTPS             │ HTTPS              │ TCP/TLS
                     │                   │                    │
          ┌──────────┴────────┐  ┌───────┴────────┐  ┌────────┴──────────┐
          │                   │  │                │  │                   │
          │  Appwrite Cloud   │  │  REDCap API    │  │  External Hosts   │
          │  (BaaS)           │  │                │  │  (Google, etc.)   │
          │                   │  │                │  │                   │
          │  • Authentication │  │  • Surveys     │  │  • Connectivity   │
          │  • User Storage   │  │  • Data        │  │    Checks         │
          │  • Sessions       │  │  • Forms       │  │                   │
          │                   │  │                │  │                   │
          └───────────────────┘  └────────────────┘  └───────────────────┘
```

### Module Dependencies

```
┌─────────────┐
│   Frontend  │
│   (Svelte)  │
└──────┬──────┘
       │ calls
       ↓
┌─────────────┐
│ API Routes  │
└──────┬──────┘
       │ uses
       ↓
┌──────────────────────────────────────────┐
│          Business Services               │
│                                          │
│  ┌────────┐  ┌─────────┐  ┌──────────┐  │
│  │  Auth  │←→│ Surveys │  │  Health  │  │
│  └───┬────┘  └────┬────┘  └────┬─────┘  │
│      │            │             │        │
└──────┼────────────┼─────────────┼────────┘
       │            │             │
       ↓            ↓             ↓
┌──────────────────────────────────────────┐
│        Infrastructure Clients            │
│                                          │
│  ┌────────┐  ┌─────────┐  ┌──────────┐  │
│  │Appwrite│  │ REDCap  │  │  Node.js │  │
│  │ Client │  │ Client  │  │  Net/TLS │  │
│  └────────┘  └─────────┘  └──────────┘  │
└──────────────────────────────────────────┘
```

---

## Proposed Architecture - Phase 1

### Overview with Survey Microservice

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Client Browser                                       │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────┴────────────────────────────────────────┐
│                                                                         │
│              AMARRE Application (SvelteKit) - API Gateway               │
│                          Port 3000 / 5173                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Frontend Layer (Svelte)                      │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
│  ┌───────────────────────────┴───────────────────────────────────────┐  │
│  │                      API Routes & Services                        │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐  ┌────────────────────────────────────────┐ │  │
│  │  │   Auth Routes   │  │    Surveys Routes (Proxy/Adapter)      │ │  │
│  │  │   & Services    │  │                                        │ │  │
│  │  │                 │  │  • Authentication                      │ │  │
│  │  │  • login        │  │  • Forwarding to Survey Service        │ │  │
│  │  │  • logout       │  │  • Enrichment (userId)                 │ │  │
│  │  │  • signup       │  │  • Error handling                      │ │  │
│  │  │  • profile      │  └────────────────────┬───────────────────┘ │  │
│  │  └────────┬────────┘                       │                     │  │
│  │           │                                 │ HTTP/REST           │  │
│  └───────────┼─────────────────────────────────┼─────────────────────┘  │
│              │                                 │                        │
│              ↓                                 ↓                        │
│     ┌────────────────┐              ┌─────────────────────────┐        │
│     │  Appwrite      │              │                         │        │
│     │  Client        │              │                         │        │
│     └────────┬───────┘              │                         │        │
│              │                      │                         │        │
└──────────────┼──────────────────────┼─────────────────────────┘        │
               │                      │                                  │
               │ HTTPS                │                                  │
               │                      │                                  │
    ┌──────────┴─────────┐            │                                  │
    │                    │            │                                  │
    │  Appwrite Cloud    │            │                                  │
    │  (BaaS)            │            │                                  │
    │                    │            │                                  │
    └────────────────────┘            │                                  │
                                      │                                  │
              ┌───────────────────────┴──────────────────────┐           │
              │                                               │           │
              │      Survey Microservice (NEW) ⭐             │           │
              │              Port 3001                        │           │
              │                                               │           │
              │  ┌──────────────────────────────────────┐    │           │
              │  │         API Layer                    │    │           │
              │  │                                      │    │           │
              │  │  POST   /api/v1/surveys/requests    │    │           │
              │  │  GET    /api/v1/surveys/requests    │    │           │
              │  │  GET    /api/v1/surveys/links       │    │           │
              │  │  GET    /api/v1/surveys/data        │    │           │
              │  │                                      │    │           │
              │  └──────────────────┬───────────────────┘    │           │
              │                     │                        │           │
              │  ┌──────────────────┴───────────────────┐    │           │
              │  │        Business Logic                │    │           │
              │  │                                      │    │           │
              │  │  • Request validation               │    │           │
              │  │  • Survey link generation           │    │           │
              │  │  • Data export                      │    │           │
              │  │  • Business rules                   │    │           │
              │  │    (incomplete requests limit)      │    │           │
              │  │                                      │    │           │
              │  └──────────────────┬───────────────────┘    │           │
              │                     │                        │           │
              │  ┌──────────────────┴───────────────────┐    │           │
              │  │       REDCap Client                  │    │           │
              │  │                                      │    │           │
              │  │  • API Communication                │    │           │
              │  │  • Error handling                   │    │           │
              │  │  • Retry logic                      │    │           │
              │  │                                      │    │           │
              │  └──────────────────┬───────────────────┘    │           │
              │                     │                        │           │
              └─────────────────────┼────────────────────────┘           │
                                    │ HTTPS                              │
                                    │                                    │
                         ┌──────────┴──────────┐                        │
                         │                     │                        │
                         │    REDCap API       │                        │
                         │                     │                        │
                         │  • Survey Forms     │                        │
                         │  • Data Storage     │                        │
                         │  • Link Generation  │                        │
                         │                     │                        │
                         └─────────────────────┘                        │
```

### Communication Flow - Phase 1

```
┌─────────┐                ┌──────────────┐              ┌───────────────┐
│ Client  │                │   SvelteKit  │              │    Survey     │
│ Browser │                │  API Gateway │              │  Microservice │
└────┬────┘                └──────┬───────┘              └───────┬───────┘
     │                            │                              │
     │ GET /api/v1/surveys/list   │                              │
     │────────────────────────────>│                              │
     │                            │                              │
     │                            │ Auth verification            │
     │                            │ (cookies, session)           │
     │                            │                              │
     │                            │ GET /api/v1/surveys/requests │
     │                            │     ?userId=xxx              │
     │                            │     Authorization: Bearer... │
     │                            │──────────────────────────────>│
     │                            │                              │
     │                            │                              │ Query REDCap
     │                            │                              │ + Business logic
     │                            │                              │
     │                            │   200 OK                     │
     │                            │   { data: [...] }            │
     │                            │<──────────────────────────────│
     │                            │                              │
     │   200 OK                   │                              │
     │   { data: [...] }          │                              │
     │<────────────────────────────│                              │
     │                            │                              │
```

### Inter-service Authentication

```
┌──────────────┐                              ┌───────────────┐
│   SvelteKit  │                              │    Survey     │
│  API Gateway │                              │  Microservice │
└──────┬───────┘                              └───────┬───────┘
       │                                              │
       │ Option 1: API Key                            │
       │ ──────────────────────────────────────────> │
       │ Headers: X-API-Key: <secret>                │
       │                                              │
       │ Option 2: JWT Token                          │
       │ ──────────────────────────────────────────> │
       │ Headers: Authorization: Bearer <jwt>        │
       │ JWT contains: { userId, roles, exp }        │
       │                                              │
       │ Option 3: Mutual TLS (mTLS)                  │
       │ ══════════════════════════════════════════> │
       │ Client/server certificates                   │
       │                                              │
```

**Recommendation**: API Key for initial simplicity, JWT if multi-tenancy is needed.

---

## Proposed Architecture - Phase 2

### Full Microservices Architecture (Optional)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Client Browser                                       │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────┴────────────────────────────────────────┐
│                                                                         │
│                   API Gateway (SvelteKit Light)                         │
│                          Port 3000                                      │
│                                                                         │
│  • Routing & Load Balancing                                            │
│  • Authentication Middleware                                           │
│  • Rate Limiting                                                       │
│  • Frontend Serving                                                    │
│                                                                         │
└──┬────────────────────────┬────────────────────────┬────────────────────┘
   │                        │                        │
   │ HTTP/REST              │ HTTP/REST              │ HTTP/REST
   │                        │                        │
   ↓                        ↓                        ↓
┌──────────────┐   ┌──────────────────┐   ┌─────────────────┐
│              │   │                  │   │                 │
│ Auth Service │   │ Survey Service   │   │ Health Service  │
│  (Port 3002) │   │   (Port 3001)    │   │  (Port 3003)    │
│              │   │                  │   │                 │
│ ┌──────────┐ │   │  ┌────────────┐  │   │ ┌────────────┐  │
│ │ API      │ │   │  │ API        │  │   │ │ API        │  │
│ │ • signup │ │   │  │ • requests │  │   │ │ • check    │  │
│ │ • login  │ │   │  │ • links    │  │   │ │            │  │
│ │ • verify │ │   │  │ • data     │  │   │ └────────────┘  │
│ │ • logout │ │   │  └────────────┘  │   │                 │
│ └────┬─────┘ │   │                  │   │                 │
│      │       │   │  ┌────────────┐  │   │                 │
│ ┌────┴─────┐ │   │  │ Business   │  │   │                 │
│ │ Logic    │ │   │  │ Logic      │  │   │                 │
│ │          │ │   │  └────┬───────┘  │   │                 │
│ └────┬─────┘ │   │       │          │   │                 │
│      │       │   │  ┌────┴───────┐  │   │                 │
│ ┌────┴─────┐ │   │  │ REDCap     │  │   │                 │
│ │Appwrite  │ │   │  │ Client     │  │   │                 │
│ │Client    │ │   │  └────────────┘  │   │                 │
│ └────┬─────┘ │   │                  │   │                 │
└──────┼───────┘   └─────────┼────────┘   └─────────────────┘
       │                     │
       ↓                     ↓
┌──────────────┐      ┌──────────────┐
│  Appwrite    │      │  REDCap API  │
│  Cloud       │      │              │
└──────────────┘      └──────────────┘
```

### Service Mesh (Advanced Option)

```
                    ┌──────────────────┐
                    │   API Gateway    │
                    │   + Ingress      │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │       Service Mesh (Istio)      │
            │                                 │
            │  • Service Discovery            │
            │  • Load Balancing               │
            │  • Circuit Breaking             │
            │  • Retry Logic                  │
            │  • Tracing                      │
            │  • mTLS                         │
            │                                 │
            └────────────────┬────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ↓                   ↓                   ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Auth Service   │  │ Survey Service  │  │ Health Service  │
│  + Envoy Proxy  │  │  + Envoy Proxy  │  │  + Envoy Proxy  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Data Flows

### Flow 1: Survey Request Creation

```
┌────────┐     ┌──────────┐     ┌────────────┐     ┌────────────┐
│ Client │     │ Gateway  │     │  Survey    │     │  REDCap    │
│        │     │(SvelteKit)│    │  Service   │     │    API     │
└───┬────┘     └────┬─────┘     └─────┬──────┘     └─────┬──────┘
    │               │                 │                   │
    │ POST /surveys/new              │                   │
    │──────────────>│                 │                   │
    │               │                 │                   │
    │               │ Auth check      │                   │
    │               │ (session)       │                   │
    │               │                 │                   │
    │               │ GET /me         │                   │
    │               │ (user info)     │                   │
    │               │                 │                   │
    │               │ GET /surveys/requests               │
    │               │ (check incomplete)                  │
    │               │                 │                   │
    │               │                 │                   │
    │               │ POST /api/v1/surveys/requests       │
    │               │ { userId, email }                   │
    │               │ Authorization: Bearer <token>       │
    │               │────────────────>│                   │
    │               │                 │                   │
    │               │                 │ Validate request  │
    │               │                 │ (business rules)  │
    │               │                 │                   │
    │               │                 │ POST /api         │
    │               │                 │ (create record)   │
    │               │                 │──────────────────>│
    │               │                 │                   │
    │               │                 │     200 OK        │
    │               │                 │     { count: 1 }  │
    │               │                 │<──────────────────│
    │               │                 │                   │
    │               │     200 OK      │                   │
    │               │  { data: {...} }│                   │
    │               │<────────────────│                   │
    │               │                 │                   │
    │    200 OK     │                 │                   │
    │ { data: {...} }│                │                   │
    │<──────────────│                 │                   │
    │               │                 │                   │
```

### Flow 2: Survey List

```
┌────────┐     ┌──────────┐     ┌────────────┐     ┌────────────┐
│ Client │     │ Gateway  │     │  Survey    │     │  REDCap    │
│        │     │(SvelteKit)│    │  Service   │     │    API     │
└───┬────┘     └────┬─────┘     └─────┬──────┘     └─────┬──────┘
    │               │                 │                   │
    │ GET /surveys/list              │                   │
    │──────────────>│                 │                   │
    │               │                 │                   │
    │               │ Auth check      │                   │
    │               │                 │                   │
    │               │ GET /api/v1/surveys/requests        │
    │               │ ?userId=xxx                         │
    │               │────────────────>│                   │
    │               │                 │                   │
    │               │                 │ GET /api          │
    │               │                 │ ?filterLogic=...  │
    │               │                 │──────────────────>│
    │               │                 │                   │
    │               │                 │   200 OK          │
    │               │                 │   [records...]    │
    │               │                 │<──────────────────│
    │               │                 │                   │
    │               │                 │ For each record:  │
    │               │                 │ GET /api (links)  │
    │               │                 │──────────────────>│
    │               │                 │<──────────────────│
    │               │                 │                   │
    │               │     200 OK      │                   │
    │               │  { data: [...] }│                   │
    │               │<────────────────│                   │
    │               │                 │                   │
    │    200 OK     │                 │                   │
    │ { data: [...] }│                │                   │
    │<──────────────│                 │                   │
    │               │                 │                   │
```

### Flow 3: Authentication

```
┌────────┐     ┌──────────┐     ┌────────────┐     ┌────────────┐
│ Client │     │ Gateway  │     │   Auth     │     │  Appwrite  │
│        │     │(SvelteKit)│    │  Service   │     │   Cloud    │
└───┬────┘     └────┬─────┘     └─────┬──────┘     └─────┬──────┘
    │               │                 │                   │
    │ POST /auth/signup              │                   │
    │ { email }                      │                   │
    │──────────────>│                 │                   │
    │               │                 │                   │
    │               │ POST /api/v1/auth/signup            │
    │               │ { email }                           │
    │               │────────────────>│                   │
    │               │                 │                   │
    │               │                 │ Validate email    │
    │               │                 │                   │
    │               │                 │ POST /account     │
    │               │                 │ /createMagicURL   │
    │               │                 │──────────────────>│
    │               │                 │                   │
    │               │                 │    200 OK         │
    │               │                 │    { token }      │
    │               │                 │<──────────────────│
    │               │                 │                   │
    │               │     200 OK      │                   │
    │               │   { token }     │                   │
    │               │<────────────────│                   │
    │               │                 │                   │
    │    200 OK     │                 │                   │
    │  { token }    │                 │                   │
    │<──────────────│                 │                   │
    │               │                 │                   │
    │               │                 │   (Email sent)    │
    │               │                 │                   │
```

---

## Deployment

### Deployment Architecture - Docker Compose (Dev/Staging)

```yaml
┌─────────────────────────────────────────────────────────────┐
│                        Docker Host                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Docker Network: amarre-net               │ │
│  │                                                       │ │
│  │  ┌─────────────────┐       ┌─────────────────────┐   │ │
│  │  │  gateway        │       │  survey-service     │   │ │
│  │  │  (SvelteKit)    │──────>│                     │   │ │
│  │  │  Port: 3000     │       │  Port: 3001         │   │ │
│  │  │                 │       │  (internal)         │   │ │
│  │  └─────────────────┘       └─────────────────────┘   │ │
│  │          │                           │                │ │
│  │          │                           │                │ │
│  │  ┌───────┴──────────────┬────────────┴──────────┐    │ │
│  │  │                      │                       │    │ │
│  │  ↓                      ↓                       ↓    │ │
│  │  External              External              External│ │
│  │  Appwrite              REDCap                Redis  │ │
│  │  (cloud)               (API)                 (cache)│ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │            Observability Stack                        │ │
│  │                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │Prometheus│  │  Grafana │  │  Loki (Logs)     │   │ │
│  │  │(metrics) │  │          │  │                  │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture - Kubernetes (Production)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Ingress Controller                       │ │
│  │               (NGINX / Traefik)                             │ │
│  │                                                             │ │
│  │  • SSL Termination                                         │ │
│  │  • Load Balancing                                          │ │
│  │  • Rate Limiting                                           │ │
│  │                                                             │ │
│  └────────────────────┬───────────────────────────────────────┘ │
│                       │                                          │
│         ┌─────────────┼─────────────┐                            │
│         │                           │                            │
│  ┌──────┴──────────┐       ┌────────┴──────────────┐            │
│  │   Namespace:    │       │   Namespace:          │            │
│  │   amarre-app    │       │   amarre-surveys      │            │
│  │                 │       │                       │            │
│  │ ┌─────────────┐ │       │  ┌─────────────────┐ │            │
│  │ │ Deployment  │ │       │  │  Deployment     │ │            │
│  │ │  gateway    │ │       │  │  survey-service │ │            │
│  │ │             │ │       │  │                 │ │            │
│  │ │ Replicas: 3 │─┼──────>│  │  Replicas: 3    │ │            │
│  │ │ Port: 3000  │ │       │  │  Port: 3001     │ │            │
│  │ └─────────────┘ │       │  └─────────────────┘ │            │
│  │                 │       │                       │            │
│  │ ┌─────────────┐ │       │  ┌─────────────────┐ │            │
│  │ │  Service    │ │       │  │   Service       │ │            │
│  │ │ (ClusterIP) │ │       │  │  (ClusterIP)    │ │            │
│  │ └─────────────┘ │       │  └─────────────────┘ │            │
│  │                 │       │                       │            │
│  │ ┌─────────────┐ │       │  ┌─────────────────┐ │            │
│  │ │ConfigMap    │ │       │  │  ConfigMap      │ │            │
│  │ │  + Secrets  │ │       │  │   + Secrets     │ │            │
│  │ └─────────────┘ │       │  └─────────────────┘ │            │
│  │                 │       │                       │            │
│  └─────────────────┘       └───────────────────────┘            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Namespace: monitoring                          │ │
│  │                                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐  │ │
│  │  │Prometheus│  │  Grafana │  │  Loki                   │  │ │
│  │  │Stack     │  │          │  │  (Log Aggregation)      │  │ │
│  │  └──────────┘  └──────────┘  └─────────────────────────┘  │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Progressive Deployment (Canary / Blue-Green)

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                     │
│                                                     │
│         Traffic Split: 90% / 10%                    │
│                                                     │
└───────────────────┬─────────────────┬───────────────┘
                    │                 │
         ┌──────────┴────────┐  ┌─────┴──────────┐
         │  90% traffic      │  │  10% traffic   │
         │                   │  │                │
    ┌────┴──────────┐   ┌────┴──────────────┐   │
    │  Blue         │   │  Canary (Green)   │   │
    │  (Current)    │   │  (New Version)    │   │
    │               │   │                   │   │
    │  v1.3.0       │   │  v1.4.0           │   │
    │  3 replicas   │   │  1 replica        │   │
    └───────────────┘   └───────────────────┘   │
                                                 │
    If success: gradual shift 100% → Canary      │
    If failure: immediate rollback → Blue        │
```

---

## Monitoring and Observability

### Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Services (Instrumented)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Gateway    │  │   Survey     │  │   Auth       │     │
│  │              │  │   Service    │  │   Service    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │             │
│         │ Metrics         │ Logs             │ Traces      │
│         │ (Prom format)   │ (JSON)           │ (OTLP)      │
│         │                 │                  │             │
└─────────┼─────────────────┼──────────────────┼─────────────┘
          │                 │                  │
          ↓                 ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                  Observability Platform                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Prometheus   │  │    Loki      │  │  Jaeger/Tempo    │ │
│  │              │  │              │  │  (Tracing)       │ │
│  │ • Metrics    │  │ • Log        │  │                  │ │
│  │   storage    │  │   aggregation│  │ • Distributed    │ │
│  │ • Alerting   │  │ • Indexing   │  │   tracing        │ │
│  │ • PromQL     │  │ • LogQL      │  │ • Span analysis  │ │
│  │              │  │              │  │                  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │           │
│         └─────────────────┴────────────────────┘           │
│                           │                                │
│                           ↓                                │
│                  ┌──────────────────┐                      │
│                  │     Grafana      │                      │
│                  │                  │                      │
│                  │  • Dashboards    │                      │
│                  │  • Alerting      │                      │
│                  │  • Visualization │                      │
│                  │                  │                      │
│                  └──────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

These diagrams illustrate the progressive evolution of the AMARRE architecture:

1. **Current architecture**: Well-structured SvelteKit monolith
2. **Phase 1**: Extraction of the Surveys service (recommended)
3. **Phase 2**: Full microservices architecture (optional)

**Key to success**: Progressive migration, strong observability, and decision based on real metrics.

---

_Document generated on December 20, 2025_
_Linked to document [Microservices Audit](/audit/amarre/)_
