---
title: Audits
---

Rapports d'audit transverses du dépôt — qualité, sécurité, gouvernance,
documentation, tests, dépendances. Chaque audit est daté et figé : il
représente l'état du dépôt à un instant T, pas une vue vivante.

## Conventions

- **Format de nom** : `YYYY-MM-DD.md` (date à laquelle l'audit a été conduit).
- **Méthode** : indiquée dans le rapport (outils utilisés, profondeur, périmètre couvert).
- **Suivi** : les findings actionnables ouvrent une **issue GitHub**
  (label `enhancement` ou `tech-debt`), ou un ADR si la résolution
  implique une décision structurante.

## Index

| Date       | Rapport                       | Méthode                                                                                           | Findings                                                                                        |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 2026-05-29 | [Audit complet](./2026-05-29) | Workflow multi-agents, 22 dimensions, vérification adversariale 3-vote des findings Critical/High | 51 retenus (8 High / 27 Medium / 14 Low / 2 Info) sur 263 collectés, 13 rejetés en vérification |
