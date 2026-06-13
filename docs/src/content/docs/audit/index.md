---
title: Audits
---

Rapports d'audit du dépôt — qualité, sécurité, gouvernance, documentation, tests,
dépendances. Chaque rapport est daté et figé : il représente l'état du dépôt à un
instant T, pas une vue vivante. Ce dossier héberge **deux natures** de rapports, qui
partagent l'outil (workflow multi-agents, vérification adversariale) et l'exigence de
preuve par le code, mais répondent à des besoins distincts :

- les **audits transverses** — l'état du dépôt à un instant T, conduits chaque trimestre
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)) et comparés au précédent ;
- les **reconnaissances pré-implémentation** — la cartographie du terrain _avant_ d'écrire
  un changement structurant, rendant un verdict GO / NO-GO
  ([ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)).

## Conventions

- **Format de nom** : `YYYY-MM-DD-titre.md` (date à laquelle le rapport a été conduit).
- **Nature** : indiquée dans la colonne _Méthode_ de l'index (audit transverse vs reconnaissance).
- **Méthode** : indiquée dans le rapport (outils utilisés, profondeur, périmètre couvert).
- **Suivi** : les findings actionnables ouvrent une **issue GitHub**
  (label `enhancement` ou `tech-debt`), ou un ADR si la résolution
  implique une décision structurante.
- **Cadence** : un audit transverse est conduit **chaque trimestre**, sur rappel
  automatisé (issue ouverte par `.github/workflows/audit-reminder.yml`) —
  [ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/). Des audits
  hors calendrier restent possibles. Une **reconnaissance** est par nature
  hors-calendrier : elle est déclenchée par le lot ou la décision qu'elle prépare,
  jamais par la cadence trimestrielle.

## Gabarit — compte-rendu de reconnaissance

Pour une reconnaissance **structurante** (qui précède un lot livrable, tranche une
hypothèse laissée « à confirmer » par un plan/ADR, ou rend un GO / NO-GO — cf.
[ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)). Les
explorations jetables ne sont pas consignées.

```markdown
---
title: "Reconnaissance — <sujet> — YYYY-MM-DD"
---

## Objectif

Le changement préparé (lot, décision) et la question à laquelle la reconnaissance répond.

## Agents lancés

Les axes de recherche en éventail (un par sous-système / hypothèse), et la passe de
vérification adversariale.

## Constats

Prouvés par le code, cités `chemin:ligne`. Les gabarits réutilisables identifiés.

## Hypothèses non confirmables depuis le repo

Dites comme telles (jamais inventées) : ce qui devra être validé ailleurs (échantillon
réel, banc, doc externe) et quand.

## Décisions tranchées

Ce que le mainteneur a tranché, et les alternatives écartées (avec le pourquoi).

## Verdict

GO / NO-GO. Si NO-GO : ce qui manque pour passer GO.
```

## Index

| Date       | Rapport                                                                          | Méthode                                                                                                                          | Findings                                                                                          |
| ---------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 2026-05-29 | [Audit complet](/atlas/audit/2026-05-29/)                                        | Workflow multi-agents, 22 dimensions, vérification adversariale 3-vote des findings Critical/High                                | 51 retenus (8 High / 27 Medium / 14 Low / 2 Info) sur 263 collectés, 13 rejetés en vérification   |
| 2026-06-04 | [Cloud-native (12 facteurs + extensions)](/atlas/audit/2026-06-04-cloud-native/) | Workflow multi-agents, 16 dimensions (12-factor + extensions), constats prouvés par le code et vérifiés de manière adversariale  | 4 appliqués / 8 partiels / 3 écarts / 1 non applicable ; 6 écarts → issues                        |
| 2026-06-04 | [Intégration Effect (vers un socle)](/atlas/audit/2026-06-04-effect-socle/)      | Workflow multi-agents, 7 dimensions Effect, constats prouvés par le code et vérifiés adversarialement (plusieurs écarts nuancés) | Premier tiers (Effect = description, pas exécution) ; 14 écarts (E1–E14) → 6 phases, issues + ADR |
