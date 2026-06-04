---
title: "0038 — Épingler le niveau WCAG cible des tests d'accessibilité"
---

## Contexte

Les tests d'accessibilité du dépôt (`*.a11y.test.ts` via `vitest-axe` / axe-core)
s'exécutaient avec le **jeu de règles par défaut** d'axe-core. Ce défaut couvre
WCAG 2.x AA, mais **implicitement** : il dépend de la version d'axe-core et n'est
écrit nulle part. La page [Accessibilité](/atlas/quality/accessibilite/) le
relevait comme manque (« niveau WCAG non épinglé »).

Deux problèmes :

1. **Intention non contractuelle.** Rien ne dit à quel niveau le dépôt vise la
   conformité. Une montée d'axe-core peut changer le périmètre de règles sans
   décision explicite.
2. **Pas de cible partagée.** Deux codebases écrivent des tests a11y —
   `ui/atlas-ui` et `apps/find-an-expert` — sans config commune. Le risque est
   qu'elles divergent (niveaux différents, règles différentes).

Le **WCAG** est la référence (cf. [Accessibilité](/atlas/quality/accessibilite/)) ;
le **niveau AA** est celui qu'attendent le RGAA et la norme européenne EN 301 549.

## Décision

**Épingler explicitement le niveau WCAG 2.x AA** dans les tests, via une config
axe `runOnly` partagée.

### Niveau cible

Les balises (_tags_) axe-core retenues : `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`, `wcag22aa` — soit le niveau **AA du WCAG 2.0/2.1/2.2**.

### Véhicule de partage

La config vit dans **`@univ-lehavre/atlas-shared-config`** (export `./a11y`),
dont **`ui/atlas-ui` et `apps/find-an-expert` dépendent déjà**. Pas de nouveau
paquet : les deux codebases importent la **même** cible (`wcagAxeOptions`). C'est
cohérent avec les autres configs transverses du dépôt (eslint, prettier, vitest)
qui vivent déjà là.

### Ce que cela ne change pas

La dérogation par règle reste **interdite par défaut** : on n'ajoute pas de
`rules: { … : { enabled: false } }` global. Une exception ponctuelle doit être
ciblée, commentée et tracée (`TODO(auteur, date) a11y:`), comme toute dérogation
([ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/)).

## Statut

Accepted (2026-06-04). Complète l'[ADR 0020](/atlas/decisions/0020-svelte-eslint-strict/)
(lint a11y) côté **tests**.

## Conséquences

**Bénéfices.**

- Le niveau de conformité visé est **écrit et versionné**, stable face aux
  évolutions d'axe-core.
- Les deux codebases partagent **une seule** cible : pas de divergence possible.
- Le contrat est lisible : un contributeur sait que les tests visent WCAG 2.x AA.

**Prix à payer.**

- Restreindre à `runOnly` AA **exclut** les règles axe « best-practice » et AAA
  qui tournaient dans le défaut. C'est volontaire (AA est la cible
  réglementaire), mais cela peut laisser passer des points AAA — assumé.
- Une montée future au niveau AAA, ou l'ajout d'une nouvelle balise WCAG, est
  désormais une **décision** (modifier la config partagée), pas un effet de bord
  d'axe-core. C'est le but, mais cela demande une intervention explicite.

**Garde-fous.**

- Passer les tests **n'équivaut pas** à une conformité RGAA/EN 301 549 formelle
  (critères non automatisables) — rappel déjà posé dans
  [Accessibilité](/atlas/quality/accessibilite/). Le dépôt outille, ne prononce
  pas.
- La cible partagée est la **seule** source ; tout test a11y du dépôt doit
  l'importer plutôt que redéfinir ses propres balises.
