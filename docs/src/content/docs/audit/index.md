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
- **Cadence** : un audit transverse est conduit **chaque trimestre**, sur rappel
  automatisé (issue ouverte par `.github/workflows/audit-reminder.yml`) —
  [ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/). Des audits
  hors calendrier restent possibles.

## Index

| Date       | Rapport                                                                          | Méthode                                                                                                                         | Findings                                                                                        |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 2026-05-29 | [Audit complet](/atlas/audit/2026-05-29/)                                        | Workflow multi-agents, 22 dimensions, vérification adversariale 3-vote des findings Critical/High                               | 51 retenus (8 High / 27 Medium / 14 Low / 2 Info) sur 263 collectés, 13 rejetés en vérification |
| 2026-06-04 | [Cloud-native (12 facteurs + extensions)](/atlas/audit/2026-06-04-cloud-native/) | Workflow multi-agents, 16 dimensions (12-factor + extensions), constats prouvés par le code et vérifiés de manière adversariale | 4 appliqués / 8 partiels / 3 écarts / 1 non applicable ; 6 écarts → issues                      |
