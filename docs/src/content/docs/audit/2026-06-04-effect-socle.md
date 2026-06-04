---
title: "Audit de l'intégration Effect (vers un socle d'exécution) — 2026-06-04"
---

> Date de l'audit : 2026-06-04. Méthode : workflow multi-agents (7 dimensions
> auditées en parallèle — runtime, observabilité, Schema, gestion d'erreurs,
> dépendances `@effect/*`, tests, frontières SvelteKit). Chaque constat est
> **prouvé par le code** (chemins de fichiers lus) puis, pour les constats
> majeurs, **vérifié de manière adversariale** par un second agent qui défend la
> position inverse. Plusieurs « écarts » ont été **nuancés ou dégonflés** à la
> vérification — ces nuances sont conservées ci-dessous.

## Périmètre

L'usage de la bibliothèque [Effect](https://effect.website/) (`effect` et
l'écosystème `@effect/*`) dans tout le dépôt : packages métier, services, CLIs,
apps SvelteKit. La question directrice : sur l'échelle **« Effect à la marge »
→ « Effect comme socle d'exécution »**, où en est `atlas`, et quels écarts
restent vers une intégration poussée (runtime central, injection par Layer,
télémétrie intégrée, validation unifiée) ?

## Positionnement

**`atlas` est dans le premier tiers : Effect est un langage de description du
métier, jamais une couche d'exécution.**

- **Zéro runtime applicatif** dans tout le dépôt (`ManagedRuntime` introuvable,
  aucun alias `Runtime`). Les deux seuls `Layer.*` non-test
  (`makeCrfClientLayer`, `makeCliContextLayer`) sont des factories `Layer.succeed`
  **jamais montées à une frontière** — utilisées uniquement par leurs propres
  tests. _(confirmé)_
- Effect est **omniprésent comme bibliothèque** (~18 paquets déclarent `effect` ;
  le métier REDCap/citation/researcher-profiles est intégralement en pipelines
  Effect, `Data.TaggedError`, `Schedule`, `Context.Tag`), mais **chaque frontière
  improvise son exécution** : 3 primitives Effect distinctes (`NodeRuntime.runMain`,
  `runPromiseExit`, `runPromise`) plus un wrapper non-Effect (le `runMain` de
  `cli-toolkit` = `main().catch(exit 1)`), réparties sur 5 des CLIs. _(nuancé :
  « 5 runners » est un décompte par site d'appel)_

Le socle conceptuel (types, erreurs, pipelines) est là ; **la couche d'exécution
— runtime, Layer d'injection, propagation de contexte logger/config/tracer — est
absente.** C'est la frontière entre « on écrit du Effect » et « on tourne sur
Effect ».

## Ce qui est déjà solide

- **Schema à la frontière HTTP de `services/crf`** : validation query/json via
  `S.standardSchemaV1` + hono-openapi, hook d'erreur unique. Décodage + erreurs
  typées corrects.
- **`crf-project-template`** : usage Schema canonique (schéma déclaratif = type +
  validateur, `decodeUnknownEither` → `ParseError` typé). Référence interne.
- **Modèle d'erreur cohérent par frontière** : `Data.TaggedError` côté
  pipelines/CLI (14 classes, 6 fichiers) ; `ApplicationError extends Error` côté
  HTTP SvelteKit/BaaS. La séparation **suit la frontière** SvelteKit/Appwrite —
  choix assumé, pas une dette accidentelle.
- **Découplage `@sveltejs/kit` propre** : `auth`/`baas`/`sveltekit-handler`
  n'importent SvelteKit qu'en `import type`.
- **Régime de test Effect-natif réel** : `@effect/vitest` + `it.effect` dominant
  dans `citation-validate`, systématique dans `fetch-one-api-page`.
- **Adaptateur Effect↔HTTP de référence** : `runEffect`/`runEffectRaw` de
  `services/crf` (`Effect.map` + `Effect.catchAll`/`Match.tag` puis `runPromise`)
  préserve le mapping erreur→statut. Brique réutilisable.
- **Compatibilité de versions favorable** : `effect@3.21.2`,
  `@effect/opentelemetry@0.63` (peer `effect ^3.21.0`) directement compatible,
  peers OTel 2.x déjà alignés, `@effect/platform@0.96.1` présent transitivement.

## Écarts vers un socle complet

Priorisés par ratio valeur/effort (S/M/L/XL · risque · dépendance). Les
**deux structurants sont E10 (runtime) et E6 (frontière)** ; tout le reste s'y
rattache ou se traite indépendamment à faible coût.

| #       | Écart                                                                                                                                                                                      | Effort | Risque | Dépend de  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ---------- |
| **E1**  | **Faux vert `csv.test.ts`** : 3 tests `it(() => Effect.gen(…))` retournent un Effect **jamais exécuté** → verts sans assertion (prouvé par mutation).                                      | S      | faible | —          |
| **E2**  | **Divergence de patterns** `RECORD_ID_PATTERN` (`/^[a-z0-9]{20,}$/i` service vs `/^[\w-]+$/` core) et `CRF_NAME_PATTERN`. _(nuance : `RecordIdSchema` service est code mort)_              | S      | moyen  | —          |
| **E3**  | **Acter la stratégie Effect en ADR** : runtime central, frontière unique, Schema vs zod, `atlas-errors` vs TaggedError, convention de test. Décisionnel, non tracé.                        | S      | faible | —          |
| **E4**  | **Retirer les phantom deps `@effect/*`** : `cluster`/`rpc`/`sql` (0 import) dans `cli/net`,`cli/crf`,`cli/biblio` ; `experimental`/`platform-node` dans `citation`.                        | S      | faible | —          |
| **E5**  | **Durcir knip** contre le faux-négatif peer-deps (une dep satisfaisant un peerDep d'un paquet importé est comptée « utilisée » → `audit:unused` ne voit pas ces phantoms).                 | M      | moyen  | E4         |
| **E6**  | **Adaptateur Effect↔SvelteKit** dans `sveltekit-handler` (symétrique de `runEffect`) : `catchAll(tag → {body,status})` avant `runPromise`, pour ne plus aplatir en `500`.                  | M      | moyen  | E3         |
| **E7**  | **Câbler `CrfClient` comme service Effect** via `makeCrfClientLayer` (écrit, inutilisé). _(nuance : gain = injectabilité/test, pas gestion de scope ; mock déjà fonctionnel)_              | M      | moyen  | E10        |
| **E8**  | **Layer logger/telemetry partagé** via Effect (remplacer `quiet`/`withMinimumLogLevel(None)` re-appliqués et l'OTel hors Effect), configuré une fois au runtime.                           | M      | faible | E10        |
| **E9**  | **Pont OTel↔Effect** : ajouter `@effect/opentelemetry`, `NodeSdk.layer` (opt-in conservé), `Effect.withSpan` sur le client REDCap. _(nuance : impact nul sans `withSpan` ; dette latente)_ | L      | moyen  | E10, E4/E5 |
| **E10** | **Runtime Effect central par type de processus** : `ManagedRuntime.make(AppLayer)` (logger+config+services), créé une fois — CLIs, `services/crf`, apps SvelteKit. Pièce maîtresse.        | L→XL   | moyen  | E3         |
| **E11** | **Unifier l'amorçage CLI** : runner Effect unique (remplace le `runMain` non-Effect de `cli-toolkit`), migrer les ~14 `runPromise` isolés de `researcher-profiles`, etc.                   | L      | moyen  | E10        |
| **E12** | **Schema-as-brand dans `crf-core`** : source unique `Schema.String.pipe(pattern, brand)` → type + décodeur + prédicat + pattern OpenAPI ; supprime la triple redondance.                   | L      | moyen  | E2         |
| **E13** | **Décoder les réponses externes (OpenAlex)** : remplacer `as T` de `fetch-one-api-page` par un `Schema<T>` décodé, `ResponseParseError` portant le `ParseError`.                           | L      | moyen  | —          |
| **E14** | **Layers de test partagés** (test-utils Effect) + `TestClock` pour rate-limit/retries/timeouts. _(nuance : « zéro Layer » faux — `crf-client` teste un vrai Layer)_                        | XL     | élevé  | E10, E12   |

## Suivi

Chaque écart actionnable ouvre une **issue GitHub** ; les décisions structurantes
(E3) ouvrent des **ADR** avant tout code. Le découpage et l'exécution sont portés
par le [plan de résorption Effect](/atlas/plans/2026-06-04-socle-effect/). Le
résumé vivant des pratiques reste tenu dans
[Normes et pratiques appliquées](/atlas/quality/normes/) ; ce rapport en fige
l'état au 2026-06-04 avec les preuves.

## Points de vigilance (anti-sur-ingénierie)

- **Ne PAS migrer `atlas-errors` vers `TaggedError`** : cela imposerait `effect`
  à toute la couche `auth`/`baas`/SvelteKit (qui ne l'embarque pas) pour un gain
  de discrimination **nul** (`instanceof` suffit). Le vrai écart est la **couture**
  (E6), pas le modèle.
- **Effect ne franchit jamais la frontière serveur** (coût bundle, contrainte
  [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/)). Le runtime serveur des
  apps reste strictement côté serveur — risque réel d'entraîner `effect` dans le
  bundle client si l'adaptateur est mal placé.
- **Compat `@effect/opentelemetry`** : alignée aujourd'hui, mais `0.x` suit les
  mineurs d'`effect` — à épingler et surveiller ; **vérifier le double SDK** avec
  l'OTel transitif déjà tiré par `@sentry/sveltekit`.
- **Faux verts au-delà de `csv.test.ts`** : le pattern `it(() => Effect.gen(…))`
  non exécuté peut exister ailleurs ; toute migration de tests doit s'accompagner
  d'un garde-fou outillé, sinon régression silencieuse.
- **E2 avant E12** : unifier `crf-core` sur Schema-as-brand **sans** aligner
  d'abord les patterns figerait une incohérence — décider la règle, puis unifier.
- **Runtime central et 12-factor** : centraliser config/logger ne doit pas figer
  la lecture d'env au boot là où la relecture runtime est voulue (cf.
  `find-an-expert` qui relit l'env à chaque appel).
