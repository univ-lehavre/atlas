---
title: "0016 — Branch protection sur `main`"
---

> **Amendé par [0053](/atlas/decisions/0053-strategie-merge-commit-main/).** La
> stratégie de merge décrite ici (squash-merge, « historique linéaire ») a été
> remplacée par le **merge commit** le 2026-06-10. Les autres protections de cet
> ADR (status checks, force-push bloqué, bypass admin) restent en vigueur.

## Contexte

La branche `main` est la **source de vérité** du monorepo : c'est
elle qui déclenche les releases, qui est consommée par les apps
déployées, et qui sert de baseline aux PRs. Un push direct cassé ou
non revu sur `main` impacte tout l'écosystème en aval.

GitHub propose plusieurs niveaux de protection (status checks requis,
revue obligatoire, blocage des force-push, exigence de signatures
GPG, blocage des bypass admin). Chaque niveau a un coût opérationnel :

- les status checks rallongent le délai entre push et merge ;
- la signature des commits est lourde côté contributeur local et
  impossible à garantir pour les commits générés par des bots
  (Dependabot, github-actions[bot]) ;
- le blocage du bypass admin élimine la « soupape de sécurité » en
  cas d'incident, ce qui est dangereux quand un seul contributeur
  porte le projet (bus-factor = 1).

## Décision

`main` est protégée par :

- **Status checks requis** — le pipeline CI (`format:check`, `check`,
  `lint`, `typecheck`, `test:coverage`, `build`) doit être vert avant
  merge.
- **Force-push bloqué** — la réécriture d'historique distant est
  interdite.
- **Signatures GPG non requises** — un commit local sans GPG est
  accepté. Le coût d'imposer la signature à un projet à un seul
  contributeur n'est pas justifié.
- **Bypass admin autorisé** — l'administrateur (= le contributeur
  principal) peut merger malgré une CI rouge en cas d'urgence
  documentée. C'est une concession au bus-factor = 1.

Activée le 2026-05-19.

## Statut

Accepted (2026-05-19).

## Conséquences

**Bénéfices.** Aucun commit non vérifié n'atterrit sur `main` par voie
normale. L'historique est linéaire (squash-merge des PRs) et figé
(pas de force-push). Le délai entre push et merge force à découper en
PRs raisonnables.

**Prix à payer.** Le délai de pipeline (~5-10 min) s'ajoute à chaque
merge. Le bypass admin reste une faille théorique — atténuée par la
discipline (le bypass est l'exception, documenté en commentaire de
merge) et par l'audit de l'historique.

**Garde-fous.**

- Tout bypass admin sur CI rouge doit être commenté dans le merge
  (raison + ticket de suivi).
- Si le bus-factor passe à plus d'un contributeur, l'option « bypass
  admin interdit » doit être réévaluée.
- L'audit semestriel des règles de protection est documenté dans
  [docs/quality/security.md](/atlas/quality/security/).
