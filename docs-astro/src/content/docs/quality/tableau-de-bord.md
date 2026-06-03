---
title: Tableau de bord
---

Cette page rassemble des **indicateurs de robustesse** du dépôt et leur
évolution. Elle distingue deux familles de données :

- les **données dérivées de l'historique Git** (lignes, commits, _pull
  requests_ dans le temps) — reproductibles et vérifiées à jour ;
- les **mesures de l'état présent** (couverture, vulnérabilités, densité) —
  historisées au fil des exécutions sur `main`.

Les chiffres ci-dessous sont **générés** à partir du dépôt
(`pnpm stats:generate`), jamais saisis à la main.

> Les **courbes d'évolution mensuelle** (pull requests, lignes de code,
> activité, robustesse statique) — dérivées de l'historique Git et vérifiées
> à jour en CI — sont sur la page [Évolution du dépôt](./evolution-git).
> Les courbes de **couverture exécutée**, de vulnérabilités et de dette
> (mesures de l'état présent) arrivent dans les incréments suivants.

## Dynamique du dépôt

<RepoDynamics />

## Évolution dans le temps

L'[**évolution mensuelle du dépôt**](./evolution-git) — _pull requests_,
volume de code, commits et contributeurs, et **robustesse statique** (ratios
tests/source et densité de documentation) — est retracée sur une page dédiée,
entièrement **dérivée de l'historique Git** et donc reproductible.

## Pour aller plus loin

- Les statistiques **npm et GitHub** (téléchargements, _releases_) sont
  présentées par l'outil [`atlas-dashboard`](../../apps/atlas-dashboard/README.md),
  hors de cette page (univers de données distinct).
- Le détail de la **couverture de tests** est documenté dans
  [Tests](./tests) ; les **garde-fous de sécurité** dans
  [Sécurité](./security).
