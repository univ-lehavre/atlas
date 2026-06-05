---
name: Revue quotidienne
about: Revue personnelle d'une dimension du dépôt (source, test, doc, dette). Ouverte chaque jour ouvré par daily-review.yml ; remplissable à la main pour une revue hors-calendrier.
title: "Revue quotidienne — <date> — <cible>"
labels: revue-quotidienne
---

<!--
Support de revue MANUELLE (ADR 0044). La cible du jour est désignée
automatiquement par `scripts/audit/daily-target.mjs`. Tu inspectes la cible
toi-même, tu consignes tes constats aux trois échelles ci-dessous, PUIS on en
discute (Claude) pour décider des implications et de la suite.

Le constat doit être PROUVÉ par le code (fichier:ligne), jamais une impression.
-->

## Cible du jour

- **Dimension** : <!-- source | test | docs | debt -->
- **Cible** : <!-- chemin du fichier, fonction, ou id de dette -->
- **Pourquoi cette cible** : <!-- raison fournie par le sélecteur -->
- **Indices** : <!-- commandes / fichiers à regarder -->

## Micro — le constat local

> Ce qui est devant moi, dans cette cible précise.

- **Constat** (prouvé, `fichier:ligne`) :
- **Amélioration immédiate proposée** :
- **Effort estimé** : <!-- trivial | petit | moyen -->

## Meso — le motif récurrent

> Ce constat est-il un cas isolé, ou le symptôme d'un motif présent ailleurs ?

- **Récurrence observée** (autres fichiers/paquets concernés) :
- **Piste de systématisation** : <!-- règle lint, check d'audit, convention, helper partagé… -->

## Macro — l'implication structurante

> Cette revue dégage-t-elle une réflexion qui engage tout le dépôt ?

- **Question structurante** : <!-- ex. faut-il une convention ? un socle ? un ADR ? -->
- **Candidat ADR / plan** : <!-- oui/non + intitulé pressenti -->

## Décision

- [ ] Rien à faire (cible saine — consigner pourquoi)
- [ ] Amélioration locale → PR directe
- [ ] Ouvrir une issue de suivi (`enhancement` / `tech-debt`)
- [ ] Rédiger un **ADR** (réflexion structurante)
- [ ] Inscrire dans un **plan** de résorption

<!-- Une fois ma revue consignée, j'en discute avec Claude (implications
micro/meso/macro) avant d'agir. Voir ADR 0044. -->
