---
title: 0018 — SLA de remédiation des findings sécurité
---

## Contexte

Les outils de qualité du monorepo (`pnpm audit`, CodeQL, Semgrep,
audit licences, audit dépendances inutilisées) émettent régulièrement
des findings classés par sévérité. Sans **politique de remédiation
explicite**, deux dérives apparaissent :

- les findings de basse sévérité s'accumulent indéfiniment, faisant
  perdre le signal des findings de haute sévérité qui se cachent
  dans le bruit ;
- les findings de haute sévérité restent ouverts trop longtemps parce
  qu'aucun délai n'est documenté pour les fermer.

Un SLA (Service Level Agreement) fixe par sévérité un **délai cible**
de fermeture, qui sert à la fois de garde-fou et de signal pour
prioriser les chantiers sécurité.

## Décision

Les findings sécurité sont classés et remédiés selon le SLA suivant :

| Sévérité | Délai cible  | Comportement                                            |
| -------- | ------------ | ------------------------------------------------------- |
| Critical | 7 jours      | Hotfix prioritaire ; mobilisation immédiate.            |
| High     | 30 jours     | Planifié dans le prochain sprint utile.                 |
| Medium   | 90 jours     | Adressé au cours d'un chantier régulier ou de la dette. |
| Low/Info | Opportuniste | Remédié à l'occasion, pas de délai engagé.              |

Le SLA et son application sont documentés dans
[docs/quality/security.md](/atlas/quality/security/).

## Statut

Accepted.

## Conséquences

**Bénéfices.** Les findings de haute sévérité ne dorment pas. La
priorisation des chantiers sécurité a une grille de lecture claire.
Les findings Low/Info ne bloquent pas le travail courant.

**Prix à payer.** Le suivi des délais demande une discipline (revue
mensuelle des findings ouverts). Une explosion soudaine du nombre de
findings High peut faire dérailler le sprint courant.

**Garde-fous.**

- La revue des findings ouverts est conduite à intervalle régulier
  (mensuel) ; les dépassements de SLA sont documentés et justifiés.
- L'audit semestriel revoit le SLA lui-même (les délais sont-ils
  réalistes vu la vélocité du projet ?).
- Cet ADR est révisé si la posture sécurité du projet change
  (ex. déploiement multi-instance, traitement de données sensibles).
