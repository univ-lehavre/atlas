---
title: "0037 — Retrait de la référence API générée (TypeDoc)"
---

## Contexte

La [migration vers Astro Starlight](/atlas/decisions/0036-migration-vitepress-astro-starlight/)
intégrait une **référence API** générée par **TypeDoc** (plugin markdown),
rendue dans une section `/api/**` du site. L'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
en faisait l'un des piliers du volet « expert », et l'[ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/)
l'admettait comme **exception assumée** à la règle du français (contenu dérivé
du code, donc en anglais).

À l'usage, cette couche s'est révélée **coûteuse pour une valeur faible** :

- **Volume disproportionné.** TypeDoc produisait ~1 000 pages — l'essentiel du
  site — pour un contenu que l'éditeur expose déjà : les signatures sont lues
  directement dans le code via la JSDoc, et chaque README de paquet documente
  son interface publique.
- **Liens internes fragiles.** TypeDoc lie ses pages par des chemins relatifs et
  une casse d'origine (`interfaces/AuthService`), alors qu'Astro slugifie et sert
  les routes avec un slash final. Réconcilier les deux demandait un
  post-traitement non trivial (réécriture en liens absolus, conservation du `@`
  de scope, filet de rattrapage des collisions de casse `Index`/`index`) — une
  mécanique à maintenir à chaque évolution de TypeDoc ou d'Astro.
- **Bénéfice marginal.** Le public expert entre par la
  [carte des paquets](/atlas/architecture/packages/) et
  [« Comprendre le code »](/atlas/architecture/comprendre-le-code/), puis lit le
  code lui-même. La référence générée n'apportait pas de niveau de compréhension
  que ces points d'entrée, la JSDoc et les README ne couvrent déjà.

## Décision

**Retirer la référence API TypeDoc** du dépôt et du site :

- suppression de la dépendance `typedoc` + `typedoc-plugin-markdown`, du bloc
  `typedocOptions`, des scripts `docs:api`/`docs:api:check` et de leur
  post-traitement (`api-index-banner.mjs`, `check-api-entrypoints.mjs`) ;
- retrait de la collection de contenu `api`, de la route `/api/[...slug]` et de
  l'entrée « Référence API » de la navigation ;
- les **signatures publiques** restent documentées par les **README de paquets**
  et la **JSDoc** lue dans le code.

En remplacement de la vérification qu'apportait la couche générée, on installe
**`starlight-links-validator`** : le build (donc la CI) **échoue** si un lien
interne pointe vers une route inexistante. C'est l'anti-régression qui manquait
et qui avait laissé passer des centaines de liens morts après la migration.

Cet ADR **amende** les ADR [0028](/atlas/decisions/0028-documentation-verifiable/),
[0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) et
[0036](/atlas/decisions/0036-migration-vitepress-astro-starlight/) sur le seul
point de la référence API générée ; le reste de ces décisions (documentation
vérifiable, public non-expert en français, socle Astro Starlight) demeure en
vigueur.

## Statut

Accepted.

## Conséquences

**Bénéfices.**

- Doc nettement plus légère (~110 pages au lieu de ~1 130), build plus rapide,
  plus de build workspace préalable en CI (TypeDoc lisait les `.d.ts`).
- Plus aucune zone anglaise générée : la doc redevient **entièrement
  française**, conforme à l'[ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/)
  sans exception.
- Une seule source pour les signatures (JSDoc + README), donc pas de dérive
  possible entre une référence générée et le code.
- Validation des liens internes au build : la dérive est désormais **bloquante**.

**Prix à payer.**

- Plus de page unique centralisant toutes les signatures exportées : l'expert
  lit le code (JSDoc) ou le README du paquet concerné.
- La « complétude » de l'interface publique repose sur la rigueur des README et
  de la JSDoc, non sur une extraction automatique.

**Garde-fous.**

- `starlight-links-validator` exclut les routes sur-mesure `/atlas/packages/**`
  (README de paquets servis par une route dynamique que le validateur ne sait
  pas introspecter) et tolère les URL `http://localhost:<port>` des bancs
  d'essai ; il valide **strictement** tout le reste.
