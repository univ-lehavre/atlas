---
title: Gouvernance
---

Cette page est un **portail d'orientation** vers la gouvernance du dépôt : les
**décisions** qui le façonnent, les **audits** qui le mesurent, les **écarts** connus
et les **plans** qui les résorbent. Conformément à
[ADR 0076](/atlas/decisions/0076-portails-orientation-accueil-par-intention/), elle
**pointe** vers chaque point d'entrée et **ne recopie** ni chiffre ni statut : ces
sources s'actualisent en continu, la page suit le lien.

## Décisions (ADR)

Les choix structurants sont tracés en **ADR** (_Architecture Decision Record_) : le
_pourquoi_, le contexte, les conséquences. →
[Index des décisions](/atlas/decisions/) (liste par numéro et statut) +
[Parcours thématique](/atlas/decisions/parcours/) (un tour guidé par sujet).

## Audits

Des **audits transverses** datés mesurent la maturité du dépôt face à des
référentiels établis ; les **reconnaissances** consignent le terrain exploré avant un
lot structurant. →
[Index des audits](/atlas/audit/) +
[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/) (cadence).

## Écarts (registre des drifts)

Le **registre des drifts** est l'**entrée canonique des écarts** révélés à
l'exécution : chaque entrée porte sa nature, sa cause, son correctif et son statut
(corrigé / ouvert / caduc). Un drift `ouvert` doit lier une **issue** au build — le
registre et les issues se répondent. →
[Registre des drifts](/atlas/audit/registre-drifts/) +
[ADR 0056](/atlas/decisions/0056-registre-drifts/) +
[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/).

## Couverture des tests

La **matrice de couverture E2E** cartographie ce qui est testé de bout en bout et
**nomme les trous** restants. →
[Matrice de couverture E2E](/atlas/quality/matrice-e2e/).

## Plans de résorption

Chaque audit qui révèle des écarts est suivi d'un **plan** d'action phasé,
exécutable. →
[Index des plans](/atlas/plans/).

## Issues ouvertes

Le suivi fin des chantiers et des écarts ouverts vit dans les **issues** du dépôt
(étiquettes `enhancement`, `tech-debt`). →
[Issues GitHub](https://github.com/univ-lehavre/atlas/issues).

## Méta-gouvernance

Comment cette gouvernance documentaire est elle-même tenue (registre durci, cohérence
de l'index, matrice E2E) : →
[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/).
