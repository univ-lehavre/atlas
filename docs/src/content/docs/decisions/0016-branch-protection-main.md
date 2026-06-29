---
title: "0016 — Branch protection sur `main`"
---

> **Amendé par [0053](/atlas/decisions/0053-strategie-merge-commit-main/).** La
> stratégie de merge décrite ici (squash-merge, « historique linéaire ») a été
> remplacée par le **merge commit** le 2026-06-10. Les autres protections de cet
> ADR (status checks, force-push bloqué, bypass admin) restent en vigueur.

> **Mise à jour 2026-06-29 — bypass admin RETIRÉ.** Le « bypass admin autorisé »
> décrit ci-dessous est **révoqué** : `enforce_admins` est désormais **activé**,
> sur recommandation du check **Branch-Protection** d'OpenSSF Scorecard
> ([ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/)). Voir la section
> [« Mise à jour 2026-06-29 »](#mise-à-jour-2026-06-29--bypass-admin-retiré)
> en fin d'ADR pour l'arbitrage et ce qui reste volontairement non-maximal.

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

## Mise à jour 2026-06-29 — bypass admin retiré

Le premier passage d'**OpenSSF Scorecard** ([ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/))
note le check **Branch-Protection** en dessous du maximal et signale quatre
points sur `main` : bypass admin autorisé, aucun approbateur requis, revue
**CODEOWNERS** non requise, _last push approval_ désactivée.

**Décision : `enforce_admins` est activé** — l'administrateur (le contributeur
principal) est désormais **soumis aux mêmes règles** que tout le monde ; il ne
peut plus merger une PR à CI rouge par bypass. C'est le renforcement le plus
défendable à **bus-factor = 1** : il ferme un trou réel sans bloquer le flux de
travail. La « soupape d'urgence » devient explicite et tracée : en cas
d'incident, on **désactive temporairement** la règle (journalisé côté GitHub),
on merge, on **réactive** — au lieu d'un bypass silencieux. Cela **révoque** la
concession « bypass admin autorisé » de la décision initiale.

**Ce qui reste volontairement non-maximal (et pourquoi).** Les trois autres
points supposent une **équipe**, pas un mainteneur unique :

- **Approbateur requis (`required_approving_review_count ≥ 1`)** — impossible à
  bus-factor = 1 : on ne peut pas approuver sa propre PR, donc l'exiger
  **bloquerait toute PR**. À réévaluer dès qu'un deuxième mainteneur arrive
  (garde-fou déjà inscrit ci-dessus).
- **Revue CODEOWNERS requise** — même obstacle : le seul _code owner_ étant
  l'auteur, la revue requise ne peut être satisfaite. Le fichier
  [`.github/CODEOWNERS`](https://github.com/univ-lehavre/atlas/blob/main/.github/CODEOWNERS)
  **existe** (il documente la responsabilité) mais n'est pas **imposé** en
  protection de branche.
- **_Last push approval_** — dérivé de l'exigence d'approbateur ; sans elle, il
  n'a pas d'objet.

Ces écarts sont **assumés et datés**, conformément à la doctrine d'honnêteté des
signaux ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/),
[ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/)) : le score
Branch-Protection ne sera pas maximal tant que le projet reste à un seul
mainteneur, et c'est un **choix tracé**, pas un oubli.

Le check **Signed-Releases** signalé au même passage (« no releases found ») est
un **faux négatif** : les paquets sont publiés avec **provenance OIDC npm**
(attestation in-toto signée, [ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)),
et non sous forme de GitHub Releases avec assets signés que Scorecard recherche.
Aucune action requise.
