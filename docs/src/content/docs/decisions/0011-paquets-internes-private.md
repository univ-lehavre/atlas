---
title: "0011 — Paquets internes marqués `private`"
---

## Contexte

Le monorepo publie sur npm la plupart de ses `packages/*` et `cli/*`
sous l'organisation `@univ-lehavre`. Certains paquets, en revanche,
n'ont de sens **qu'au sein du monorepo** et ne doivent pas être
publiables :

- Toutes les **`apps/*`** : les applications SvelteKit sont déployées
  séparément (Appwrite Sites), pas distribuées sur npm. Publier
  l'app comme paquet ne servirait à rien et fuirait potentiellement
  des URLs internes.
- Toutes les **`sandbox/*`** : bancs d'essai par construction, code
  expérimental, dépendances docker non transposables.
- Quelques **helpers internes** (`ui/atlas-ui`, `packages/test-utils-sveltekit`)
  qui n'ont de sens que dans le contexte atlas et dont la publication
  n'est pas envisagée pour le moment.

Sans précaution, un `pnpm changeset publish` ou un script de release
mal configuré peut publier accidentellement un de ces paquets sur npm,
avec des conséquences allant du bruit (paquet inutile sur le registre) à
la fuite d'information (URLs internes, code expérimental exposé).

## Décision

Les paquets suivants ont `"private": true` dans leur `package.json` :

- **apps/** (toutes) : `atlas-dashboard`, `crf-dashboard`, `amarre`, `ecrin`, `find-an-expert`, `sillage`.
- **sandbox/** (toutes) : `amarre-sandbox`, `crf-sandbox`, `crf-sandbox-core`, `sillage-sandbox`.
- **ui/atlas-ui** : bibliothèque de composants Svelte interne, déclare `svelte` en `peerDependencies` par anticipation d'une éventuelle future publication, mais aujourd'hui non publié.
- **packages/test-utils-sveltekit** : helpers de test (`createRouteEvent`, `assertNoXss`) spécifiques aux endpoints SvelteKit du monorepo, créés en Phase 4 du plan de résorption 2026-05-30.

Tous les autres paquets (`packages/*`, `cli/*`, `services/*`, `config/*`,
`assets/*`) sont **publiables** : ne pas avoir `private: true`.

### Enforcement

`scripts/audit/workspace-structure.mjs` (Phase 6.2) vérifie pour chaque
paquet :

- si dans `apps/` ou `sandbox/` ou dans `PRIVATE_INTERNAL_ALLOWED` :
  doit avoir `"private": true` ;
- sinon : doit **pas** avoir `"private": true` (sinon une erreur explicite
  invite à ajouter le nom à `PRIVATE_INTERNAL_ALLOWED` avec une
  justification).

## Statut

Accepted (2026-05-22). Révisé 2026-05-31.

## Évolution

- **2026-05-22 (initial).** Trois paquets ciblés : `apps/atlas-dashboard`,
  `apps/crf-dashboard`, `sandbox/crf-sandbox`.
- **2026-05-31 (Phase 6.3 du plan de résorption).** La règle s'étend à
  toutes les apps et toutes les sandboxes (les apps « déployées »
  `amarre`, `ecrin`, `find-an-expert` étaient sans `private: true`
  initialement, mais leur publication n'a jamais été utile —
  changesets continue de bumper leur version pour le suivi sans tenter
  de les publier). `ui/atlas-ui` et `packages/test-utils-sveltekit`
  ajoutés à la liste des helpers internes via `PRIVATE_INTERNAL_ALLOWED`.

## Conséquences

**Bénéfices.** Aucune publication accidentelle possible. La nature
« interne » du paquet est lisible directement dans le `package.json` et
vérifiée à chaque CI/pre-push via `audit:structure`. Les outils du
monorepo (turbo, changesets) traitent ces paquets comme des
consommateurs, pas comme des bibliothèques.

**Prix à payer.** Pour publier un paquet aujourd'hui privé (par exemple,
ouvrir `ui/atlas-ui` à des consommateurs externes), il faut :

1. Retirer `"private": true` du `package.json`.
2. Retirer le nom de `PRIVATE_INTERNAL_ALLOWED` dans
   `scripts/audit/workspace-structure.mjs`.
3. Ajouter une note d'évolution à cet ADR (ou superseder).

C'est volontairement plus visible qu'un simple changement de scope npm.

**Garde-fous.**

- `audit:structure` est exécuté en pre-push (lefthook) et en CI : aucune
  régression silencieuse possible.
- Toute publication accidentelle reste impossible côté npm grâce à
  `private: true`, même si la règle audit:structure venait à être
  contournée.
