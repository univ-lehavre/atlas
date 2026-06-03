---
title: "0027 — Rôle de security champion : ouvert (vacant)"
---

## Contexte

Le dépôt produit des alertes de sécurité automatisées : CodeQL (SAST),
Semgrep, Dependabot, gitleaks, audit licences. Leur **triage** (confirmer,
dismisser avec justification, ouvrir un fix) demande une responsabilité
nommée — sinon les alertes s'accumulent sans propriétaire et la
[politique de SLA de remédiation](0018-sla-remediation-findings) n'a
personne pour la tenir.

Jusqu'ici, ce rôle de **security champion** vivait comme un item « à
arbitrer » dans `TODO.md` (fichier supprimé en fin de plan de
résorption). Le dépôt a par ailleurs un **bus-factor de 1** : un seul
mainteneur durable, ce qui rend la désignation d'un champion distinct
structurellement impossible aujourd'hui.

## Décision

**Le rôle de security champion est acté comme _ouvert_ (vacant).** Il
n'est pas attribué tant que le dépôt reste à un seul mainteneur durable.
En attendant, le triage des alertes est assuré **par défaut par le
mainteneur principal**, qui cumule donc les deux rôles — situation
explicitement reconnue comme non idéale (pas de séparation des
responsabilités, pas de redondance).

### Critères de désignation (quand un second contributeur durable arrive)

- **Compétence** : capacité à lire une alerte CodeQL/Semgrep et à juger
  vrai positif / faux positif avec justification écrite.
- **Disponibilité** : peut tenir le SLA de [ADR 0018](0018-sla-remediation-findings)
  (triage sous le délai défini par sévérité).
- **Indépendance** : idéalement **distinct** du mainteneur qui écrit le
  plus de code, pour une vraie séparation des responsabilités.
- **Continuité** : engagement durable (le rôle perd son sens s'il tourne
  à chaque sprint).

## Statut

Accepted (2026-06-01).

## Conséquences

**Bénéfices.** La responsabilité du triage de sécurité a un statut
explicite (vacant, assuré par défaut) plutôt qu'un flou. Les critères de
désignation sont prêts : le jour où un second mainteneur arrive, la
décision d'attribution est immédiate. Le bus-factor = 1 est nommé comme
risque assumé, pas ignoré.

**Prix à payer.** Tant que le rôle est vacant, le mainteneur principal
cumule écriture du code et triage de ses propres alertes — pas de
séparation des responsabilités, pas de redondance en cas
d'indisponibilité. Une alerte critique pendant une absence du mainteneur
unique reste un point faible.

**Garde-fous.**

- L'arrivée d'un second contributeur durable (cf. Phase 5.2 du tableau
  sine die de [ADR 0001](0001-devsecops-perimetre-repo-sine-die))
  rouvre cette décision pour attribuer le rôle.
- Le SLA de [ADR 0018](0018-sla-remediation-findings) reste la
  référence opérationnelle pour le triage, quel que soit le titulaire.
- L'audit semestriel vérifie que le triage est effectivement tenu, même
  par un mainteneur unique.
