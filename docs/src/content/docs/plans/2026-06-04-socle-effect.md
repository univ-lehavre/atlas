---
title: Plan de résorption — socle Effect 2026-06-04
---

> Date du plan : 2026-06-04. Audit de référence : [Audit de l'intégration Effect 2026-06-04](/atlas/audit/2026-06-04-effect-socle/). Écarts E1–E14 tracés en issues GitHub (milestone _Transverse — Socle Effect_).

## Introduction

### Objectif

Faire passer `atlas` de **« Effect comme langage de description du métier »** à
**« Effect comme socle d'exécution »** : un runtime central par type de
processus, l'injection par `Layer`, la propagation de contexte
(logger/config/tracer), une télémétrie qui **traverse Effect**, et une validation
unifiée par `Schema`. Le tout **sans sur-corriger** : l'audit a explicitement
dégonflé plusieurs « écarts » et déconseillé certaines migrations (voir
_Anti-objectifs_).

### Périmètre

- Les **14 écarts** de l'audit Effect du 2026-06-04 (E1–E14), regroupés en
  6 phases ordonnées du moins risqué au plus structurant.
- **Hors périmètre** : la migration de `atlas-errors` vers `Data.TaggedError`
  (l'audit la déconseille — gain nul, coût élevé) ; le franchissement de la
  frontière serveur par Effect côté apps (contrainte bundle, [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/)).
- **Non bloquant en l'état** : aucun écart ne casse l'usage actuel. La plupart
  sont des **dettes latentes** (le tracer no-op « ne perd rien » tant qu'aucun
  `withSpan` n'existe). Le plan cadre une **montée en maturité**, pas une
  réparation d'urgence.

### Principes directeurs

- **Non-régression** : à chaque étape, `pnpm ci:checks && pnpm ci:audit && pnpm docs:build` reste vert.
- **Décisions d'abord** : les choix structurants (runtime central, frontière SvelteKit, Schema vs zod, convention de test) sont **actés en ADR AVANT** d'écrire le code qu'ils gouvernent (Phase 1).
- **Le runtime avant ce qui en dépend** : E7/E8/E9 dépendent du runtime central (E10) ; ne pas les attaquer avant.
- **Anti-sur-ingénierie** : on suit les garde-fous de l'audit (ne pas migrer `atlas-errors`, ne pas migrer les tests du service « par principe », aligner les patterns avant d'unifier Schema).
- **Idempotence** : relancer une étape déjà faite est un no-op observable (vérifier l'état cible avant d'écrire).
- **Une PR par phase** (sauf découpage explicite des phases volumineuses).
- **Commits** : Conventional Commits, scope ∈ allowed-scopes de `commitlint.config.js` (vérifier avant chaque commit : `grep -A 200 'scope-enum' commitlint.config.js`). **Pas de `Co-Authored-By`**.
- **Hooks lefthook JAMAIS bypassés** : pas de `--no-verify`, `LEFTHOOK=0`, `--no-gpg-sign`. Un hook qui bloque se résout à la racine.

### Anti-objectifs (déconseillés par l'audit)

- **Ne pas migrer `atlas-errors` vers `Data.TaggedError`** : imposerait `effect`
  à `auth`/`baas`/`sveltekit-handler` (qui ne l'embarquent pas) pour un gain de
  discrimination nul. Le vrai écart est la **couture** (E6), pas le modèle.
- **Ne pas faire entrer Effect dans le bundle client** : le runtime serveur des
  apps reste strictement côté serveur.
- **Ne pas réécrire les tests HTTP du service « par principe »** : la couverture
  boîte-noire actuelle peut suffire ; arbitrer au cas par cas.

### Vue d'ensemble des phases

| Phase | Titre                         | Écarts           | Décision structurante                        | Risque | Effort |
| ----- | ----------------------------- | ---------------- | -------------------------------------------- | ------ | ------ |
| 0     | Hygiène & faux verts          | E1, E2, E4       | Non                                          | faible | S      |
| 1     | Décisions de cadrage (ADR)    | E3               | **Oui** (runtime, frontières, Schema, tests) | nul    | S      |
| 2     | Frontière étanche             | E6, E5           | Cadré par Phase 1                            | moyen  | M      |
| 3     | Runtime & injection           | E10, E11, E7, E8 | Cadré par Phase 1                            | moyen  | L→XL   |
| 4     | Observabilité de bout en bout | E9               | Non                                          | moyen  | L      |
| 5     | Validation & tests unifiés    | E12, E13, E14    | Cadré par Phase 1                            | élevé  | L→XL   |

---

## Phase 0 — Hygiène & faux verts

**But** : éliminer trois dettes sûres, indépendantes, sans prérequis. Restaure la
confiance dans la suite de tests et l'arbre de dépendances avant tout chantier
structurant.

- **E1 — Faux vert `csv.test.ts`** : 3 tests `it(() => Effect.gen(…))` retournent
  un Effect jamais exécuté (verts sans assertion). Convertir en `it.effect`,
  vérifier qu'une assertion fausse casse désormais le test.
- **E2 — Divergence de patterns** : aligner `RECORD_ID_PATTERN` et
  `CRF_NAME_PATTERN` entre `crf-core` et `services/crf` (le `RecordIdSchema`
  service est code mort — soit le brancher, soit le retirer). **Prérequis de E12.**
- **E4 — Phantom deps `@effect/*`** : retirer `cluster`/`rpc`/`sql` (0 import) de
  `cli/net`,`cli/crf`,`cli/biblio` et `experimental`/`platform-node` de
  `citation` ; nettoyer leur `ignoreDependencies` dans `knip.json`.

**Sortie** : suite de tests fiable, `package.json` sans deps fantômes, patterns
alignés. Aucune décision requise.

## Phase 1 — Décisions de cadrage (ADR)

**But** : trancher les choix structurants **avant** tout code. C'est E3 éclaté en
ADR. Chaque ADR référence l'audit et [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/) comme socle.

ADR à rédiger (numéros à attribuer à l'exécution) :

1. **Runtime central Effect** — `ManagedRuntime` + `AppLayer` par type de
   processus ; frontière d'exécution unique ; interdiction des `runPromise`
   inline hors frontières désignées. _Alternative écartée : statu quo des runners
   ad hoc._
2. **Frontière Effect côté apps SvelteKit** — arrêt strict au handler
   (`+server.ts`/`load`/`actions`) via un adaptateur unique, `lib/server/*`
   retournant l'Effect brut. _Alternative : `runPromise` dispersé dans
   `lib/server/*` (pratique actuelle)._ Inclut le maintien d'Effect **hors du
   bundle client**.
3. **Stratégie de validation** — `Schema` standard côté Effect/services/packages ;
   statut de zod dans les apps (cohabitation via standard-schema vs migration).
4. **Modèle d'erreur HTTP** — **conserver** `atlas-errors` à la frontière
   SvelteKit/BaaS + **adaptateur de couture** (E6) ; ne **pas** migrer vers
   `TaggedError`. _Décision déjà recommandée par l'audit — l'ADR la fige._
5. **Convention de test Effect** — `it.effect` unique, bannissement de
   `runPromise` dans le corps des tests, layers de test partagés ; + garde-fou
   outillé (règle d'audit/lint).
6. **Limite de l'audit knip** — acter que `audit:unused` ne couvre pas les deps
   masquées par peerDependency (prépare E5).

**Sortie** : 4 à 6 ADR `Accepted`. Aucun code applicatif.

## Phase 2 — Frontière étanche

**But** : colmater la perte du canal d'erreur typé à la frontière SvelteKit
**sans** toucher au runtime. Indépendant de la Phase 3.

- **E6 — Adaptateur Effect↔SvelteKit** : dans `packages/sveltekit-handler`, un
  symétrique de `runEffect` du service : `catchAll(tag → {body,status})` **avant**
  `runPromise`, pour mapper les `TaggedError` vers leur statut au lieu de
  l'aplatissement `FiberFailure → 500` opaque (constaté sur une panne amont
  OpenAlex). Cadré par l'ADR « modèle d'erreur HTTP » (Phase 1).
- **E5 — Durcir knip** : documenter le faux-négatif peer-deps et ajouter une
  règle/contrôle dédié pour que les phantoms `@effect/*` soient détectables.

**Sortie** : les erreurs typées remontent en statut HTTP correct ; `audit:unused`
ne se fait plus berner par les peer-deps.

## Phase 3 — Runtime & injection

**But** : la pièce maîtresse — passer « Effect comme socle ». Volumineuse :
**découpée en sous-PR**.

- **E10 — Runtime central** (`ManagedRuntime.make(AppLayer)`) par type de
  processus : un pour les CLIs (via `cli-toolkit`), un pour `services/crf`
  (runtime au boot, `runEffect` via `runtime.runPromise`), un runtime **serveur**
  pour les apps SvelteKit. Le `AppLayer` expose logger + config + services câblés
  **une fois**. **Garde-fou 12-factor** : ne pas figer au boot la config là où la
  relecture runtime est voulue (`find-an-expert`).
- **E11 — Amorçage CLI unifié** : remplacer le `runMain` non-Effect de
  `cli-toolkit` par un runner Effect ; migrer les ~14 `runPromise` isolés de
  `researcher-profiles` et les runners ad hoc de `net`/`citation`/`biblio`.
- **E7 — `CrfClient` en service Effect** : monter `makeCrfClientLayer` (déjà
  écrit, inutilisé) dans `services/crf`, routes dépendant de `CrfClientService`.
  Gain = injectabilité/test idiomatique (pas gestion de scope).
- **E8 — Layer logger/telemetry partagé** : remplacer les `quiet`/
  `withMinimumLogLevel(None)` re-appliqués par un logger configuré une fois au
  runtime.

**Sortie** : un runtime par processus, services injectés par `Layer`, logger
unifié. Prérequis de la Phase 4.

## Phase 4 — Observabilité de bout en bout

**But** : répondre à l'intention initiale — que le **tracing traverse Effect**.
Dépend du runtime tracé (Phase 3).

- **E9 — Pont OTel↔Effect** : ajouter `@effect/opentelemetry` (compat vérifiée :
  `effect 3.21.2` / peer `^3.21.0`) ; remplacer le `NodeSDK` brut de
  `telemetry.ts` par `NodeSdk.layer` **en conservant l'opt-in** (`Layer.empty`
  quand la télémétrie est désactivée) ; exécuter via le runtime tracé ;
  instrumenter `Effect.withSpan` le client REDCap (`makeRequest`, retries,
  détection de version, ops publiques). **Vérifier le double SDK** avec l'OTel
  transitif de `@sentry/sveltekit`.

**Sortie** : spans métier corrélés aux spans HTTP ; visibilité sur les appels
REDCap et leurs retries. L'écart « Observabilité » des normes se durcit.

## Phase 5 — Validation & tests unifiés

**But** : la plus structurante et la plus risquée — à dérouler **en dernier** sur
un socle stabilisé.

- **E12 — Schema-as-brand dans `crf-core`** : source unique
  `Schema.String.pipe(pattern, brand)` dérivant type + décodeur `Either` +
  prédicat + pattern OpenAPI ; supprimer la triple redondance brands/patterns/
  validators ; `services/crf/schemas.ts` devient un ré-export. **Prérequis : E2
  (patterns alignés).**
- **E13 — Décoder les réponses externes** : remplacer le `as T` de
  `fetch-one-api-page` par un `Schema<T>` décodé ; `ResponseParseError` portant le
  `ParseError` ; schémas Author/Work.
- **E14 — Layers de test partagés** : `TestEventsStoreLayer`, CrfClient
  test-layer, HttpClient/MSW layer dans un test-utils Effect, remplaçant les
  `provideService(Ref)` dupliqués et les `vi.mock` ; introduire `TestClock` pour
  rate-limit/retries/timeouts (aujourd'hui testés en temps réel ou pas du tout).

**Sortie** : validation unifiée, réponses externes décodées, tests déterministes
sur le temps. Fin du plan.

---

## Fin de plan

Le plan se termine quand E1–E14 sont résolus (PR mergée, ou décision documentée de
non-action via ADR), et que la ligne « Programmation fonctionnelle » de
[Normes](/atlas/quality/normes/) reflète le socle atteint. Un audit Effect
ultérieur (cadence trimestrielle, [ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/))
réévaluera le positionnement sur l'échelle.
