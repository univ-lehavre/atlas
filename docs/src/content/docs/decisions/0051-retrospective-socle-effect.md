---
title: 0051 — Rétrospective du chantier socle Effect (E1–E14)
---

## Contexte

Ce document **trace** le chantier de résorption du socle Effect mené sur la
branche `effect/socle` (une seule grosse PR), du
[plan du 2026-06-04](/atlas/plans/2026-06-04-socle-effect/) à sa réalisation. Il
n'introduit pas de décision nouvelle : c'est un ADR **rétrospectif** qui acte
_ce qui a été fait_, _les écueils rencontrés_ et _les choix de mise en œuvre_
là où la réalité a divergé du plan — pour que la prochaine campagne parte du
réel, pas de l'intention.

Le plan découpait les **14 écarts** de l'[audit Effect](/atlas/audit/2026-06-04-effect-socle/)
en 6 phases (0 à 5). Les décisions structurantes ont été actées en **ADR de
cadrage AVANT** le code qu'elles gouvernent ([0045](/atlas/decisions/0045-runtime-central-effect/)
runtime central, [0046](/atlas/decisions/0046-frontiere-effect-sveltekit/) frontière
SvelteKit, [0047](/atlas/decisions/0047-strategie-validation-schema-zod/) Schema vs zod,
[0048](/atlas/decisions/0048-modele-erreur-http/) modèle d'erreur HTTP,
[0049](/atlas/decisions/0049-convention-test-effect/) convention de test,
[0050](/atlas/decisions/0050-limite-knip-peer-deps/) limite knip/peer-deps).

## Ce qui a été fait

Synthèse phase par phase (référence de commit entre crochets).

- **Phase 0 — Hygiène & faux verts** (E1, E2, E4). Faux-vert `csv.test.ts`
  corrigé et vérifié par mutation [252427c1] ; patterns `RECORD_ID` alignés et
  record-id mort retiré [279d93f6] ; phantom-deps `@effect/*` (cluster/rpc/sql)
  retirées [bf1c78bb].
- **Phase 1 — Décisions de cadrage** (E3). Les six ADR 0045–0050 [3621779b].
- **Phase 2 — Frontière étanche** (E6, E5). Adaptateur `sveltekit-handler`
  Effect→SvelteKit préservant les erreurs typées [e3672720] ; knip durci contre
  les phantoms masqués par peerDependency [fc157173].
- **Phase 3 — Runtime & injection** (E10, E11, E7, E8). Socle d'exécution
  partagé (runtime central + logger) [0a425ad8] ; service CRF exécuté sur
  runtime central, client injecté [7a77274f] ; CLIs unifiées sur un runner
  unique [e752a31e] ; serveur find-an-expert sur runtime Effect central
  [000cd6bd].
- **Phase 4 — Observabilité** (E9). Pont OpenTelemetry↔Effect, tracing métier du
  client REDCap [6c4ac35e].
- **Phase 5 — Validation & tests unifiés** (E12, E13, E14). Schema-as-brand
  dans `crf-core` [0545fbf1] ; décodage des réponses externes via Schema
  [c2955369] ; package `test-utils-effect` + garde-fou lint anti-faux-vert
  [d0f68cdc] ; service `FetchOnePage` injecté [92d8ecb3] ; migration `it.effect`
  des tests Effect restants [49875d8e].

Les 14 écarts sont traités. Aucun bypass de hook git n'a été utilisé ; chaque
commit passe `ci:checks` + `ci:audit`.

## Écueils rencontrés

Les pièges qui ont coûté du temps ou changé une décision — à connaître pour la
suite.

### Outillage & CI

- **Course d'ordre de build dans turbo (pre-commit).** Après chaque
  `pnpm install` (cache turbo invalidé), le hook `pre-commit` a parfois échoué
  sur un `build`/`typecheck` à froid : un paquet aval lançait son `DTS`/`tsc`
  avant que le `.d.ts` d'un paquet amont (`errors`→`validators`, `baas`→`auth`)
  ne soit visible. **Symptôme** : `TS2307 Cannot find module '@univ-lehavre/atlas-…'`
  alors que `ci:checks` passe. **Parade** : « réchauffer » le build du paquet
  amont (`pnpm --filter <amont> run build`) puis relancer le commit. Ce n'est
  pas un défaut du code committé.
- **`commitlint` strict.** `subject-case` impose un sujet **bas-de-casse** :
  « Effect », « ADR », « CLI », « OpenAlex », « Schema », « E13 » en tête de
  sujet sont rejetés. `scope-enum` n'accepte que les scopes déclarés : `fetch`
  n'existe pas, c'est `fetch-one-api-page`. Plusieurs commits ont dû être
  reformulés.
- **`audit:structure`.** Un nouveau paquet dans `packages/` doit être
  publiable (pas de `private: true`) **ou** inscrit dans
  `PRIVATE_INTERNAL_ALLOWED` avec justification ; `test-utils-effect` (helper de
  test interne, jamais publié) y a été ajouté comme `test-utils-sveltekit`.
- **`packages-map` & couverture.** Toute modification de dépendances exige
  `pnpm docs:generate` (sinon `docs:generate:check` bloque). Et un seuil de
  **couverture par branches** peut tomber sous le plancher quand on **retire**
  du code couvert (E13 a retiré `isValidAPIResponse`, faisant passer
  citation-fetch de 90 % à 88,46 % de branches) : il a fallu un test ciblé du
  fallback `apiURL` pour repasser au-dessus.

### Effect — pièges de conception

- **E9 — `@effect/opentelemetry` n'enregistre pas le provider global.**
  `NodeSdk.layer` ne pose pas le provider global qu'attend `@hono/otel`. Solution
  retenue : conserver le `NodeSDK` brut (enregistrement global) **et**
  `Tracer.layerGlobal` qui ponte Effect vers ce **même** provider global — un
  seul provider, pas de double SDK.
- **E13 — décoder casse un contrat de test silencieux.** En remplaçant le `as T`
  par `Schema.decodeUnknownEither`, un court-circuit `instanceof
ResponseParseError` a brièvement rompu le contrat « content-type non-JSON »
  (le test attend le message externe enveloppé avec `cause.message = texte`). La
  parade : laisser l'enveloppe `catch` **inconditionnelle**, sans court-circuit.
- **E13 — fileter le `Schema` sans coupler `fetch-one-api-page` à OpenAlex.** Le
  schéma de réponse est dérivé du schéma d'item **chez l'appelant** et fileté à
  travers `makeRateLimitedFetcher → apiResponseSchema → fetchOnePage` ; la couche
  basse reste agnostique du domaine.
- **E14 — le canal `R` se propage jusqu'aux racines.** Transformer `fetchOnePage`
  en service `Context.Tag` ajoute `FetchOnePage` au canal `R` de **tous** les
  consommateurs, en cascade jusqu'aux signatures publiques (`searchAuthorsByName`,
  `fetchAPI`, …) puis aux **racines de composition** (CLIs, handler SvelteKit,
  frontières de lib) qui doivent fournir `FetchOnePageLive`. Le compilateur guide
  la cascade : on suit les `TS2322 … 'FetchOnePage' is not assignable to 'never'`
  un fichier à la fois. Piège associé : un alias `CitationEffect<A>` de
  find-an-expert inférait `E` via `extends Effect.Effect<unknown, infer E>` (2
  paramètres) — il a fallu `infer _R` (3 paramètres) pour tolérer le nouveau
  canal et ne pas dégénérer en `never`.
- **E14 — `vi.mock` au runtime casse quand la source importe une nouvelle
  valeur.** Dès que la source provient à fournir `FetchOnePageLive` importé de
  `citation-fetch`, les tests qui `vi.mock`-aient ce paquet plantent (« No
  "FetchOnePageLive" export »). Parade : ajouter `FetchOnePageLive: Layer.empty`
  à la fabrique du mock (les wrappers étant déjà mockés, la fabrique réelle ne
  tourne jamais).
- **`RateLimiter` en temps réel sous `it.effect` = timeout.** Un test
  paginant 2 pages avec `RateLimiter` (limite 1/s) **bloque** 5 s puis échoue
  sous le faux-temps d'`it.effect`. La parade idiomatique (ADR 0049) : `TestClock`
  — `Effect.fork` du fetch puis `TestClock.adjust("2 seconds")` libère le jeton,
  sans attente réelle.

## Choix de mise en œuvre

Les décisions de réalisation, surtout là où elles **affinent** ou **dévient** du
plan.

- **E12 — zéro-rupture sur le type d'erreur.** `makeStringBrand` dérive
  type+pattern+prédicat+décodeur+constructeur d'un seul `Schema`. Le type
  d'erreur de marque change (`BrandErrors`→`ParseError`) mais **aucun
  consommateur ne l'inspecte** ; les 18 exports nommés sont préservés (sur-
  ensemble). La migration est donc transparente.
- **E13 — schéma source unique + ré-exports de compat** (choix utilisateur,
  zéro-rupture) ; `fetchOnePage(…, schema)` générique, schémas OpenAlex **chez
  l'appelant**.
- **E14 — service `FetchOnePage` fourni à la frontière, pas au sommet.** Plutôt
  que de propager `FetchOnePage` jusqu'au tout dernier `runMain`, le `Live` entre
  à la **frontière de chaque lib/CLI/handler** (researcher-profiles,
  citation-validate, citation-cli, researcher-profiles-cli, find-an-expert). Les
  signatures publiques de ces wrappers restent `R = never` ; seuls les tests de
  `citation-fetch` (qui appellent les fonctions de bas niveau) injectent un
  `Layer` de test. `citation-fetch` **ré-exporte** `FetchOnePage`/`FetchOnePageLive`
  pour que les consommateurs fournissent le `Layer` sans dépendre du paquet bas
  niveau.
- **E14 — `test-utils-effect`, source-only.** Le paquet n'est ni buildé ni
  publié (`main`/`types`→`src`), consommé uniquement par les tests. Il expose
  `TestLoggerLayer` (ré-export du logger silencieux du socle, E8),
  `recordingLayer(tag, impl)` et `makeRecorder()` — un double de service qui
  enregistre chaque appel et se fournit en `Layer`, **remplaçant layer-natif** de
  `vi.mocked(fn).mock.calls`.
- **E14 — garde-fou outillé, pas déclaratif.** Le faux-vert est interdit par une
  règle `no-restricted-syntax` (override vitest de `shared-config`) qui ne vise
  que les `it`/`test`/`fit`/`xit` **nus** à corps-expression `Effect.*` ;
  `it.effect(() => Effect.gen(...))` et les fabriques `vi.fn(() =>
Effect.succeed(...))` ne sont pas touchés. Aucun faux-vert existant dans le
  dépôt — la règle est **préventive**.
- **E14 — migration des tests « par valeur », pas par dogme** (ADR 0049). Tout
  test exécutant un Effect de domaine passe à `it.effect`. Mais **n'ont pas** été
  transformés en services / `it.effect`, faute de valeur :
  - **DuckDB** (`citation/db`) : module **sans consommateur prod** ; `connect`/`run`
    prennent déjà leur dépendance en argument. Seul `DuckDBInstance.create` est
    mocké. → `vi.mock` conservé, test passé en `it.effect`.
  - **DocumentExtractor** (`researcher-profiles/file-extractor`) : `extractText`
    est déjà injectable **chez le consommateur** (match-row mocke `extractText`,
    pas les 5 libs de parsing) ; ces libs ne sont mockées que dans son **propre**
    test de dispatch — frontière légitime. → pas de service, test en `it.effect`.
  - **`net/diagnostics.spec.ts`** : mocke `node:dns/net/tls` avec un timing par
    callbacks ; conversion risquée pour gain nul. Laissé en `async it`.
  - **`sveltekit-handler/effect.test.ts`** et **les tests CLI `runEffectCli`** :
    le handler / runner renvoie une **`Promise`**, pas un Effect de domaine —
    `async it` est correct ; l'envelopper dans `Effect.promise` serait de la
    cérémonie sans bénéfice.

## Statut

Accepted (2026-06-07). Rétrospectif : trace le chantier **socle Effect (E1–E14)**
réalisé sur la branche `effect/socle` (commits `252427c1`…`49875d8e`). Ne
remplace ni ne modifie les ADR 0045–0050 ; il les complète par le **réel** de la
mise en œuvre.

## Conséquences

**Bénéfices.** Le socle Effect est unifié : runtime central, frontières
étanches, erreurs typées préservées, validation par `Schema`, observabilité de
bout en bout, et une convention de test **outillée** (fin du faux-vert garantie
par lint). Les dépendances externes critiques (réseau via `FetchOnePage`) sont
injectées et testables par `Layer`, sans `vi.mock` ni temps réel (`TestClock`).

**Prix payé.** La transformation `R`-channel d'un service touche en cascade tous
ses consommateurs jusqu'aux racines ; c'est mécanique mais large. La migration
des tests s'est faite **par valeur** : tout n'est pas devenu service, et c'est
délibéré — sur-mocker ou sur-servicer aurait coûté sans bénéfice (l'audit
le signalait comme risque qualité).

**À surveiller.**

- La course d'ordre de build turbo peut refaire échouer un `pre-commit` à froid
  après un `pnpm install` ; réchauffer le paquet amont, ne **jamais** bypasser le
  hook.
- Le garde-fou anti-faux-vert ne couvre que le pattern `it(() => Effect.xxx)` ;
  d'autres formes de faux-vert (assertions jamais atteintes) restent du ressort
  de la revue.
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
