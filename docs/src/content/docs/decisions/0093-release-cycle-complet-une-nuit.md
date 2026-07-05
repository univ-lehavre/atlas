---
title: "0093 — Release en cycle complet sur un seul run nocturne (auto-merge total)"
---

## Contexte

L'[ADR 0091](/atlas/decisions/0091-release-depot-et-changesets-automatiques/) a posé la cadence
**quotidienne** (`schedule: '0 3 * * *'`) : release de dépôt via **release-please** et paquets via
**Changesets**, artefacts disjoints. Il en actait explicitement le prix : _« en `schedule` seul,
le publish/tag suit d'UN run le merge (auto-mergé) de la PR de version »_.

En pratique, cette **latence d'un run** a une conséquence non désirée : le versioning et la
publication tombent sur **deux nuits différentes**. Le run N ouvre et auto-merge la PR de version
(« chore: version packages » côté paquets, « release atlas vX.Y.Z » côté dépôt), mais comme les
deux actions décident _« j'ouvre une PR »_ **avant** que l'auto-merge soit effectif, ni le tag
`vX.Y.Z` ni la publication npm/GitHub Packages ne partent ce run-là. Ils n'arrivent qu'au run N+1,
soit **~24 h plus tard**. Symptômes observés : un `package.json` racine à `1.3.0` **sans tag
`v1.3.0`** ni GitHub Release, et des versions bumpées (`atlas-cache@0.1.0`…) **absentes de npm**,
alors même que le run affichait `success`.

Le décalage n'est pas un bug mais la mécanique intrinsèque de release-please **et** de Changesets :
la publication n'a lieu qu'au run **qui constate** le commit de version déjà présent sur `main`.

## Décision

**Chaque run de `release.yml` exécute le CYCLE COMPLET en une seule fois, en deux passes internes,
avec auto-merge total.**

Pour les deux jobs (`release-please` et `release`) :

1. **Passe 1** — génération des changesets (`generate-changesets.mjs`) puis action
   (release-please / `changesets/action`) : ouvre (ou met à jour) la PR de version et l'**auto-merge
   en `--merge`** (la ruleset `main` interdit `--squash`, [ADR 0053](/atlas/decisions/0053-strategie-merge-commit-main/)).
2. **Attente active** — le step **poll l'état de la PR jusqu'à `MERGED`** (l'auto-merge est
   asynchrone : il patiente jusqu'au vert de la CI requise, ~3-5 min ; timeout ~20 min, échec dur
   si `CLOSED` ou dépassement).
3. **Passe 2** — sur `main` resynchronisé (`git reset --hard origin/main`), l'action est rejouée.
   Le commit de version étant désormais présent, release-please **pose le tag `vX.Y.Z` et crée la
   GitHub Release** ; Changesets, ne trouvant plus de changeset en attente, **publie** (sur npm
   public et sur GitHub Packages, provenance OIDC — [ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/))
   et crée les **GitHub Releases signées cosign** ([ADR 0087](/atlas/decisions/0087-signature-cosign-assets-release/)).

La passe 2 est **idempotente et sûre** : `generate-changesets.mjs` fenêtre les commits « depuis le
dernier `chore: version packages` » ; ce commit étant en `HEAD` après merge, l'intervalle est vide
→ aucun changeset recréé → pas de re-boucle d'ouverture de PR. Si la passe 1 n'avait rien à
releaser, les passes 2 sont des no-op (steps conditionnés à l'ouverture d'une PR).

**Auto-merge total assumé** : la PR de version n'est **plus relue à la main** avant publication
(revirement du garde-fou « PR relue avant merge » de l'ADR 0091). La correction du bump repose
entièrement sur des Conventional Commits disciplinés en amont.

Cette décision **supersede l'ADR 0091 sur deux points** : la « latence de publish d'un run »
(supprimée) et la « PR relue avant merge » (remplacée par l'auto-merge total). Le reste de l'ADR
0091 (séparation dépôt/paquets, génération depuis les commits scopés, cadence quotidienne) reste
en vigueur.

## Alternatives écartées

- **Le run se re-déclenche lui-même** (`gh workflow run release.yml` en fin de job) : plus simple à
  écrire, mais garde **deux runs** consécutifs (publication toujours décalée dans le temps, juste de
  minutes au lieu d'un jour) et dépend d'un enchaînement d'événements fragile. La passe interne rend
  le cycle **atomique dans un seul run**, observable d'un coup.
- **Repasser en publish-on-merge** (re-câbler un trigger sur le merge de la PR de version) : revient
  au modèle `push: main` que l'ADR 0091 a retiré **volontairement** pour maîtriser la cadence.
- **Conserver la latence d'un run** (statu quo 0091) : rejeté — versioning et publication sur deux
  nuits distinctes rendent l'état du dépôt trompeur (`success` sans tag ni publication).

## Statut

Accepted. Supersede partiellement l'[ADR 0091](/atlas/decisions/0091-release-depot-et-changesets-automatiques/)
(latence de publish + relecture manuelle de la PR de version).

## Conséquences

**Bénéfices.** Une nuit = un cycle complet : bump dépôt + changelog + tag `vX.Y.Z` + GitHub Release
**et** publication des paquets (npm + GitHub Packages, signés), sans intervention. Fin de l'état
trompeur « version bumpée mais rien de publié ».

**Prix à payer / tensions.**

- **Plus de relecture humaine de la PR de version.** Un `fix` réellement cassant mal marqué (sans
  `!`/`BREAKING CHANGE`) sous-bumperait et serait publié tel quel. Mitigation : discipline
  Conventional Commits ([ADR 0092](/atlas/decisions/0092-scope-enum-derive-du-workspace/)), revue de
  code en amont sur `main`. Un publish erroné se corrige par une version suivante (npm interdit le
  ré-écrasement d'une version).
- **Run plus long** (`timeout-minutes` relevé à 60) : la passe 1 attend la CI de la PR de version
  avant la passe 2. Acceptable pour un run nocturne.
- **Deux appels d'action par run** (passe 1 + passe 2) : coût CI marginal, borné par le no-op quand
  il n'y a rien à releaser.

**Garde-fous.** L'attente de merge échoue **dur** (pas de publication sur une PR non mergée). Le
`--merge` (jamais `--squash`) respecte la ruleset `main` ([ADR 0053](/atlas/decisions/0053-strategie-merge-commit-main/)).
Hooks jamais bypassés ([ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)).
`workflow_dispatch` reste disponible pour rejouer un cycle à la demande (re-publication,
post-incident).
