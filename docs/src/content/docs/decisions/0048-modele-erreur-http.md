---
title: 0048 — Modèle d'erreur HTTP (atlas-errors conservé + couture Effect)
---

## Contexte

Le dépôt a **deux modèles d'erreur**, séparés par une frontière :

- **Côté Effect/CLI** : `Data.TaggedError`. La reconnaissance compte **19
  classes** sur 8 fichiers — `crf-core` (`CrfHttpError`, `CrfApiError`,
  `CrfNetworkError`…), `citation` (6 classes), `researcher-profiles` (6 classes),
  `fetch-one-api-page` (2 classes). Discrimination exhaustive par `_tag`.
- **Côté HTTP SvelteKit/BaaS** : `ApplicationError extends Error`
  (`packages/errors/src/base.ts:22-40`), avec `code` + `httpStatus`.
  `mapErrorToApiResponse` (`packages/errors/src/index.ts:118-148`) mappe
  `ApplicationError → statut`, et **tout le reste → 500 `internal_error`**.

Point décisif : `auth`, `baas` et `sveltekit-handler` **ne dépendent pas
d'`effect`** (vérifié dans leurs `package.json`) — ils ne consomment
qu'`atlas-errors`, qui lui-même a **zéro dépendance**. La séparation **suit la
frontière** : choix assumé, pas dette accidentelle.

Le service `crf` **mappe déjà** correctement ses `TaggedError` en statut, via
`Match.tag` exhaustif dans `effect-handler.ts` — il ne délègue jamais à
`mapErrorToApiResponse`. Le **vrai trou** est ailleurs (E6) : quand un
`Data.TaggedError` remonte dans un handler SvelteKit qui ne connaît
qu'`ApplicationError`, `mapErrorToApiResponse` le voit comme un `Error` nu et
renvoie **500**, perdant le statut métier.

La tentation serait d'unifier en migrant `atlas-errors` vers `Data.TaggedError`.
L'audit le **déconseille explicitement** : cela imposerait `effect` à toute la
couche `auth`/`baas`/SvelteKit pour un gain de discrimination **nul** (`instanceof`
suffit déjà à la frontière HTTP).

## Décision

> **`atlas-errors` (`ApplicationError`) reste le modèle d'erreur à la frontière
> HTTP SvelteKit/BaaS. On ne migre PAS vers `Data.TaggedError`. Le canal d'erreur
> typé Effect est préservé par un adaptateur de couture (E6) qui traduit les
> `TaggedError` en statut HTTP **avant** l'exécution, sans imposer `effect` aux
> paquets de frontière.**

### Deux modèles, chacun à sa place

`Data.TaggedError` est le bon outil **dans** les pipelines Effect : il donne la
discrimination exhaustive (`Match.tag`) dont le métier a besoin (retry, branch,
fallback). `ApplicationError` est le bon outil **à la frontière HTTP** : un
`Error` porteur de `httpStatus`/`code`, sans dépendance, consommable par
`auth`/`baas`/`sveltekit-handler` qui n'ont aucune raison de tirer `effect`. La
frontière entre les deux **est** la frontière d'exécution Effect — la même que
celle de [ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/).

### La couture traduit, elle ne fusionne pas

Le seul écart réel (E6) est le **point de jointure** : là où un Effect typé
s'exécute pour produire une réponse HTTP. L'adaptateur de
[ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/) y applique
`catchAll(Match.tag → {status, code, body})` **avant** `runPromise`, exactement
comme `runEffect` du service. La correspondance `TaggedError → statut` vit **dans
l'adaptateur** (code serveur, qui peut importer `effect`), pas dans
`atlas-errors`. Ainsi un échec amont (OpenAlex) ressort en statut métier au lieu
du `500` opaque, **sans** qu'`atlas-errors` ni les paquets de frontière
connaissent `effect`.

Cet ADR fixe **quels modèles d'erreur coexistent** (`atlas-errors` à la frontière,
`Data.TaggedError` dans les pipelines) et **le principe de traduction**
(`TaggedError → statut`, sans imposer `effect` aux paquets de frontière). Il
**n'énumère pas** la table tag→statut : l'**emplacement et la forme** de
l'adaptateur relèvent de
[ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/), et la **table
concrète** est un livrable de code (E6).

### Alternative écartée (anti-objectif) : migrer vers `TaggedError`

Migrer `ApplicationError` vers `Data.TaggedError` imposerait `effect` à
`auth`/`baas`/`sveltekit-handler` (paquets aujourd'hui sans `effect`), ferait
perdre les prédicats métier de `CrfHttpError` (`isAuthError`, `isRetryable`…) à
l'aplatissement, et forcerait l'alignement de version `effect` partout — tout cela
pour une discrimination que `instanceof` couvre déjà côté HTTP. Le coût bundle de
tirer `effect` dans la couche frontière est un facteur aggravant (l'audit cite le
« coût bundle » sans le chiffrer). **Anti-objectif déjà recommandé par l'audit ;
cet ADR le fige.**

## Statut

Accepted (2026-06-07). Cadre l'écart **E6** (couture, côté modèle d'erreur) et
**fige l'anti-objectif** « ne pas migrer `atlas-errors` » du
[plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/). Articulé
avec [ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/) (où vit
l'adaptateur). Aucun code applicatif livré ici.

## Conséquences

**Bénéfices.** Les paquets de frontière restent **sans `effect`** (bundle
maîtrisé, pas d'alignement de version imposé). Les pipelines gardent
`Data.TaggedError` et son exhaustivité. Le canal d'erreur typé remonte jusqu'au
statut HTTP via une couture mince et localisée — pas de double hiérarchie, pas de
réécriture massive.

**Prix à payer.** Deux modèles d'erreur cohabitent durablement, et la couture est
un point à maintenir : chaque nouveau `TaggedError` susceptible d'atteindre un
handler doit être mappé dans l'adaptateur, sinon il retombe en `500`. La
correspondance vit côté serveur, séparée de la définition des erreurs.

**Garde-fous.**

- **`auth`/`baas`/`sveltekit-handler` ne dépendent jamais d'`effect`** — vérifié
  par l'arbre de dépendances ; la couture ne doit pas réintroduire `effect` chez
  eux.
- **Mapping exhaustif dans l'adaptateur** (`Match.exhaustive`) : un `TaggedError`
  non mappé doit être un défaut détectable, pas un `500` silencieux.
- **`mapErrorToApiResponse` reste le défaut vanilla** ; il n'apprend pas à
  connaître `Data.TaggedError` (cela rouvrirait la porte à `effect` dans
  `atlas-errors`).
- **Tout besoin futur de fusionner les modèles rouvre cet ADR** — il ne se décide
  pas au fil de l'eau.
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
