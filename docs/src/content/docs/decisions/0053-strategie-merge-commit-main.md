---
title: "0053 — Merge commit imposé sur `main` (abandon du squash)"
---

## Contexte

Une **pull request** (proposition de fusion d'une branche dans une autre,
revue avant intégration) peut être intégrée à `main` de trois façons sur
GitHub :

- **merge commit** — un commit de fusion relie les deux branches ; tous les
  commits de la branche sont conservés tels quels dans l'historique ;
- **squash** — les commits de la branche sont **écrasés** en un seul commit
  posé sur `main` ; l'historique fin de la branche disparaît ;
- **rebase** — les commits sont **rejoués** un à un au sommet de `main`, sans
  commit de fusion ; les SHA changent.

L'[ADR 0016](/atlas/decisions/0016-branch-protection-main/) avait acté le
**squash** comme stratégie, au nom d'un « historique linéaire ». L'usage a
révélé le prix de ce choix : le squash **réécrit** les commits. Une branche
mergée par squash a, sur `main`, un commit de SHA et de contenu agrégés
**différents** de ses commits d'origine. Conséquences observées :

- une branche locale conservée après merge paraît « en avance » alors que son
  travail est **déjà intégré** — git ne peut plus le reconnaître, puisque les
  SHA diffèrent (cas rencontré sur `docs/appliquer-charte`, dont les deux
  commits se sont révélés vides au report sur `main`) ;
- le message de commit détaillé rédigé sur la branche (corps, justifications)
  est aplati dans la description de la PR, moins durable que le commit ;
- le découpage en commits atomiques — pensé à la rédaction — est **perdu** à
  l'intégration, ce qui appauvrit `git bisect` et `git blame`.

Le bénéfice affiché (« linéarité ») est en partie illusoire : un **merge
commit** donne un historique tout aussi lisible via `git log --first-parent`,
tout en **préservant** les commits d'origine.

## Décision

> **Sur `main`, le merge commit est la seule stratégie d'intégration. Le
> squash et le rebase sont retirés des options proposées.**

La contrainte est portée par la **ruleset** GitHub `main` (jeu de règles
appliqué à la branche, prioritaire sur les réglages globaux du dépôt) : sa
règle `pull_request` restreint `allowed_merge_methods` à `["merge"]`. C'est
elle qui gouverne le bouton « Merge » des PR vers `main`.

Les **réglages du dépôt** sont alignés autant que l'API l'autorise : merge
commit activé, squash désactivé. GitHub **interdit** toutefois de désactiver
_à la fois_ squash et rebase au niveau du dépôt (erreur
`protected_branch_policy` : « il faut autoriser squash ou rebase, ou les
deux »). Le `rebase` reste donc activé **dans les réglages du dépôt** comme
soupape imposée — **sans effet sur `main`**, où la ruleset prime et n'autorise
que le merge commit. Cette case ne s'appliquerait qu'à une branche non
couverte par une ruleset (il n'y en a pas aujourd'hui).

Appliquée le 2026-06-10.

## Statut

Accepted (2026-06-10). **Amende** l'[ADR 0016](/atlas/decisions/0016-branch-protection-main/)
sur le seul point de la stratégie de merge (la phrase « historique linéaire —
squash-merge des PR » ne tient plus) ; les autres protections de 0016 (status
checks requis, force-push bloqué, bypass admin) restent en vigueur.

## Conséquences

**Bénéfices.** Les commits rédigés sur une branche — découpage atomique,
messages détaillés — arrivent **intacts** sur `main`. Une branche mergée est
reconnue comme intégrée par git (mêmes SHA), ce qui supprime les fausses
« avances » et les reports à vide. `git bisect` et `git blame` retrouvent leur
granularité. La lisibilité « linéaire » reste accessible via
`git log --first-parent`.

**Prix à payer.** L'historique gagne des commits de fusion et un graphe non
strictement linéaire. La discipline de découpage **se déplace en amont** : la
qualité de l'historique de `main` dépend désormais de la propreté des commits
de chaque branche (le squash la masquait jusqu'ici). Une branche bavarde ou
brouillonne pollue maintenant `main` — d'où l'importance des
[Conventional Commits](/atlas/decisions/0014-conventional-commits-scopes-restreints/)
et des [hooks lefthook](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/).

**Garde-fous.**

- La source de vérité est la **ruleset** `main` (`allowed_merge_methods =
["merge"]`), pas les réglages du dépôt. Toute revue de configuration vérifie
  la ruleset, pas seulement l'onglet « General » du dépôt.
- Le `rebase` résiduel dans les réglages du dépôt est un **artefact** de la
  contrainte GitHub, pas une autorisation : il n'a d'effet que hors couverture
  d'une ruleset. Si une branche protégée s'ajoute, lui appliquer la même
  ruleset (merge seul).
- Avant d'ouvrir une PR, **rebaser/nettoyer** la branche localement : sur `main`,
  ses commits seront conservés tels quels.
- Revue à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)), en même temps
  que les règles de protection de 0016.
