# Tableau de bord

Cette page rassemble des **indicateurs de robustesse** du dépôt et leur
évolution. Elle distingue deux familles de données :

- les **données dérivées de l'historique Git** (lignes, commits, _pull
  requests_ dans le temps) — reproductibles et vérifiées à jour ;
- les **mesures de l'état présent** (couverture, vulnérabilités, densité) —
  historisées au fil des exécutions sur `main`.

Les chiffres ci-dessous sont **générés** à partir du dépôt
(`pnpm stats:generate`), jamais saisis à la main.

## Dynamique du dépôt

<RepoDynamics />

## Pour aller plus loin

- Les statistiques **npm et GitHub** (téléchargements, _releases_) sont
  présentées par l'outil [`atlas-dashboard`](../../apps/atlas-dashboard/README.md),
  hors de cette page (univers de données distinct).
- Le détail de la **couverture de tests** est documenté dans
  [Tests](./tests.md) ; les **garde-fous de sécurité** dans
  [Sécurité](./security.md).
