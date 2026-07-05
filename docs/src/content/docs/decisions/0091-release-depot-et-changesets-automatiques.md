---
title: "0091 — Release de dépôt (release-please) + changesets automatiques, cadence quotidienne"
---

## Contexte

Le monorepo publie ses **paquets** individuellement via **Changesets** (npm public et GitHub
Packages, provenance OIDC — [ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/) ;
assets signés cosign — [ADR 0087](/atlas/decisions/0087-signature-cosign-assets-release/)). Trois
manques structurels sont apparus :

1. **Pas de version de DÉPÔT.** Chaque paquet a sa version npm, mais le monorepo
   lui-même n'a plus de version depuis `v1.2.1` (janvier 2026). `CITATION.cff` n'avait
   donc aucun champ `version` citable (contrairement au dépôt `cluster`).
2. **Changesets non écrits.** La discipline « un changeset par PR » a dérivé : des
   commits scopés (Conventional Commits, [ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints/))
   s'accumulaient sans changeset → paquets jamais releasés malgré des changements réels.
3. **Cadence non maîtrisée.** Le déclencheur `push: main` publiait à **chaque** merge.

## Décision

**Trois volets, artefacts DISJOINTS de Changesets.**

**a. Release de DÉPÔT via release-please.** Un job `release-please` (`release-type: node`,
`release-please-config.json` + `.release-please-manifest.json`) versionne le **monorepo** à
partir des Conventional Commits : il bumpe la `version` du **`package.json` racine** (passé
`private: true` — jamais publié, hors des workspaces `pnpm`) + **`CITATION.cff`** (`extra-files`,
marqueur `x-release-please-version`) et tague **`vX.Y.Z`** (reprend après `v1.2.1`). N'interfère
pas avec Changesets : il ne touche QUE la racine + le tag `vX.Y.Z` ; Changesets versionne les
paquets du workspace (scopés `@univ-lehavre/atlas-*`).

**b. Changesets GÉNÉRÉS des Conventional Commits.** Un step `generate-changesets.mjs` (avant
l'action Changesets) dérive les changesets des commits scopés depuis la dernière release :
**scope → paquet** (le scope EST le basename du dossier du paquet, [ADR 0092](/atlas/decisions/0092-scope-enum-derive-du-workspace/)),
**type → bump** (`feat` → minor, `fix`/`perf` → patch, `!`/`BREAKING CHANGE` → major). Ignore
les scopes méta, saute les paquets `private` ([ADR 0011](/atlas/decisions/0011-paquets-internes-private/)),
avertit sur un scope inconnu. Un changeset par paquet (bump max). La discipline « changeset
manuel » n'est plus requise : le message de commit scopé SUFFIT.

**c. Cadence QUOTIDIENNE 03:00 UTC.** Le workflow passe de `push: main` à
`schedule: '0 3 * * *'` + `workflow_dispatch`. Les changements s'accumulent, une seule release
nocturne les publie (dépôt + paquets).

## Alternatives écartées

- **Basculer TOUS les paquets sur release-please** (abandon de Changesets) : réécrirait toute la
  chaîne publish/OIDC/cosign (ADR 0017/0087) et perdrait la granularité par-paquet de Changesets.
  release-please est réservé à la version de DÉPÔT ; Changesets reste maître des paquets.
- **Versionner la racine via Changesets (`fixed`)** : forcerait tous les paquets à la même
  version, cassant l'indépendance par-paquet. La racine n'est PAS dans les workspaces `pnpm` →
  Changesets l'ignore → release-please peut la posséder sans conflit.
- **Garder les changesets manuels** : la dérive constatée (aucun changeset accumulé) prouve que
  la discipline manuelle ne tient pas ; la génération depuis les commits scopés est déterministe.

## Statut

Accepted. Partiellement superseded par l'[ADR 0093](/atlas/decisions/0093-release-cycle-complet-une-nuit/)
sur deux points : la « latence de publish d'un run » (supprimée — cycle complet en un seul run
nocturne) et la relecture manuelle de la PR de version (remplacée par un auto-merge total).

## Conséquences

**Bénéfices.** atlas a une version de dépôt citable (`CITATION.cff` + tag `vX.Y.Z`) alignée sur
`cluster`. Les paquets se releasent sans oubli de changeset. La cadence est prévisible.

**Prix à payer / tensions.**

- **Deux automatisations de release** (release-please pour le dépôt, Changesets pour les paquets)
  → deux PR de release distinctes (« release atlas vX.Y.Z », « chore: version packages »), sur
  des fichiers disjoints. Coût cognitif assumé pour la séparation dépôt/paquets.
- **Latence de publish** : en `schedule` seul (sans `push`), le publish/tag suit d'UN run le
  merge (auto-mergé) de la PR de version. Acceptable pour une cadence quotidienne.
- **Bump dérivé du type de commit** : suppose des Conventional Commits disciplinés (surtout le
  `!`/`BREAKING CHANGE` pour un major). Un `fix` réellement cassant mal marqué sous-bumperait —
  le mainteneur relit la PR de version avant merge.

**Garde-fous.** La PR « chore: version packages » (générée) est **relue avant merge** (impact
release visible via `changeset status`). Les scopes restent contraints par commitlint
([ADR 0092](/atlas/decisions/0092-scope-enum-derive-du-workspace/)). Hooks jamais bypassés
([ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)).
