---
title: "0041 — Stratégie d'authentification du service CRF (Hono)"
---

## Contexte

Le service `services/crf` est un microservice HTTP Hono qui sert d'adaptateur
vers une plateforme de formulaires de saisie complexes (CRF : _complex reporting form_). Il **détient un
jeton d'API du backing service** (`REDCAP_API_TOKEN`, lu via `Config` Effect
dans `services/crf/src/server/env.ts`) et **expose des routes nominatives** :
`GET /api/v1/records`, `GET /api/v1/records/:id/pdf`,
`GET /api/v1/users/by-email`, etc. (cf. `apiRoutes` dans
`services/crf/src/server/app.ts`). Ces routes restituent des données se
rapportant à des personnes physiques identifiées — exactement le périmètre que
l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) place sous
RGPD, avec sa règle « **pas d'endpoint anonyme exposant des personnes** ».

Or, à la lecture de `createApp()` dans `services/crf/src/server/app.ts`, la
chaîne de middlewares est : `httpInstrumentationMiddleware()`, `logger()`,
`cors()`, `apiRateLimiter` (sur `/api/*`, défini dans
`services/crf/src/server/middleware/rate-limit.ts`), puis `traceBlocker`.
**Aucun middleware d'authentification.** Toute route `/api/v1/*` est ouverte :
quiconque atteint le port du service peut lire des données nominatives et faire
relayer le jeton du backing service. Le rate limiter borne le débit par IP, il
n'authentifie personne.

Le réflexe serait de réutiliser `packages/auth`. C'est impossible :
`packages/auth/src/hooks.ts` importe `Cookies` depuis `@sveltejs/kit` et
construit une session via le SDK BaaS (`createSessionClient`). C'est un
`handle` **SvelteKit**, couplé au cycle de requête SvelteKit et au cookie de
session du BaaS — **incompatible avec le modèle middleware de Hono**
(`(c, next) => …`). Il n'y a pas d'adaptateur ; le partage de code s'arrête à la
logique de validation, pas au point d'entrée.

Côté exposition, le cluster qui héberge ces charges applique des
**`NetworkPolicies` default-deny** (cf.
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/), inventaire
du cluster ; le [contrat d'interface](/atlas/decisions/0033-contrat-interface-cluster/)
fixe par ailleurs ingress + TLS de bordure). Le trafic est donc **fermé par
défaut au niveau réseau** : seules les communications explicitement autorisées
passent. La question n'est pas « faut-il une frontière ? » — le réseau en
fournit déjà une — mais « **le contrôle réseau suffit-il pour des données
nominatives, et quelle authentification applicative ajouter en défense en
profondeur ?** ».

Cet ADR cadre l'extension sécurité de l'audit (issue #307) : l'audit doit
pouvoir constater qu'un service exposant des données personnelles porte une
authentification applicative, pas seulement un cloisonnement réseau.

## Décision

> **Le service CRF s'authentifie par un jeton porteur (`Bearer`) statique,
> vérifié par un middleware Hono dédié à créer, posé avant les routes `/api/v1/*`.
> Ce contrôle applicatif est une défense en profondeur qui s'ajoute — sans s'y
> substituer — au default-deny réseau du cluster. mTLS, OAuth et session BaaS
> sont écartés à ce stade, motivés ci-dessous.**

### Le service est interne, mais l'auth applicative reste obligatoire

`services/crf` est un **service interne** : il n'est pas appelé directement par
un navigateur public mais par d'autres charges du cluster (un front SvelteKit,
un orchestrateur). Le default-deny réseau garantit déjà que seules les sources
explicitement autorisées l'atteignent. Mais détenir le jeton du backing service
et servir des données nominatives interdit de **dépendre d'une seule couche** :
une `NetworkPolicy` trop large, un namespace mal cloisonné, un port-forward de
debug, et le service devient ouvert. On exige donc une **authentification
applicative en plus** du réseau — exactement la règle « pas d'endpoint anonyme
exposant des personnes » de
l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/).

### Pourquoi `Bearer` statique, et pas les alternatives

- **`Bearer` statique (retenu).** Un secret partagé, injecté côté service par
  une variable d'environnement (même mécanisme que `REDCAP_API_TOKEN` via
  `Config` Effect dans `env.ts`) et présenté par l'appelant en en-tête
  `Authorization: Bearer …`. Vérification **stateless** : pas de store de
  sessions, pas de round-trip vers un tiers, **aucun état partagé entre
  instances**. C'est proportionné à un service interne, appelé par un petit
  nombre de clients de confiance, derrière un réseau déjà fermé.
- **mTLS (écarté ici).** Le mTLS authentifie machine-à-machine mais relève de
  l'**infrastructure** (émission/rotation de certificats, mesh), donc du dépôt
  `cluster` et **hors périmètre du code** ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) :
  « aucun manifeste d'infrastructure ne vit dans `atlas` »). Il pourra
  **compléter** le Bearer comme couche réseau ; il ne le remplace pas et ne se
  décide pas dans ce dépôt.
- **OAuth / OIDC (écarté ici).** Adapté à des utilisateurs finaux et à des
  scopes fins ; surdimensionné pour un appel service-à-service interne. Il
  ajoute une dépendance à un fournisseur d'identité et un flux de jetons sans
  bénéfice à ce stade. Reconsidéré si le service est exposé à des utilisateurs
  directs.
- **Session BaaS (écarté ici).** C'est ce que fait `packages/auth`, mais via le
  cookie de session d'un navigateur et le SDK BaaS — modèle SvelteKit, couplé au
  front. L'imposer à un service interne lui ajouterait une dépendance au BaaS sur
  son chemin critique sans raison.

### Un middleware Hono dédié, à créer dans le service

`packages/auth` n'est **pas réutilisable** (hooks SvelteKit, cf. _Contexte_). On
crée un **middleware Hono propre au service**, à côté de
`services/crf/src/server/middleware/rate-limit.ts`, signature
`(c, next) => …` : il lit `Authorization`, compare le jeton en **temps constant**
au secret attendu, et répond `401` (enveloppe d'erreur existante
`{ data: null, error: { code, message } }`) si absent ou invalide. Il est posé
dans `createApp()` **avant** `app.route('/api/v1/...')`, sur `/api/*` (comme le
rate limiter), en **laissant `/health`, `/openapi.json` et `/docs` ouverts**. Le
secret est configuré comme les autres via `Config` Effect dans `env.ts`.

## Statut

Accepted (2026-06-04).

L'absence d'authentification sur `/api/v1/*` est un **écart de sécurité ouvert**
tant que le middleware n'est pas en place : la décision est actée, son
implémentation est suivie via #307 et l'extension sécurité de l'audit. Reste
dans le **périmètre du code** ; mTLS, certificats et `NetworkPolicies` relèvent
du dépôt `cluster`.

## Conséquences

**Bénéfices.** Les routes nominatives cessent d'être anonymes, ce qui aligne le
service sur la règle de l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)
et ferme l'exposition du jeton du backing service. La vérification est
**stateless** : aucune session à répliquer, donc **rien à invalider ni à
synchroniser entre instances** — le service reste scalable horizontalement sans
store partagé. Le secret réutilise le mécanisme `Config` Effect déjà en place
(`env.ts`), sans nouveau sous-système. La frontière est **double** (réseau +
applicatif) : la défaillance d'une couche ne suffit plus à ouvrir le service.

**Prix à payer.** Un secret partagé statique **ne distingue pas les appelants**
(pas d'identité par client, pas de scope) et sa **rotation** est manuelle :
changer le jeton suppose de le redéployer côté service **et** côté appelants. Un
Bearer sans mTLS reste vulnérable au rejeu si le canal n'est pas chiffré — d'où
la dépendance au TLS de bordure du
[contrat d'interface](/atlas/decisions/0033-contrat-interface-cluster/). On écrit
du code spécifique au service faute de pouvoir partager `packages/auth`, ce qui
crée une seconde implémentation d'auth dans le dépôt (front SvelteKit d'un côté,
service Hono de l'autre).

**Garde-fous.**

- **Comparaison en temps constant** du jeton (pas d'`===` court-circuitant),
  pour ne pas fuiter le secret par timing.
- **Aucun secret en clair dans les logs** : le `logger()` Hono ne doit pas
  journaliser l'en-tête `Authorization` ; à vérifier au branchement du
  middleware.
- **`/health`, `/openapi.json`, `/docs` restent ouverts** ; seules les routes
  `/api/*` sont protégées — le contrôle vise les données, pas la sondabilité.
- **Pas d'invalidation à gérer, par conception** : si un besoin de révocation par
  client ou de session apparaît, il **rouvre cet ADR** (passage à OAuth/mTLS),
  car le Bearer statique n'offre ni l'un ni l'autre.
- **mTLS et `NetworkPolicies` ne se décident pas ici** : toute évolution de la
  couche réseau ou des certificats passe par le dépôt `cluster` et son
  [contrat d'interface](/atlas/decisions/0033-contrat-interface-cluster/).
- L'**audit sécurité** (#307) vérifie qu'un service exposant des données
  nominatives porte un middleware d'authentification ; un service nominatif sans
  auth applicative est un finding, dans la continuité du SLA de
  l'[ADR 0018](/atlas/decisions/0018-sla-remediation-findings/).
