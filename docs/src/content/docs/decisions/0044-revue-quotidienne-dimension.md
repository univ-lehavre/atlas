---
title: "0044 — Revue quotidienne d'une dimension du dépôt"
---

## Contexte

Le dépôt conduit un [**audit transverse trimestriel**](/atlas/audit/)
([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)) : un bilan figé,
daté, large. C'est la **maille macro** — précieuse, mais espacée. Entre deux
audits, rien n'entretient une attention **fine et continue** sur le code, les
tests et la documentation au quotidien. Une dette locale, un test peu pertinent,
une doc qui dérive du code (cf. [ADR 0028](/atlas/decisions/0028-documentation-verifiable/))
passent facilement inaperçus pendant un trimestre entier.

Or l'amélioration continue se joue surtout au ras du code, par petites touches
régulières. Il manquait un dispositif qui, **chaque jour**, pose une cible
concrète sous les yeux et invite à se demander : ce détail local est-il sain ?
est-il le symptôme d'un motif ? engage-t-il une décision structurante ?

Comme pour l'audit, une revue de qualité s'appuie sur une lecture humaine (et
une discussion avec un agent) : elle **ne peut pas s'exécuter sur un runner
GitHub**. Le même garde-fou qu'ADR 0039 s'applique — la CI crée le travail, ne
le fait pas.

## Décision

**Une revue quotidienne personnelle d'une dimension du dépôt, sur cible
désignée automatiquement, traitée à la main.**

- Chaque **jour ouvré** (lun→ven, 06:00 UTC), le workflow
  `.github/workflows/daily-review.yml` **désigne une cible** et ouvre une
  **issue-support** pré-remplie (label `revue-quotidienne`).
- La cible est choisie par `scripts/audit/daily-target.mjs`, **déterministe par
  date** (seed dérivé de `YYYY-MM-DD`, jamais `Math.random`) — donc idempotent
  et rejouable. Une **rotation pondérée** couvre quatre dimensions :
  - `source` — un fichier source (`packages|apps|services|cli|ui/**/src/**`) ;
  - `test` — un fichier de test (pertinence, cas manquants, sur-mocking) ;
  - `docs` — une doc ou un README (exactitude, fraîcheur, vérifiabilité) ;
  - `debt` — une dette / dimension globale tirée d'un **pool curé versionné**
    (`scripts/audit/lib/debt-pool.json`), maintenu à la main.
- L'issue structure la revue **manuelle** sur trois échelles :
  - **micro** — le constat local, prouvé par le code, et son correctif ;
  - **meso** — le motif récurrent éventuel (autres fichiers → systématisation :
    lint, check d'audit, convention, helper) ;
  - **macro** — l'implication structurante, candidate à un **ADR** ou un **plan**.
- L'auteur **inspecte lui-même** la cible et consigne ses constats ; les
  implications se **discutent ensuite** (avec un agent) avant toute action. Le
  workflow **ne conduit pas** la revue.
- La suite suit la convention inchangée : rien à faire / PR directe / issue de
  suivi (`enhancement`/`tech-debt`) / ADR / plan.

La revue quotidienne est le **sous-cycle fin** de l'audit trimestriel : l'un
maille en continu, l'autre fait le bilan ; tous deux alimentent le même cycle
`finding → issue/ADR → plan → PR`.

## Statut

Accepted (2026-06-05).

## Conséquences

**Bénéfices.**

- Une attention **quotidienne et tournante** sur tout le dépôt : la dérive se
  voit en jours, pas en trimestres.
- La cible est **imposée** (pas de biais « je revois ce que je connais déjà ») et
  **traçable** (une issue par jour, datée).
- Les trois échelles forcent à remonter du détail au structurant — c'est là que
  naissent les ADR et les plans.

**Prix à payer.**

- Le rappel **ouvre une issue** mais ne garantit pas son traitement : la cadence
  crée la visibilité, pas l'exécution — qui reste humaine/agentique (comme 0039).
- Le pool de dette (`debt`) est **curé à la main** : sa pertinence dépend de sa
  maintenance (on y ajoute une dette révélée, on en retire une résorbée).
- Une issue par jour ouvré : volume à tenir. La cadence est un **plancher
  soutenable** (jours ouvrés), pas un quota à honorer coûte que coûte.

**Garde-fous.**

- Le workflow n'a que `issues: write` (aucune écriture de code) et est
  **idempotent** (pas de doublon pour une même date).
- Le sélecteur n'utilise que des modules natifs Node (aucune installation en CI)
  et est **testé** (`scripts/audit/daily-target.test.mjs`, via `test:scripts`).
- La sélection exclut les `sandbox/` (ADR 0042) et les ADR eux-mêmes (immuables
  une fois actés).
