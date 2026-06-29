---
title: "0086 — Posture vis-à-vis des paliers Best Practices (silver visé, gold exclu)"
---

## Contexte

Le badge **OpenSSF Best Practices** comporte trois paliers : `passing`, `silver`,
`gold`. Atlas câble le `passing` (projet [13440](https://www.bestpractices.dev/projects/13440),
answer-sheet [2026-06-29](/atlas/audit/2026-06-29-best-practices-badge-answer-sheet/)).
La question des paliers supérieurs se pose **avant** toute action, pour ne pas
courir après un palier dont le gain ne dépasse pas le coût _ici_, ni cocher des
cases que le dépôt ne peut honnêtement revendiquer.

Un **passage de faisabilité** a croisé les **47 MUST silver** et **21 MUST gold**
officiels avec l'état **réel** d'atlas (vérification adversariale) :
[audit 2026-06-30](/atlas/audit/2026-06-30-best-practices-silver-gold-faisabilite/).
Il en ressort deux faits structurants :

- **Gold** exige, en MUST, trois critères qui supposent une **seconde personne** —
  `bus_factor` ≥ 2, `contributors_unassociated`, `two_person_review` ≥ 50 % —
  incompatibles avec le **bus-factor = 1 assumé** du dépôt ([ADR 0027](/atlas/decisions/0027-security-champion/)).
- **Silver** n'a **aucun** MUST exigeant une 2ᵉ personne, mais son acquisition
  bute sur un chantier réel — la **couverture de tests** (`test_statement_coverage80`)
  n'est ni atteinte ni imposée : le gate CI agrégé est à **40**
  (`pnpm coverage:report 40`), pas 80.

La tension décisive est **doctrinale** : plusieurs critères silver/gold se cochent
par **affirmation déclarative**. Or atlas n'affiche que des signaux **vrais et
vérifiables** ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/),
[ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/)). Poursuivre un palier
gagné par déclaration entrerait en conflit avec cette honnêteté.

## Décision

> **Atlas vise le palier `silver`, n'vise PAS `gold`, et ne revendique aucun palier
> par case déclarative.** Gold est **exclu** tant que le dépôt reste
> mono-mainteneur. Silver est **visé sous condition** : il ne sera demandé qu'une
> fois fermés **honnêtement** les deux verrous réels — couverture de tests ≥ 80 %
> (dette résorbée _puis_ gate relevé, jamais l'inverse) et continuité d'accès (2ᵉ
> admin d'organisation réel + plan de succession).

### 1. Gold exclu — choix tracé, pas manque

Les trois MUST « deux personnes » ne se débloquent que par un **second mainteneur
durable et indépendant**, ce qui change la nature du projet. On **n'attend pas**
gold et on **documente pourquoi** (mono-maintenance assumée), au lieu de gonfler
des cases.

### 2. Silver conditionné à une fermeture honnête

`test_statement_coverage80` : on **résorbe la dette de tests par paquet**, **puis**
on remonte le gate agrégé de 40 vers 80. Relever le chiffre avant la dette serait
un coverage trompeur, proscrit par [ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/).
`access_continuity` : traité par un fait (2ᵉ admin + succession), jamais par
déclaration.

### 3. Quick-wins à valeur intrinsèque, découplés du badge

Certains compléments silver valent **par eux-mêmes** et sont réalisés au fil de
l'eau **pour leur valeur propre**, pas pour décrocher un palier : `GOVERNANCE.md`,
`ROADMAP.md`, phrase-politique de tests dans `CONTRIBUTING.md`, activation 2FA
d'org, signature des tags de version.

## Alternatives écartées

- **Viser gold.** Trois MUST structurellement bloqués à bus-factor = 1 ; les
  cocher serait mentir. Rejeté.
- **Viser silver tout de suite, cases déclaratives incluses.** Cocher
  `coverage 80` (gate à 40), `access_continuity` (1 admin) ou `regression_tests_added50`
  (non mesuré) serait surdéclaratif — exactement ce que la doctrine d'honnêteté
  bannit. Rejeté.
- **Ne rien viser au-delà de passing.** Écarté : plusieurs verrous silver ont une
  **valeur intrinsèque** (gouvernance, roadmap, couverture) ; on les poursuit pour
  cette valeur, le palier suivant comme conséquence éventuelle, pas comme objectif
  en soi.

## Statut

Accepted (2026-06-30).

## Conséquences

**Bénéfices.** La trajectoire est **honnête et bornée** : on investit là où il y a
une valeur réelle (couverture, gouvernance, continuité), pas dans des cases. Le
refus de gold est **tracé** (mono-maintenance), pas subi. Le dépôt ne revendiquera
jamais un palier qu'il ne peut prouver.

**Prix à payer.** Le badge restera à `passing` (puis `silver` une fois la
couverture close) — pas de `silver`/`gold` rapide « pour la vitrine ». La dette de
couverture est un effort **L** réel à porter.

**Garde-fous.**

- **Aucun palier coché par déclaration** : chaque MUST revendiqué est adossé à une
  preuve vérifiable (R. doctrine [ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).
- **Couverture : dette d'abord, gate ensuite** — jamais le chiffre avant les tests.
- **Réévaluer gold** si le bus-factor passe à ≥ 2 (cohérent avec le garde-fou
  d'[ADR 0016](/atlas/decisions/0016-branch-protection-main/) sur l'arrivée d'un 2ᵉ
  mainteneur).
- **Neutralité** : les critères « copyright/licence par fichier » restent écartés
  (lourds, en tension avec la neutralité d'[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
