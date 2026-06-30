---
title: 0015 — Hooks Git via lefthook, jamais bypassés
---

## Contexte

Plusieurs vérifications doivent passer **avant** qu'un commit ou un
push n'atteigne la branche distante : format Prettier, lint ESLint,
typecheck TypeScript, lint des messages de commit, structure du
workspace, audit knip des dépendances inutilisées.

Sans hooks, ces vérifications ne tournent qu'en CI : un commit cassé
arrive sur GitHub, fait échouer la pipeline, est corrigé par un
second commit qui re-passe par le pipeline complet, etc. Le cycle est
long et pollue l'historique.

Sans **discipline de non-bypass**, les hooks deviennent une simple
recommandation : `git commit --no-verify` (ou `git push --no-verify`)
contourne tout, et la CI redevient l'unique filet. Avec en prime des
commits cassés qui forcent un rebase de la branche pour les nettoyer.

[lefthook](https://github.com/evilmartians/lefthook) est l'orchestrateur
choisi : configuration unique en YAML, parallélisme natif des hooks,
support des patterns de fichiers, installation via `lefthook install`
au `prepare`.

## Décision

Le monorepo configure ses hooks via [`lefthook.yml`](https://github.com/univ-lehavre/atlas/blob/main/lefthook.yml).
L'installation est automatique au `pnpm install` (script `prepare`).
Les hooks couvrent au minimum : `pre-commit` (format, lint, typecheck
ciblé), `commit-msg` (commitlint), `pre-push` (structure, knip, tests
rapides).

**Aucun bypass n'est autorisé** : `--no-verify`, `--no-gpg-sign`,
ou toute autre option contournant les hooks est interdite, **quel que
soit le contexte** (urgence, refactoring massif, blocage temporaire).
Si un hook bloque, la solution est de **corriger le problème**, pas
de le contourner.

**Unique exception, bornée et documentée — le bot de release en CI.**
Le job `release` de [`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml)
pose `LEFTHOOK: 0` (hooks désactivés) parce que l'action Changesets commit
elle-même la PR « chore: version packages » **sur `main`** depuis un runner :
le hook `check-branch` (« commit direct sur `main` interdit ») et le hook
`strip-email-line` (`commit-msg`) casseraient ce commit machine légitime. Cette
exception ne s'applique **qu'à ce bot CI**, jamais à un humain ni à une autre
branche, et reste lisible dans le workflow. Elle ne relâche aucune garantie :
le contenu publié a déjà traversé la CI complète de la PR d'origine.

## Statut

Accepted.

## Conséquences

**Bénéfices.** Les commits qui partent vers la branche distante sont
en bon état. La CI vérifie l'agrégat, mais le filtrage de base est
local. L'historique reste propre : pas de `chore: fix lint` qui suit
chaque commit. Le coût de revue est moindre, le PR-reviewer n'a pas à
relever les fautes de format.

**Prix à payer.** Le `pnpm install` initial coûte un peu plus
(installation lefthook). Les commits sont parfois ralentis (format
d'un gros refactor, typecheck cascadant). Un contributeur qui force
malgré tout `--no-verify` casse l'invariant — risque mitigé par la
revue de code et par la branch protection (voir [ADR 0016](/atlas/decisions/0016-branch-protection-main/)).

**Garde-fous.**

- Les hooks restent **rapides** (< 10s sur un commit moyen) ; si un
  hook devient lent, il est déplacé en `pre-push` ou en CI seule.
- La règle « jamais de `--no-verify` » est documentée dans
  [docs/quality/hooks.md](/atlas/quality/hooks/) et appliquée par revue
  de code.
- Si un hook empêche un commit légitime, on l'ajuste — on ne le
  contourne pas.
