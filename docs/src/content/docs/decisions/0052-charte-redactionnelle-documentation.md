---
title: 0052 — Charte rédactionnelle de la documentation (règles de relecture)
---

## Contexte

Les ADR [0013](/atlas/decisions/0013-documentation-public-non-expert-fr/)
(public non-expert, FR), [0025](/atlas/decisions/0025-documentation-multi-niveaux/)
(trois niveaux surface/profondeur/inline) et
[0028](/atlas/decisions/0028-documentation-verifiable/) (doc vérifiable)
fixent **qui** lit, **à quel niveau** et **avec quelle fiabilité**. Ils ne
disent pas **comment rédiger** une page concrète.

Une relecture éditoriale complète de la documentation en ligne (grille page par
page) a fait remonter des remarques **récurrentes** : sections sans
introduction, termes non définis (git, framework, Node, pnpm, SAST/DAST,
branche, pull request…), diagrammes parachutés, tableaux de statistiques
désalignés ou inintelligibles (« 182 % de densité »), choix techniques énoncés
mais non justifiés, contenu hors-sujet, compteurs faux (« 43 ADR » alors qu'il y
en a 51). Ces remarques ne sont pas propres à une page : ce sont les **mêmes
défauts** répétés.

Plutôt que de corriger 20 pages au cas par cas, on **capitalise le principe** :
une charte rédactionnelle opposable, dérivée de ces remarques, applicable à
toute la documentation existante et future. C'est l'objet de cet ADR. Il
**opérationnalise** 0013/0025/0028 (le _comment_) sans les redéfinir.

## Décision

> **Toute page de documentation respecte les huit règles ci-dessous. Elles sont
> la grille de relecture de référence : une page n'est « relue » que lorsqu'elle
> les satisfait toutes. Les règles mécanisables sont vérifiées par
> `audit:docs` ; les autres relèvent de la relecture humaine.**

### R1 — Toute section s'ouvre par une introduction

Chaque section (et chaque page) commence par un paragraphe qui dit **quoi** et
**pourquoi c'est important**, _avant_ tout diagramme, tableau ou liste. La barre
de navigation de gauche comporte, par grande section, une entrée
« Introduction » qui résume ce qui est développé et son intérêt. Corollaire :
pas de section « Vue d'ensemble » réduite à un diagramme.

### R2 — Tout terme spécialisé est défini à sa première apparition

Aucun acronyme, outil ou concept non grand-public n'apparaît sans définition
**inline** (ou lien vers le [glossaire](/atlas/glossary/)) : git, framework,
JavaScript, TypeScript, Node.js, pnpm, branche, commit, push, pull request,
SAST, DAST, CodeQL, Semgrep, rate-limiting… La définition vient à la **première**
occurrence. Règle héritée et durcie de 0013/0025 (niveau surface).

### R3 — Les diagrammes sont amenés, jamais parachutés

Un diagramme/graphe est **précédé** d'une phrase qui dit ce qu'il montre et
pourquoi on le regarde. Un diagramme spécifique à un paquet vit **dans la page
de ce paquet**, pas dans une page transverse où il « arrive comme un cheveu sur
la soupe ».

### R4 — Les statistiques sont alignées, contextualisées, intelligibles

Tout tableau ou encart de statistiques est **aligné** (colonnes verticales) et
chaque chiffre a un **sens explicite** : unité, définition, plage attendue. Une
statistique qu'on ne sait pas interpréter (« 182 % de densité ») est soit
explicitée, soit retirée. Les métriques dérivées du dépôt (lignes de code/doc,
historique git) sont **remises dans leur contexte** (p. ex. rattachées à la
carte des paquets).

### R5 — Un choix technique est justifié, pas seulement énoncé

Tout choix (langage, paradigme, outil, bibliothèque) expose **pourquoi**,
**contre quelles alternatives** et **à quel prix** (avantages _et_
inconvénients). Deux outils proches (p. ex. CodeQL vs Semgrep) sont
**différenciés**. Le _pourquoi_ durable et structurant relève d'un ADR ; la page
le résume et y renvoie. Prolonge la règle « alternatives écartées » de 0025.

### R6 — Une page, un sujet ; ce qui déborde migre

Le contenu hors-périmètre d'une page **sort** vers la bonne page (p. ex. les
variables d'environnement d'un service n'ont rien à faire dans « Choix
techniques » ; « Paquets racines » mérite sa page). Un sous-thème qui grossit
devient sa propre page.

### R7 — Le vocabulaire du flux git est unifié et explicite

Les termes **commit, push, branche, pull request, merge** sont définis une fois
(niveau surface) et employés de façon **cohérente** partout. Proscrire les
formulations vagues type « fusion dans main » sans expliciter le flux
sous-jacent.

### R8 — Les artefacts numérotés sont exacts et nommés uniformément

Les **compteurs** (nombre d'ADR, d'audits, de plans) affichés dans les pages
**catalogue** (index et parcours des décisions) sont **exacts** et tenus à jour
— ailleurs, un sous-ensemble nommé (« six ADR de cadrage », instantané d'audit
daté) reste légitime. ADR, audits et plans visent une **convention de nommage
homogène** (audits et plans s'alignant sur le schéma numéroté des ADR).
Mécanisé : `audit:docs` (contrôle `W7`) signale tout « N ADR » obsolète dans
l'index et le parcours.

## Statut

Accepted (2026-06-07). Opérationnalise [0013](/atlas/decisions/0013-documentation-public-non-expert-fr/),
[0025](/atlas/decisions/0025-documentation-multi-niveaux/) et
[0028](/atlas/decisions/0028-documentation-verifiable/) ; ne les remplace pas.
Issue de la relecture éditoriale de la documentation en ligne
([#341](https://github.com/univ-lehavre/atlas/issues/341)). S'applique à la
documentation **existante** (relecture progressive page par page) et **future**
(toute nouvelle page naît conforme).

## Conséquences

**Bénéfices.** La relecture devient **industrialisable** : une grille unique,
opposable, au lieu de 20 jugements ad hoc. Le lecteur néophyte n'est jamais
bloqué par un terme non défini (R2) ni par un visuel sans contexte (R1, R3) ; le
lecteur expert obtient des justifications, pas des affirmations (R5). Les
chiffres deviennent fiables et interprétables (R4, R8).

**Prix à payer.** L'application à l'existant est un **chantier** (≈20 pages).
R2/R5 alourdissent les pages courtes — à arbitrer par le niveau de lecture
(0025) : une définition inline brève au niveau surface, le détail au niveau
profondeur. Le risque de **redondance** (mêmes définitions répétées) se gère par
le glossaire et des renvois, pas par la duplication non maîtrisée.

**Garde-fous.**

- **Mécanisable d'abord** : `audit:docs` porte ce qui se vérifie sans jugement —
  exactitude des compteurs d'ADR des pages catalogue (R8, contrôle `W7`, livré
  ici), à terme la présence d'une intro de section (R1). Le reste reste de la
  **relecture humaine**.
- **Relecture progressive** : on n'attend pas une passe « big bang » ; chaque
  page touchée pour une autre raison est mise en conformité au passage.
- Réévaluation à la **cadence d'audit transverse**
  ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
