---
title: 0049 — Convention de test Effect (it.effect, layers partagés, garde-fou)
---

## Contexte

Les tests d'Effect suivent **deux patterns divergents** dans le dépôt :

- **`it.effect`** (`@effect/vitest`) : l'assertion est `yield*` dans
  `Effect.gen`, le runner exécute. Adopté dans ~15 fichiers, surtout
  `citation-fetch` et `citation-validate`
  (`packages/citation-fetch/src/store.test.ts`).
- **`it()` + `Effect.runPromise`/`runPromiseExit` dans le corps** : ~28 fichiers
  exécutent l'Effect à la main et vérifient l'`Exit`/`Either`, en mockant les
  dépendances via `vi.mock` (`cli/citation/src/commands/index.test.ts` empile
  les mocks ; 551+ `vi.mock` dans le dépôt).

Cette divergence a une conséquence prouvée en Phase 0 : le **faux-vert**. Écrire
`it("...", () => Effect.gen(...))` (sans `.effect`) **retourne** un Effect que
vitest n'exécute pas — le test est vert **sans jouer ses assertions** (E1,
corrigé dans `packages/researcher-profiles/src/services/csv.test.ts` au commit
`252427c1`, vérifié par mutation). **Aucune règle de lint ne capte ce
faux-vert** aujourd'hui (`config/shared-config/eslint/scripts.js` n'a pas de règle
Effect dédiée). Le pattern peut donc réapparaître silencieusement.

Côté injection, c'est ad hoc : `provideServiceEffect` + `Ref.make` en ligne dans
quelques fichiers (`citation-validate`), `vi.mock` partout ailleurs.
`crf-client` teste un **vrai** `Layer` (`makeCrfClientLayer`) mais via `it()` +
`Effect.provide` + `runPromise` — pas `it.effect`
(`packages/crf-client/src/client.test.ts:691-707`). **Aucun `TestClock`** : les
tests sensibles au temps (rate-limit, retries, timeouts) tournent en temps réel
ou ne sont pas couverts.

## Décision

> **Les tests qui exécutent un Effect utilisent `it.effect` ; `Effect.runPromise`
> dans le corps d'un test est proscrit. Les dépendances sont fournies par des
> `Layer` de test partagés (un par domaine) plutôt que par des `vi.mock` ou des
> `Ref.make` dupliqués. Le temps des tests sensibles (rate-limit, retries,
> timeouts) est contrôlé par `TestClock`. Un garde-fou outillé interdit le
> faux-vert `it(() => Effect.gen(...))`.**

### `it.effect` partout, pas de `run` dans le corps du test

`it.effect` exécute l'Effect **et** échoue si une assertion `yield*`'ée échoue —
c'est précisément ce que le faux-vert perd. La règle : tout test qui produit un
Effect le décrit dans `it.effect`, sans `Effect.runPromise`/`runPromiseExit` dans
le corps. Les rares cas légitimes hors `it.effect` (setup async non-Effect) sont
l'exception, pas la norme.

### Layers de test partagés, pas de mocks dupliqués

Les dépendances sont fournies par des `Layer` de test réutilisables
(`TestEventsStoreLayer`, un test-layer `CrfClientService`, un layer HttpClient/MSW
dans un `test-utils` Effect), remplaçant les `provideService(Ref…)` recopiés et
les `vi.mock` empilés. C'est l'objet d'E14 ; le `Layer` réel testé par
`crf-client` est le modèle à généraliser.

### `TestClock` pour le temps

Les comportements temporels (rate-limit, `Schedule` de retry, timeouts) se testent
avec `TestClock` (avancement virtuel du temps), pas en temps réel. Cela rend
déterministes des tests aujourd'hui lents ou absents.

### Un garde-fou outillé, sinon régression silencieuse

La convention ne tient que si elle est **outillée** : une règle (lint ou contrôle
d'audit) doit interdire `it(() => Effect.gen(...))` et signaler `Effect.runPromise`
dans un corps de test. Sans cela, le faux-vert d'E1 réapparaîtra — l'audit le note
explicitement comme risque de « régression silencieuse ». Le garde-fou est un
livrable de la convention, pas une option.

### Anti-objectif : ne pas réécrire les tests « par principe »

Le [plan de résorption](/atlas/plans/2026-06-04-socle-effect/) déconseille de
réécrire les tests HTTP boîte-noire du service « par principe » : la couverture
existante peut suffire. La convention s'applique au **nouveau** code et aux tests
touchés ; la migration de l'existant s'arbitre au cas par cas, par valeur, pas par
dogme.

### Alternative écartée : statu quo `runPromise` + `vi.mock` par test

Laisser chaque test exécuter son Effect et mocker à la main « marche » mais
reproduit le faux-vert, duplique le setup, sur-mocke (l'audit le relève comme
risque qualité, `scripts/audit/daily-target.mjs`) et empêche `TestClock`. Écartée.

## Statut

Accepted (2026-06-07). Cadre l'écart **E14** (layers de test partagés +
`TestClock`) et **prolonge E1** (faux-vert) du
[plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/)
(Phase 5). Le garde-fou outillé qu'il mandate s'ajoutera à la
[chaîne de qualité](/atlas/quality/ci-pipeline/). Aucun code applicatif livré ici.

## Conséquences

**Bénéfices.** Les assertions s'exécutent réellement (fin du faux-vert), garanti
par l'outillage. Les dépendances de test sont déclarées une fois par domaine, pas
recopiées. Le temps devient contrôlable : les comportements de retry/rate-limit
sont enfin testables de façon déterministe.

**Prix à payer.** E14 est `XL`/risque élevé : il faut introduire `@effect/vitest`
dans la dizaine de paquets qui testent Effect sans lui (≈14 paquets ont des tests
important `effect`, dont 4 utilisent déjà `@effect/vitest`), concevoir les `Layer`
de test par domaine, et migrer les suites `vi.mock`. La règle de lint dédiée est à
écrire (les presets vitest ne l'imposent pas).

**Garde-fous.**

- **`it.effect` pour tout test exécutant un Effect** ; `runPromise` dans un corps
  de test est un défaut, pas un style.
- **Garde-fou outillé obligatoire** contre `it(() => Effect.gen(...))` — sans lui,
  la convention est déclarative et le faux-vert revient.
- **Layers de test partagés** plutôt que `vi.mock`/`Ref.make` dupliqués ;
  attention au **sur-mocking** signalé par l'audit.
- **Migration de l'existant au cas par cas**, par valeur — pas de réécriture
  « par principe ».
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
