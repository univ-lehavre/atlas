---
title: 0012 — Neutralisation du framing institutionnel
---

## Contexte

La documentation initiale du dépôt positionnait `atlas` comme
« plateforme de recherche universitaire », avec des références
récurrentes à l'université, aux chercheurs et au monde académique.
Ce framing avait deux effets indésirables :

- **Il restreignait implicitement le public cible.** Un contributeur
  non-chercheur (développeur ops, étudiant en stage, contributeur
  externe ponctuel) lisait le README et ne se sentait pas concerné.
- **Il rendait redondante l'identité GitHub.** Le dépôt vit déjà sous
  l'organisation `@univ-lehavre/atlas` ; répéter l'ancrage institutionnel
  dans chaque page de documentation ajoutait du bruit sans clarifier.

L'organisation `@univ-lehavre` reste légitime et explicite (elle porte
la propriété intellectuelle, les paquets npm, et l'identité du
dépôt). Mais elle suffit à elle seule à signaler le rattachement.

## Décision

La documentation du monorepo (README, `docs/`, READMEs des paquets) ne
positionne plus `atlas` comme « plateforme de recherche » ni ne fait
référence à la recherche ou aux chercheurs comme cibles principales.
Le dépôt est présenté pour ce qu'il est techniquement : un monorepo
de plusieurs applications et bibliothèques, accessibles à tout
contributeur logiciel.

L'ancrage institutionnel se limite à :

- l'organisation GitHub `@univ-lehavre` (URL, scope npm) ;
- la mention de la licence et du propriétaire ;
- les références aux **plateformes** consommées par les apps (REDCap,
  Appwrite) quand elles ont un sens technique direct.

## Statut

Accepted (2026-05-27, PRs #211, #212).

## Conséquences

**Bénéfices.** La documentation est lisible par un public plus large.
Un contributeur logiciel sans lien avec l'université peut lire le
README, comprendre la structure du monorepo, et contribuer sans
avoir à interpréter du jargon académique. Le ton reste factuel.

**Prix à payer.** Le contexte historique (« pourquoi le projet existe »)
n'est plus explicite dans la documentation publique. Cela peut surprendre
un lecteur qui attendrait une présentation institutionnelle.

**Garde-fous.**

- Les contributions documentaires sont revues sur ce critère : éviter
  les références institutionnelles superflues, garder un ton factuel.
- Voir aussi [ADR 0013](0013-documentation-public-non-expert-fr) sur
  la cible non-expert et la langue de la documentation.
