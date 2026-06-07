---
title: 0050 — Limite de l'audit knip face aux peerDependencies
---

## Contexte

L'audit d'hygiène des dépendances repose sur knip (`audit:unused` =
`knip --exclude unresolved,types`, `package.json:34`). Knip a un **angle
mort** : une dépendance qui **satisfait une `peerDependency` d'un paquet
importé** est comptée « utilisée », même si le code ne l'importe **jamais
directement**. Le phantom passe alors sous le radar.

Le mécanisme se chaîne dans l'écosystème `@effect/*` :

- `@effect/cli` déclare en peers `@effect/platform`, `@effect/printer`,
  `@effect/printer-ansi`, `effect`.
- `@effect/platform-node` déclare en peers `@effect/cluster`, `@effect/rpc`,
  `@effect/sql`, `@effect/platform`, `effect`.

Un paquet qui importe `@effect/cli` et installe explicitement ses peers voit ces
peers comptés « utilisés » par knip — qu'il les importe ou non. C'est exactement
ce qui a **silencieusement** masqué les phantoms d'E4 : `@effect/cluster`/`rpc`/
`sql`, **zéro import**, sont des peers de `@effect/platform-node` (lui bien
importé par les CLIs) ; knip les comptait « utilisés » et **ne les a jamais
signalés**. Leur retrait (Phase 0) a dû être **prouvé par lecture du code**, pas
par l'audit — et aucune entrée `ignoreDependencies` ne les concernait, justement
parce que knip ne les voyait pas.

À distinguer du cas inverse, instructif par contraste : les anciennes entrées
`ignoreDependencies` de `packages/citation` (`@effect/experimental`,
`@effect/platform-node`) étaient des phantoms que knip **détectait bien** (citation
n'importe aucun `@effect/*`, aucun de ses imports n'en fait un peer) — un humain
les avait donc **supprimées manuellement** de la sortie via `ignoreDependencies`.
Deux modes de défaillance opposés, donc : l'angle mort peer-dep laisse passer un
vrai phantom **sans alerte** (cluster/rpc/sql) ; la dérogation manuelle **éteint
une alerte** correcte (citation). E4 a résolu les deux ; cet ADR cadre le premier,
le seul que knip ne peut pas attraper seul.

L'[ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/) **liste** les
dérogations knip restantes, mais documente le _quoi_, pas le _pourquoi mécanique_ :
un mainteneur futur ne sait pas que l'angle mort vient des peerDependencies, ni
pourquoi un phantom peut échapper à `audit:unused`.

## Décision

> **On acte que `audit:unused` (knip) ne détecte pas les dépendances fantômes
> masquées par une `peerDependency` d'un paquet importé. Tant qu'un contrôle
> dédié n'existe pas (E5), le retrait de phantoms `@effect/*` (et apparentés) se
> fait par **audit du code**, pas par confiance dans knip ; les dérogations
> nécessaires restent listées dans
> [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/). E5 ajoutera un
> contrôle ciblant ce faux-négatif.**

### Pourquoi knip ne peut pas le voir seul

Du point de vue de knip, une dep installée qui satisfait un peer d'un import légitime
**est** utilisée : c'est le contrat des peerDependencies. Distinguer « installée
pour satisfaire un peer **et** importée » de « installée pour satisfaire un peer
**sans** être importée » demande de croiser l'arbre des peers avec l'analyse
d'imports — ce que `audit:unused` ne fait pas. Ce n'est pas un bug de
configuration, c'est une **limite du modèle** : aucun réglage knip n'y change
rien tant qu'on n'analyse pas les chaînes de peers.

### En attendant E5 : audit du code, dérogations tracées

Jusqu'à ce qu'E5 outille un contrôle « phantom-peer », deux règles tiennent :
le retrait d'une dep `@effect/*` (ou de toute dep à large surface de peers) se
**vérifie par grep d'imports réels**, comme en Phase 0 ; et toute dérogation knip
résiduelle reste enregistrée dans
[ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/), comme l'exige déjà
sa discipline.

### Ce que E5 ajoutera

E5 introduira un contrôle dédié (plugin knip ou script d'audit) qui **analyse les
chaînes de peerDependencies** pour signaler une dep déclarée qui ne sert qu'à
satisfaire un peer sans être importée. L'objectif : qu'un futur phantom soit
**détectable automatiquement**, pas seulement par revue manuelle.

### Alternative écartée : se reposer sur `ignoreDependencies` à perpétuité

Continuer à papier-mâcher chaque phantom par une entrée `ignoreDependencies`
manuelle passe mal à l'échelle (l'écosystème `@effect/*` croît), repose sur la
discipline humaine, et **inverse la charge** : on liste ce qu'on ignore au lieu de
détecter ce qui est mort. Écartée au profit du contrôle outillé d'E5.

## Statut

Accepted (2026-06-07). **Prépare l'écart E5** (durcir knip) du
[plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/)
(Phase 2) et **explicite le mécanisme** derrière les dérogations knip de
[ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/). Aucun code livré
ici ; le contrôle est livré par E5.

## Conséquences

**Bénéfices.** Le faux-négatif est nommé et expliqué : un mainteneur sait
désormais _pourquoi_ `audit:unused` peut rater un phantom et _comment_ le vérifier
en attendant E5. La revue des dérogations knip de l'ADR 0019 gagne en sens.

**Prix à payer.** Tant qu'E5 n'est pas livré, la détection reste **manuelle** : un
nouveau phantom à large surface de peers peut être introduit sans alerte. La
vigilance repose sur la revue de code.

**Garde-fous.**

- **Retrait de dep `@effect/*` prouvé par grep d'imports**, pas par knip seul,
  jusqu'à E5.
- **Dérogations knip tracées dans
  [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/)** — règle
  inchangée.
- **E5 doit livrer un contrôle automatique** du phantom-peer ; sans lui, cet angle
  mort persiste.
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
