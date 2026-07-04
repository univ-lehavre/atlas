---
title: 0014 — Conventional Commits, scopes restreints
---

## Contexte

L'historique Git a deux rôles dans le monorepo :

1. **Lisibilité humaine** — un contributeur doit pouvoir naviguer
   l'historique pour comprendre quand et pourquoi un changement a été
   fait, sans lire le diff intégral.
2. **Automatisation** — la chaîne Changesets/Release classifie les
   bumps de version (`patch` / `minor` / `major`) à partir des messages
   et des changesets associés. Une convention rend cette classification
   prévisible.

Sans contrainte, les messages dérivent rapidement (« fix », « update »,
« stuff », « WIP ») et les scopes deviennent fantaisistes. La convention
[Conventional Commits](https://www.conventionalcommits.org/) résout ces
deux problèmes en imposant `type(scope): description`.

## Décision

Tous les commits respectent **Conventional Commits**, vérifié par
[commitlint](https://github.com/univ-lehavre/atlas/blob/main/commitlint.config.js) en hook `commit-msg` (voir
[ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)).

Les **scopes** sont **restreints à une liste fermée** (`allowed-scopes`
dans `commitlint.config.js`) qui correspond aux paquets et chantiers
réels du monorepo. Un scope absent de la liste fait échouer le commit.

Cette restriction force à utiliser des scopes qui ont un sens dans le
monorepo, pas des étiquettes inventées au coup par coup.

## Statut

Accepted. Le **mécanisme** de restriction (liste `scope-enum` fermée, maintenue à la main) est
**superseded par l'[ADR 0092](/atlas/decisions/0092-scope-enum-derive-du-workspace/)** (enum
DÉRIVÉ du workspace, exhaustif et non ambigu). Le reste de cet ADR — Conventional Commits
obligatoires, scopes contraints, vérifiés par hook `commit-msg` — tient.

## Conséquences

**Bénéfices.** L'historique est filtrable par scope. Les changesets
peuvent rapprocher les commits du paquet impacté. Les release notes
auto-générées sont cohérentes. La discipline est appliquée par hook,
pas par revue.

**Prix à payer.** Un nouveau scope demande une mise à jour de
`commitlint.config.js` (PR dédiée). Les contributeurs externes qui
ignorent la convention voient leurs commits rejetés, ce qui demande un
onboarding rapide.

**Garde-fous.**

- La liste des scopes autorisés est mise à jour quand un nouveau paquet
  est créé.
- Le README mentionne la convention et pointe vers
  [docs/collaboration/workflow.md](/atlas/collaboration/workflow/) pour
  les détails.
- Voir [ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/) pour la
  règle « jamais de bypass ».
