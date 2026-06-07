---
title: 0047 — Stratégie de validation (Effect Schema, zod en cohabitation)
---

## Contexte

Le dépôt valide des données entrantes à deux endroits avec **deux
bibliothèques** :

- **Effect Schema** est le standard côté Effect/services/packages. Référence
  canonique : `crf-project-template` dérive type **et** décodeur d'un seul schéma
  déclaratif, `decodeUnknownEither(ProjectTemplate)` retournant
  `Either<…, ParseError>` (`packages/crf-project-template/src/template.ts:14,22-24`).
  `services/crf` couple Schema à Hono via `S.standardSchemaV1(...)` +
  `hono-openapi` pour valider **et** générer l'OpenAPI d'un même schéma
  (`services/crf/src/server/routes/records.ts`, huit appels couvrant cinq
  schémas).
- **zod** est utilisé dans deux apps SvelteKit, `amarre` et `find-an-expert`,
  pour les types d'API et la validation
  (`apps/amarre/src/lib/types/api/zod-openapi.ts`, `zod ^4.4.3` ;
  `apps/find-an-expert/src/lib/server/user/types.ts`). `amarre` génère son
  OpenAPI **client** via `@asteasolutions/zod-to-openapi`, indépendamment du
  serveur.

Les deux mondes vivent en silos : **aucun pont** zod↔Schema n'existe
aujourd'hui. `S.standardSchemaV1` est utilisé comme détail d'intégration Hono, pas
comme passerelle. La reconnaissance note aussi que les apps **n'utilisent pas
superforms** (contrairement à l'attendu), mais que zod est ancré dans leurs
patterns d'inférence (`z.infer`, `.strict()`).

Deux risques structurels en découlent : la **double génération OpenAPI** (zod côté
client `amarre`, Schema côté serveur `crf`) sans source unique — les types client
peuvent diverger du serveur ; et un **trou de validation**, le `as T` non vérifié
de `fetch-one-api-page` (`packages/fetch-one-api-page/src/index.ts:87`), qui sera
traité par E13.

## Décision

> **Effect Schema est la bibliothèque de validation de référence partout où
> Effect est présent : packages métier, services, code serveur. Un schéma est la
> source unique du type, du décodeur (`decodeUnknownEither → ParseError`) et,
> côté HTTP, du document OpenAPI (`S.standardSchemaV1` + `hono-openapi`). zod
> reste autorisé dans les apps SvelteKit en cohabitation, sans pont imposé à ce
> stade.**

### Schema = source unique (type + décodeur + OpenAPI)

Le pattern de `crf-project-template` est le canon : on **n'écrit pas** un type
TypeScript puis un validateur séparé, on écrit un `Schema` d'où dérivent le type
(`typeof S.Type`), le décodeur non-throwing (`decodeUnknownEither`) et le
prédicat. À la frontière HTTP des services, `S.standardSchemaV1(schema)` alimente
`hono-openapi` : **un seul schéma** valide les requêtes **et** documente l'API.
C'est aussi le socle d'E12 (Schema-as-brand dans `crf-core`) et d'E13 (décoder
les réponses externes au lieu du `as T`).

### zod toléré dans les apps, sans pont forcé

Migrer `amarre`/`find-an-expert` vers Schema **maintenant** n'est pas justifié :
zod y est ancré dans l'inférence et la génération OpenAPI client, et ces apps ne
tirent pas `effect` côté client (contrainte de bundle,
[ADR 0046](/atlas/decisions/0046-frontiere-effect-sveltekit/)). On **tolère** donc
zod dans la couche app. La cohabitation est possible parce que les deux respectent
l'interface **standard-schema** : si un besoin d'interop apparaît (valider un
schéma zod côté Effect, ou l'inverse), il passera par `@standard-schema/spec`,
**pas** par une réécriture. Tant que ce besoin n'existe pas, on n'ajoute pas la
dépendance.

### Anti-objectif : pas de migration zod→Schema « par principe »

Conformément à la posture anti-sur-ingénierie de l'audit, on ne réécrit pas la
validation des apps sans bénéfice mesurable. La règle vaut **par défaut** : tout
**nouveau** code serveur/packages utilise Schema ; le code app **existant** en
zod n'est pas migré tant qu'il rend service.

### Alternative écartée : unifier tout sur Schema dès maintenant

Retirer zod des apps unifierait la stack mais imposerait de réécrire l'inférence
de types et la génération OpenAPI client, casserait l'autonomie des apps, et
risquerait d'entraîner `effect` vers le client. Coût élevé, bénéfice différé.
Écartée à ce stade ; reconsidérée si la divergence client/serveur des contrats
OpenAPI devient un problème réel.

## Statut

Accepted (2026-06-07). Cadre la **stratégie de validation** d'E3 et prépare
**E12** (Schema-as-brand) et **E13** (décodage des réponses externes) du
[plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/)
(Phase 5). Aucun code applicatif livré ici.

## Conséquences

**Bénéfices.** Une règle claire : Schema partout où Effect vit, source unique
type+décodeur+OpenAPI côté serveur. La validation non-throwing (`ParseError`
typé) compose avec les pipelines Effect et les tests. zod n'est pas interdit, donc
pas de réécriture forcée des apps.

**Prix à payer.** La double génération OpenAPI (zod client / Schema serveur)
persiste : les contrats client et serveur peuvent diverger tant qu'aucune source
unique n'est imposée. Deux bibliothèques de validation cohabitent dans le dépôt,
avec la charge cognitive associée.

**Garde-fous.**

- **Tout nouveau code serveur/packages valide via Schema**, pas zod.
- **Pas de `as T` non vérifié** sur des données externes : un `Schema` décode et
  porte le `ParseError` (E13). Le `as T` de `fetch-one-api-page` est une dette
  tracée, pas un précédent.
- **Interop zod↔Schema uniquement via standard-schema** si le besoin émerge — pas
  de pont maison, pas de dépendance ajoutée « au cas où ».
- **Surveiller la divergence des contrats OpenAPI** client/serveur ; si elle
  mord, rouvrir cet ADR pour une source unique.
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
