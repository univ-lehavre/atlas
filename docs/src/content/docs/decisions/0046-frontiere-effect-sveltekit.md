---
title: 0046 — Frontière Effect ↔ SvelteKit
---

## Contexte

Les apps SvelteKit ont du métier écrit en Effect (citation, profils) mais
tournent dans un runtime serveur **SvelteKit**, pas Effect. La question est :
**où Effect s'arrête-t-il** dans une app, et comment l'erreur typée d'un pipeline
remonte-t-elle en réponse HTTP correcte ?

L'[audit Effect du 2026-06-04](/atlas/audit/2026-06-04-effect-socle/) et la
reconnaissance de cadrage montrent deux pratiques opposées dans le dépôt :

- **Référence côté service** : `services/crf` possède un adaptateur propre,
  `runEffect`/`runEffectRaw` (`services/crf/src/server/effect-handler.ts:63-91`) :
  `Effect.map` puis `Effect.catchAll(Match.tag → {body, status})` **avant**
  `runPromise`. L'erreur typée est traduite en statut HTTP **avant** l'exécution.
  L'audit le qualifie d'« adaptateur de référence ».
- **Pratique dispersée côté apps** : `find-an-expert` déclenche
  `Effect.runPromise` **dans `lib/server/*`**
  (`apps/find-an-expert/src/lib/server/citation/index.ts:25-32`), puis le handler
  consomme le résultat aplati. Le canal d'erreur typé est **perdu** au passage :
  une panne amont (OpenAlex) ressort en `FiberFailure → 500` opaque au lieu du
  statut métier.

Par ailleurs, `packages/sveltekit-handler` expose `withHandler`
(`packages/sveltekit-handler/src/with-handler.ts:125-147`) qui mappe les erreurs
**vanilla** (`mapErrorToApiResponse` d'`atlas-errors`) mais **ignore Effect** : il
ne sait pas traduire un `Data.TaggedError`. C'est l'emplacement naturel de
l'adaptateur manquant (E6).

Enfin, une contrainte dure : **Effect ne doit pas entrer dans le bundle client**
(coût de bundle, [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/)).
`auth`/`baas`/`sveltekit-handler` n'importent `@sveltejs/kit` qu'en `import type`
et **ne dépendent pas d'`effect`** — discipline à préserver : un adaptateur mal
placé entraînerait `effect` côté navigateur.

## Décision

> **Effect s'arrête strictement au handler serveur SvelteKit
> (`+page.server.ts`, `+server.ts`, `actions`, `hooks.server.ts`). Les modules
> `lib/server/*` retournent l'`Effect<A, E>` brut ; ils ne l'exécutent jamais.
> L'exécution et la traduction erreur→statut se font dans un adaptateur unique
> (symétrique de `runEffect` du service), hébergé dans
> `packages/sveltekit-handler` et alimenté par le runtime serveur
> ([ADR 0045](/atlas/decisions/0045-runtime-central-effect/)). Effect ne franchit
> jamais le bundle client.**

### `lib/server/*` retourne l'Effect, le handler l'exécute

La règle « `run` au plus tard » de l'ADR 0005 est resserrée pour les apps : le
« plus tard » est **le handler**, pas `lib/server`. Concrètement,
`lib/server/citation/index.ts` cesse d'appeler `runPromise` et retourne le
pipeline ; le handler le passe à l'adaptateur. On gagne la composabilité (le
handler peut enchaîner, retenter, mapper) et surtout on **conserve le type
d'erreur** jusqu'au point de traduction.

### Un adaptateur unique, symétrique de `runEffect`

L'adaptateur reprend le motif éprouvé du service : `catchAll(tag → {body,
status})` **avant** `runPromise`, pour mapper chaque `TaggedError` vers son
statut au lieu de l'aplatissement `FiberFailure → 500`. Il vit dans
`packages/sveltekit-handler` (à côté de `withHandler`) et s'exécute via le
**runtime serveur** central. La **politique** de mapping erreur (quels modèles
coexistent, le principe `TaggedError → statut`, l'articulation avec
`atlas-errors`) relève de
[ADR 0048](/atlas/decisions/0048-modele-erreur-http/) ; cet ADR-ci fixe
**l'endroit et la forme** de la couture. La table concrète tag→statut est un
livrable de code (E6).

### Effect strictement côté serveur

L'adaptateur et le runtime serveur sont importés **uniquement** depuis du code
serveur (`*.server.ts`, `+server.ts`, `hooks.server.ts`, `lib/server/*`). Le
découplage `import type` d'`@sveltejs/kit` dans les paquets de frontière
(`auth`/`baas`/`sveltekit-handler`) est maintenu, et ces paquets continuent de
**ne pas dépendre d'`effect`** (cf.
[ADR 0048](/atlas/decisions/0048-modele-erreur-http/)). C'est le placement de
l'adaptateur qui garantit qu'`effect` ne fuit pas dans le bundle navigateur.

### Alternative écartée : `runPromise` dispersé dans `lib/server/*`

C'est la pratique actuelle de `find-an-expert`. Elle « fonctionne » mais aplatit
les erreurs typées en `500` opaques et disperse l'exécution sur autant de points
que de fonctions serveur — impossible à instrumenter (E9) ou à faire transiter
par un runtime central (E10) de façon uniforme. Écartée.

## Statut

Accepted (2026-06-07). Cadre l'écart **E6** (adaptateur Effect↔SvelteKit) du
[plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/)
(Phase 2). S'articule avec
[ADR 0045](/atlas/decisions/0045-runtime-central-effect/) (runtime serveur) et
[ADR 0048](/atlas/decisions/0048-modele-erreur-http/) (politique de mapping
erreur→statut). Aucun code applicatif livré ici.

## Conséquences

**Bénéfices.** Les erreurs typées remontent en statut HTTP correct côté apps,
comme déjà côté service. L'exécution se concentre au handler : un seul point à
instrumenter, à faire passer par le runtime central, à tester. La discipline
« Effect côté serveur » est explicite et vérifiable.

**Prix à payer.** Il faut réécrire les `lib/server/*` qui exécutent aujourd'hui
(`find-an-expert` en tête) pour qu'ils retournent l'Effect, et router tous les
handlers par l'adaptateur. Une seconde voie d'erreur (Effect) cohabite avec
`withHandler` (vanilla) le temps de la migration.

**Garde-fous.**

- **Aucun `runPromise` dans `lib/server/*`** : l'exécution est au handler, via
  l'adaptateur. Garde-fou outillé souhaitable (lint/audit).
- **Adaptateur et runtime serveur importés depuis du code serveur uniquement** —
  jamais depuis un composant `.svelte` ou un module partagé client/serveur, sous
  peine d'entraîner `effect` dans le bundle client.
- **`auth`/`baas`/`sveltekit-handler` ne dépendent pas d'`effect`** : la couture
  traduit les `TaggedError` **sans** imposer `effect` à ces paquets (cf.
  [ADR 0048](/atlas/decisions/0048-modele-erreur-http/)).
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
