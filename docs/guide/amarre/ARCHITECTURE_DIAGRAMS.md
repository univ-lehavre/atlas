# Diagrammes d'Architecture - AMARRE

**Date:** 20 décembre 2025  
**Version:** 1.0  
**Lié à:** [Audit Microservices](./MICROSERVICES_AUDIT.md)

## Table des matières

1. [Architecture Actuelle](#architecture-actuelle)
2. [Architecture Proposée - Phase 1](#architecture-proposée---phase-1)
3. [Architecture Proposée - Phase 2](#architecture-proposée---phase-2)
4. [Flux de Données](#flux-de-données)
5. [Déploiement](#déploiement)

---

## Architecture Actuelle

### Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Navigateur Client (Browser)                          │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────┴────────────────────────────────────────┐
│                                                                         │
│                   Application AMARRE (SvelteKit)                        │
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

### Dépendances entre modules

```
┌─────────────┐
│   Frontend  │
│   (Svelte)  │
└──────┬──────┘
       │ appelle
       ↓
┌─────────────┐
│ API Routes  │
└──────┬──────┘
       │ utilise
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

## Architecture Proposée - Phase 1

### Vue d'ensemble avec Survey Microservice

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Navigateur Client (Browser)                          │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────┴────────────────────────────────────────┐
│                                                                         │
│              Application AMARRE (SvelteKit) - API Gateway               │
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
│  │  │                 │  │  • Authentification                    │ │  │
│  │  │  • login        │  │  • Forwarding vers Survey Service      │ │  │
│  │  │  • logout       │  │  • Enrichissement (userId)             │ │  │
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

### Flux de communication - Phase 1

```
┌─────────┐                ┌──────────────┐              ┌───────────────┐
│ Client  │                │   SvelteKit  │              │    Survey     │
│ Browser │                │  API Gateway │              │  Microservice │
└────┬────┘                └──────┬───────┘              └───────┬───────┘
     │                            │                              │
     │ GET /api/v1/surveys/list   │                              │
     │────────────────────────────>│                              │
     │                            │                              │
     │                            │ Vérification auth            │
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

### Authentification inter-services

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
       │ JWT contient: { userId, roles, exp }        │
       │                                              │
       │ Option 3: Mutual TLS (mTLS)                  │
       │ ══════════════════════════════════════════> │
       │ Certificats client/serveur                   │
       │                                              │
```

**Recommandation** : API Key pour simplicité initiale, JWT si multi-tenancy nécessaire.

---

## Architecture Proposée - Phase 2

### Architecture Full Microservices (Optionnelle)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Navigateur Client (Browser)                          │
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

### Service Mesh (Option avancée)

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

## Flux de Données

### Flux 1 : Création de demande d'enquête

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

### Flux 2 : Liste des enquêtes

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

### Flux 3 : Authentification

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
    │               │                 │   (Email envoyé)  │
    │               │                 │                   │
```

---

## Déploiement

### Architecture de déploiement - Docker Compose (Dev/Staging)

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

### Architecture de déploiement - Kubernetes (Production)

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

### Déploiement progressif (Canary / Blue-Green)

```
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer                         │
│                                                         │
│         Traffic Split: 90% / 10%                        │
│                                                         │
└───────────────────┬─────────────────┬───────────────────┘
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
    Si succès: gradual shift 100% → Canary      │
    Si échec: rollback immédiat → Blue           │
```

---

## Monitoring et Observabilité

### Stack d'observabilité

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

Ces diagrammes illustrent l'évolution progressive de l'architecture AMARRE :

1. **Architecture actuelle** : Monolithe SvelteKit bien structuré
2. **Phase 1** : Extraction du service Surveys (recommandé)
3. **Phase 2** : Architecture microservices complète (optionnelle)

**Clé du succès** : Migration progressive, observabilité forte, et décision basée sur les métriques réelles.

---

_Document généré le 20 décembre 2025_  
_Lié au document [MICROSERVICES_AUDIT.md](./MICROSERVICES_AUDIT.md)_
