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
> masquées par une `peerDependency` d'un paquet importé. E5 ajoute un contrôle
> dédié (`audit:phantom-peers`, branché dans `ci:audit`) ciblant précisément la
> classe qui a piégé E4 : les paquets `@effect/*` « peers pratiquement
> optionnels » déclarés sans être importés. Les dérogations légitimes (usage
> dynamique) restent listées en `knip.ignoreDependencies`
> ([ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/)).**

### Pourquoi knip ne peut pas le voir seul

Du point de vue de knip, une dep installée qui satisfait un peer d'un import légitime
**est** utilisée : c'est le contrat des peerDependencies. Distinguer « installée
pour satisfaire un peer **et** importée » de « installée pour satisfaire un peer
**sans** être importée » demande de croiser l'arbre des peers avec l'analyse
d'imports — ce que `audit:unused` ne fait pas. Ce n'est pas un bug de
configuration, c'est une **limite du modèle** : aucun réglage knip n'y change
rien tant qu'on n'analyse pas les chaînes de peers.

### Le contrôle d'E5 : portée étroite, zéro faux positif

Distinguer en général un vrai phantom d'un peer légitimement requis demande
l'analyse d'usage de l'intermédiaire — un pur parcours du graphe de dépendances
sur-détecte (les outils du toolchain — `vite`, `typescript`, `eslint`… — ne
s'importent pas mais sont bien utilisés ; `@effect/printer`, peer de `@effect/cli`,
est requis au runtime sans être importé). Plutôt qu'une heuristique générale
bruyante, `audit:phantom-peers`
([`scripts/audit/phantom-peers.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/phantom-peers.mjs))
vise une **liste explicite** de paquets `@effect/*` « peers pratiquement
optionnels » (`@effect/cluster`, `@effect/rpc`, `@effect/sql`,
`@effect/experimental`) : déclarés sans être importés, ils sont signalés et font
échouer `ci:audit`. C'est exactement la classe d'E4, attrapée avec **zéro faux
positif** ; toute nouvelle entrée s'ajoute à la liste avec sa raison.

### Audit du code en complément, dérogations tracées

Le contrôle outillé ne remplace pas la vigilance pour les classes hors liste :
le retrait d'une dep à large surface de peers se **vérifie par grep d'imports
réels**, comme en Phase 0 ; et toute dérogation knip légitime reste enregistrée en
`knip.ignoreDependencies`
([ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/)), respectée aussi
par `audit:phantom-peers`.

### Alternative écartée : se reposer sur `ignoreDependencies` à perpétuité

Continuer à papier-mâcher chaque phantom par une entrée `ignoreDependencies`
manuelle passe mal à l'échelle (l'écosystème `@effect/*` croît), repose sur la
discipline humaine, et **inverse la charge** : on liste ce qu'on ignore au lieu de
détecter ce qui est mort. Écartée au profit du contrôle outillé d'E5.

## Statut

Accepted (2026-06-07). **Cadre l'écart E5** (durcir knip) du
[plan de résorption socle Effect](/atlas/plans/2026-06-04-socle-effect/)
(Phase 2) et **explicite le mécanisme** derrière les dérogations knip de
[ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/). Le contrôle
`audit:phantom-peers` est livré avec E5 et branché dans `ci:audit`.

## Conséquences

**Bénéfices.** Le faux-négatif est nommé, expliqué et **outillé** :
`audit:phantom-peers` fait échouer la CI si un `@effect/*` « peer pratiquement
optionnel » est déclaré sans être importé — la régression d'E4 ne peut plus se
réintroduire silencieusement. La revue des dérogations knip de l'ADR 0019 gagne en
sens.

**Prix à payer.** Le contrôle est **volontairement étroit** (liste explicite de
`@effect/*`) : un phantom hors de cette liste — autre namespace, ou peer d'un autre
écosystème — reste invisible et demande la vigilance de la revue. La liste est à
étendre au cas par cas.

**Garde-fous.**

- **`audit:phantom-peers` dans `ci:audit`** : tout `@effect/*` optionnel déclaré
  sans import fait échouer la CI ; couvert par
  [`phantom-peers.test.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/phantom-peers.test.mjs).
- **Étendre la liste `OPTIONAL_EFFECT_PEERS`** quand un nouveau peer « pratiquement
  optionnel » apparaît, avec sa raison en commentaire.
- **Phantoms hors liste** : vigilance de revue + grep d'imports, comme en Phase 0.
- **Dérogations knip tracées dans
  [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/)** — respectées par
  le contrôle.
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
