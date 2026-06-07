---
title: 0045 — Runtime Effect central par type de processus
---

## Contexte

L'[ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/) a fait d'Effect le
**langage de description** du métier : les erreurs sont des valeurs typées, les
pipelines sont composables. Mais il laisse chaque consommateur final déclencher
l'exécution comme il l'entend — sa règle est de déclencher (`runPromise`/`runSync`)
**le plus tard possible**, aux consommateurs finaux. L'[audit Effect du
2026-06-04](/atlas/audit/2026-06-04-effect-socle/) constate la conséquence :
**aucun runtime applicatif** dans le dépôt (`ManagedRuntime` introuvable), et
**chaque frontière improvise son exécution**.

L'inventaire le confirme :

- Trois primitives d'exécution distinctes coexistent —
  `NodeRuntime.runMain` (`cli/biblio/src/commands/index.ts:140`,
  `cli/crf/src/commands/server/index.ts:197-205`), `Effect.runPromiseExit`
  (`cli/citation/src/commands/index.ts`), `Effect.runPromise` — plus un
  **wrapper non-Effect** `main().catch(exit 1)` dans `cli-toolkit`
  (`packages/cli-toolkit/src/run.ts:34-44`). Le helper
  `packages/cli-toolkit/src/effect.ts:1-27` documente lui-même que « chaque CLI
  garde son propre runner ».
- `researcher-profiles` éparpille **~14 `Effect.runPromise` isolés** sur six
  fichiers de commande (`match-row.ts`, `process-row.ts`,
  `match-researchers.ts`, `from-crf.ts`, `match-references.ts`, `run.ts`) —
  chacun sans contexte partagé ni gestion d'erreur commune.
- Les deux seules factories `Layer` existantes,
  `makeCrfClientLayer` (`packages/crf-client/src/client.ts:415-418`) et
  `makeCliContextLayer` (`cli/crf/src/shared/context.ts:99-104`), ne sont
  **jamais montées hors de leurs propres tests**.
- `services/crf` parse sa config par `Effect.runSync(AppConfig)` **au chargement
  du module** (`services/crf/src/server/env.ts:20`) — exécution précoce qui fige
  l'environnement à l'import.

Sans runtime central, il n'y a **nulle part où câbler une fois** le logger, la
config et le tracer : c'est la cause-racine d'E8 (logger ré-appliqué partout) et
d'E9 (la télémétrie ne traverse pas Effect). C'est la frontière entre « on écrit
du Effect » et « on **tourne sur** Effect ».

## Décision

> **Chaque type de processus (CLI, service HTTP, serveur SvelteKit) possède un
> runtime Effect central, créé une seule fois au démarrage via
> `ManagedRuntime.make(AppLayer)`. L'`AppLayer` compose logger + config +
> services une fois pour toutes ; toute exécution passe par ce runtime. Les
> `Effect.runPromise`/`runSync` inline hors des frontières d'exécution
> désignées sont proscrits.**

### Un `AppLayer` par type de processus, un runtime au boot

Le `AppLayer` est la composition de couches (`Layer`) qui décrit **ce dont le
processus a besoin** : un logger configuré, la config lue depuis l'environnement,
les services métier câblés (client du backing service, etc.). Le runtime est
`ManagedRuntime.make(AppLayer)`, instancié **une fois** au point d'entrée :

- **CLI** : à côté de l'amorçage `@effect/cli`, en remplacement du `runMain`
  non-Effect de `cli-toolkit` (cf. E11, [ADR à venir / runner CLI]). Le runtime
  porte `NodeContext.layer` + logger + config.
- **Service HTTP** (`services/crf`) : runtime créé au boot du serveur Hono ;
  `runEffect`/`runEffectRaw` (`services/crf/src/server/effect-handler.ts`)
  exécutent via `runtime.runPromise` au lieu de `Effect.runPromise` global.
- **Serveur SvelteKit** (`apps/*`) : un runtime **serveur** unique, consommé par
  l'adaptateur de frontière unique (cf.
  [ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/)). Effect ne
  franchit jamais le bundle client.

### Les frontières d'exécution sont les seuls lieux de `run`

Un `Effect<A, E>` reste une description (ADR 0005). Le `run` n'a lieu qu'**au
runtime central**, à la frontière du processus : le handler Hono, la commande
CLI, le handler SvelteKit. Le cœur métier (`packages/`) continue de **retourner
l'Effect brut** — règle inchangée. Ce qui change : les consommateurs finaux ne
fabriquent plus leur propre exécution ad hoc, ils délèguent au runtime.

### Late-binding préservé là où 12-factor l'exige

Centraliser config et logger **ne doit pas** figer la lecture d'environnement au
boot là où la relecture runtime est voulue. `find-an-expert` relit
`dynamicEnv.OPENALEX_USER_AGENT` à chaque appel
(`apps/find-an-expert/src/lib/server/citation/index.ts:20-32`) — comportement
12-factor à conserver. L'`AppLayer` expose alors la config via un service qui
**relit** la source dynamique à la demande, pas une valeur capturée à
l'instanciation. Symétriquement, l'`Effect.runSync(AppConfig)` à l'import de
`services/crf/src/server/env.ts:20` est remplacé par une lecture **au boot du
runtime**, pas au chargement du module.

### Alternative écartée : statu quo des runners ad hoc

Garder trois primitives + un wrapper non-Effect répartis sur cinq CLIs et le
service « marche » aujourd'hui, mais interdit structurellement E8/E9 : sans point
d'instanciation unique, il n'existe aucun endroit où brancher un logger ou un
tracer **une fois**. Chaque nouveau processus réinvente son exécution ; la dette
croît avec le dépôt. Écarté.

## Statut

Accepted (2026-06-07). Cadre les écarts **E10** (runtime central),
**E11** (amorçage CLI), **E7** (CrfClient en service) et **E8** (logger/telemetry
partagé) du [plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/)
(Phase 3). Aucun code applicatif n'est livré par cet ADR — il **gouverne** celui
des phases suivantes.

## Conséquences

**Bénéfices.** Un seul lieu d'instanciation par processus : logger, config et
services y sont câblés une fois, ce qui débloque E8 (logger unifié) et E9 (tracing
qui traverse Effect). Les `makeCrfClientLayer`/`makeCliContextLayer` cessent
d'être du code test-only et deviennent des briques de l'`AppLayer`. Les tests
travaillent contre des `Layer` (cf.
[ADR 0049](/atlas/decisions/0049-convention-test-effect/)) plutôt que des mocks
ad hoc.

**Prix à payer.** Migration non triviale (E10 est `L→XL`) : il faut amorcer un
runtime par type de processus et y faire transiter les ~14 `runPromise` isolés de
`researcher-profiles` plus les runners des autres CLIs. Un runtime central mal
conçu risque de **figer la config au boot** là où la relecture runtime est
voulue — d'où le garde-fou 12-factor ci-dessus.

**Garde-fous.**

- **Un runtime par type de processus**, pas un singleton global : CLI, service et
  serveur SvelteKit ont des `AppLayer` distincts (besoins différents :
  `NodeContext` pour les CLIs, pas pour le serveur web).
- **Pas de `runPromise`/`runSync` inline** hors des frontières d'exécution
  désignées (handler, commande, runtime). Garde-fou outillé à prévoir (règle
  d'audit/lint), dans la continuité de
  [ADR 0049](/atlas/decisions/0049-convention-test-effect/).
- **Late-binding de config préservé** pour les apps qui relisent l'env au runtime
  (`find-an-expert`) ; ne pas remplacer une relecture dynamique par une capture
  au boot.
- **Effect hors du bundle client** : le runtime serveur SvelteKit reste
  strictement côté serveur (cf.
  [ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/)).
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
