---
title: "0083 — Câblage d'OpenSSF Scorecard (note supply-chain et badge en tête)"
---

## Contexte

**OpenSSF Scorecard** (_Open Source Security Foundation_) est un outil qui **note
de 0 à 10** la santé de sécurité d'un dépôt open source au regard d'une vingtaine
de **checks** automatisés : protection de branche, **épinglage des dépendances**
(actions et paquets figés par empreinte plutôt que par tag mobile), **tokens à
privilèges minimaux** dans les workflows, présence d'une CI, d'une analyse
statique (_SAST_), d'un fuzzing, d'une politique de sécurité (`SECURITY.md`),
absence de secrets, revue de code, etc. Le score est **recalculé en continu** par
l'infrastructure OpenSSF et exposé par une API publique — donc affichable en
**badge dynamique** au sens strict de la [doctrine des badges](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/).

La [doctrine des badges (ADR 0070)](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)
a **explicitement réservé une place** à Scorecard tout en l'**écartant tant que
l'outil n'est pas câblé** : « OpenSSF Scorecard reste **hors périmètre tant qu'il
n'est pas câblé** : il pourra **revenir un jour** comme conséquence de cette
doctrine — une famille « sécurité » avec une place réservée pour quand le workflow
`scorecard.yml` tournera ». Un badge à vide étant **pire qu'un badge absent** (il
ment sur une garantie inexistante), le badge ne pouvait être posé avant le
câblage. Le présent ADR **est cette conséquence** : il câble l'outil, ce qui rend
le badge admissible.

Le dépôt réunit par ailleurs déjà plusieurs **prérequis** que Scorecard mesure et
créditera : actions GitHub **épinglées par SHA** (vérifiable dans
[`.github/workflows/`](https://github.com/univ-lehavre/atlas/tree/main/.github/workflows)),
**protection de branche** sur `main` ([ADR 0016](/atlas/decisions/0016-branch-protection-main/)),
analyse statique **CodeQL** câblée, **`SECURITY.md`** présent, **Dependabot**
actif. Le score n'est donc pas un pari : il **objective** des pratiques déjà en
place et **pointe** celles qui manquent encore.

## Décision

> **Le dépôt câble OpenSSF Scorecard via un workflow GitHub Actions dédié
> (`.github/workflows/scorecard.yml`), publie le résultat (onglet Security + API
> publique OpenSSF), et affiche son badge dynamique EN TÊTE du `README.md` comme
> signal de sécurité le plus structurant.**

### 1. Workflow

Un workflow [`scorecard.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/scorecard.yml)
exécute l'action officielle `ossf/scorecard-action` (épinglée par SHA, comme tout
le reste du dépôt). Il se déclenche sur **`push` vers `main`**, sur
**`branch_protection_rule`** (un changement de protection est l'un des critères
les plus lourds du score), en **planifié hebdomadaire** (décalé des autres jobs
cron et de la fenêtre Dependabot), et en **`workflow_dispatch`** manuel. Pas
d'exécution sur `pull_request` : le score mesure l'état de `main`, et la
publication exige un déclencheur sur la branche par défaut. Les **permissions**
suivent le principe du moindre privilège (`read-all` au niveau workflow ;
`security-events: write` et `id-token: write` accordés au seul job) — ce que
Scorecard mesure lui-même (_Token-Permissions_).

### 2. Publication

`publish_results: true` envoie le résultat sur l'API publique OpenSSF (condition
**nécessaire** au badge), et le SARIF est remonté dans l'**onglet Security** via
`upload-sarif` : les findings deviennent actionnables au même endroit que CodeQL.

### 3. Badge en tête

Le badge Scorecard est placé **sous le titre** du `README.md`, **seul**. C'est une
exception **assumée** à l'organisation « tous les badges groupés par famille, rien
en tête » retenue jusqu'ici : Scorecard est le **seul** badge qui synthétise en un
score unique, **recalculé en continu**, la santé sécurité **transverse** du
dépôt — il qualifie le dépôt entier, là où les autres badges qualifient une
famille. La doctrine de mise en avant du **signal le plus structurant** sous le
titre est précisément celle du dépôt jumeau `cluster`. Les autres badges restent
groupés par famille dans la section « Qualité revendiquée ».

## Alternatives écartées

- **Continuer sans Scorecard.** L'état antérieur : des pratiques de sécurité
  réelles mais **non synthétisées ni exposées**. Rejeté — c'est exactement le
  manque que la place réservée d'[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)
  anticipait.
- **Câbler l'outil mais ne pas afficher le badge.** Le score serait calculé sans
  être visible : on perd le bénéfice de signal, sans gagner en honnêteté (le badge
  est honnête **dès lors que** l'outil tourne). Rejeté.
- **Afficher le badge dans la famille « sécurité » plutôt qu'en tête.** Cohérent
  avec « rien en tête », mais cela **noie** le seul indicateur transverse parmi
  des badges de famille. Le score de chaîne d'approvisionnement mérite la place la
  plus visible — d'où l'exception tracée ici.
- **Exécuter sur `pull_request`.** Inutile (le score porte sur `main`) et
  impossible à publier depuis un fork (pas de permission `id-token`). Rejeté.

## Statut

Accepted (2026-06-29). Le workflow `scorecard.yml` est en place ; le badge est
ajouté au `README.md`. Le **premier score** sera disponible après la première
exécution sur `main` (au merge de cette décision), puis recalculé en continu.

## Conséquences

**Bénéfices.** La santé sécurité de la chaîne d'approvisionnement passe
d'**affirmée et dispersée** à **mesurée, publiée et recalculée en continu**, en un
score unique vérifiable par tout visiteur. Les findings rejoignent l'onglet
Security à côté de CodeQL. Le badge le plus structurant occupe la place la plus
visible, conformément à la pratique du dépôt `cluster`. La place réservée par
[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/) est
honorée **sans déroger** à sa règle d'or (un badge n'est posé qu'une fois l'outil
câblé).

**Prix à payer.** Une **action externe de plus** à maintenir et à garder épinglée
(suivi du SHA au fil des releases, via Dependabot actions). Le score peut **mettre
en lumière des écarts** (par exemple un check _Fuzzing_ ou _Signed-Releases_ non
satisfait) : c'est l'effet recherché, mais cela rend publique une note qui n'est
pas 10/10 — assumé, l'honnêteté primant sur le vernis
([ADR 0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/)).

**Garde-fous.**

- **Un seul badge en tête.** L'exception « en tête » est **réservée** à Scorecard
  (signal transverse recalculé en continu) ; tout autre badge reste groupé par
  famille dans « Qualité revendiquée » ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).
- **Badge honnête par construction.** Le badge étant servi par l'API OpenSSF, il
  reflète l'état réel ; il ne porte **jamais** un score recopié à la main.
- **Privilèges minimaux** dans le workflow — à la fois exigence de sécurité et
  critère que Scorecard mesure sur lui-même.
- **Neutralité** : Scorecard note des pratiques **génériques** de santé OSS, sans
  ancrer le dépôt dans un domaine ou une marque
  ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
