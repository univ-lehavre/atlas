---
title: "0039 — Cadence d'audit transverse : trimestriel, rappel automatisé"
---

## Contexte

Le dépôt tient deux traces complémentaires de sa propre qualité :

- les [**audits**](/atlas/audit/) — l'état du dépôt à un instant T, **figé et
  daté** (qualité, sécurité, cloud-native…), avec constats prouvés par le code ;
- les [**plans**](/atlas/plans/) — les actions phasées pour résorber les
  _findings_ d'un audit.

Le cycle est : **audit → findings → issues/ADR → plan → PR**. Il fonctionne,
mais reposait jusqu'ici sur un déclenchement **ponctuel** (à l'initiative d'un
contributeur). Rien ne garantissait qu'un audit soit reconduit régulièrement —
au risque que la trace vieillisse et que la dérive passe inaperçue entre deux
audits espacés.

Un audit complet s'appuie sur un **workflow multi-agents** (Claude Code) qui
lit le code et vérifie ses constats de manière adversariale. Ce type d'audit
**ne peut pas s'exécuter sur un runner GitHub** : il n'est pas automatisable en
CI classique.

## Décision

**Cadence trimestrielle, déclenchée par un rappel automatisé.**

- Un audit transverse est conduit **une fois par trimestre** (1er janvier,
  avril, juillet, octobre).
- Un workflow planifié (`.github/workflows/audit-reminder.yml`, cron
  `0 6 1 1,4,7,10 *`) **ouvre une issue de rappel** « Audit transverse
  trimestriel — AAAA TN » (label `audit`). Le workflow **ne conduit pas**
  l'audit (impossible en CI) : il crée le travail, visible et traçable. Il est
  **idempotent** (ne rouvre pas une issue déjà ouverte du même titre) et
  déclenchable à la main (`workflow_dispatch`) pour un audit hors calendrier.
- L'audit produit un **rapport daté** dans `docs/.../audit/YYYY-MM-DD-*.md`,
  ajouté à l'index, **comparé au précédent** (écarts résorbés / nouveaux).
- Les _findings_ actionnables ouvrent une **issue** (`enhancement` /
  `tech-debt`) ou un **ADR** si la résolution est structurante — convention
  inchangée.

Des audits **hors calendrier** restent les bienvenus (avant un déploiement,
après un refactor majeur, à une release) : la cadence est un **plancher**, pas
un plafond.

## Statut

Accepted (2026-06-04).

## Conséquences

**Bénéfices.**

- La trace reste **vivante** : au moins quatre points de mesure par an, donc une
  dérive visible rapidement.
- Le rappel est **automatique et traçable** (issue), sans dépendre de la mémoire
  d'un contributeur.
- La comparaison T vs T-1 devient un réflexe (le rapport renvoie au précédent).

**Prix à payer.**

- Un audit multi-agents a un **coût** (temps, jetons) ; le trimestre est un
  compromis assumé entre fraîcheur et coût.
- Le rappel **ouvre une issue** mais ne garantit pas son traitement : la cadence
  crée la visibilité, pas l'exécution — qui reste une action humaine/agentique.

**Garde-fous.**

- Le workflow n'a que la permission `issues: write` (aucune écriture de code) et
  est idempotent : pas de spam d'issues si plusieurs déclenchements.
- Un audit ne **prononce pas** de conformité : il documente l'état réel, écarts
  compris (cf. [ADR 0028](/atlas/decisions/0028-documentation-verifiable/)).
