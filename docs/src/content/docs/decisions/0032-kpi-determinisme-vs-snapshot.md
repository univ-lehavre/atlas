---
title: "0032 — KPI documentés : généré déterministe (diff-checké) vs snapshot (append-only)"
---

## Contexte

L'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/) a posé un modèle anti-dérive
éprouvé : ce qui est **factuel et dérivable du code** est **généré, commité, et
comparé octet par octet en CI** (`docs:generate:check`, sur le modèle de
`check-lockfile`). Ce modèle marche pour une donnée **déterministe** — la carte
des paquets, dérivée des `package.json`, sans horodatage.

On veut maintenant documenter des **indicateurs (KPI) de robustesse du code et
leur évolution** : couverture de tests, densité de tests/types, vulnérabilités,
code mort, duplication, dette (`TODO(owner, date)`, dérogations), lignes de code
et pull requests dans le temps. Le but est un **tableau de bord** lisible depuis
la documentation, montrant non seulement l'état présent mais sa **tendance**.

Le problème : **le modèle diff-check d'ADR 0028 casse pour ces KPI.** Un
indicateur « aujourd'hui » (lignes de code à l'instant `T`, couverture exécutée,
vulnérabilités connues) **change à chaque commit** et **n'est pas régénérable à
l'identique** depuis l'arbre Git. Le comparer par octets produirait des faux
positifs garantis : la CI serait perpétuellement rouge.

Il faut donc une règle claire qui dise **quel KPI relève du diff-check et lequel
n'en relève pas**, sans renoncer ni à l'anti-dérive ni à l'historisation.

## Décision

> **Diff-check ⟺ reproductible octet par octet. Sinon : série append-only +
> audit de cohérence structurelle.**

On classe chaque donnée selon qu'elle est **reproductible** depuis l'arbre/
l'historique Git à un `HEAD` donné, et on lui applique le traitement
correspondant. Les deux familles ne se mélangent **jamais dans le même fichier**.

### A. Données dérivées de Git → générées et diff-checkées

Une donnée qui est une **fonction déterministe de l'arbre ou de l'historique
Git** (lignes ajoutées/supprimées par mois, pull requests mergées par mois,
nombre de `TODO(owner, date)`, dérogations [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/),
exemptions de couverture) est **régénérée, commitée, et comparée par octets** —
exactement comme la carte des paquets (ADR 0028).

- **Impératif : aucun horodatage** dans la sortie diff-checkée. Un champ
  `generatedAt` rendrait la comparaison impossible. (C'est pourquoi le markdown
  de la carte des paquets n'en contient aucun.)
- Une PR qui modifie l'historique régénère naturellement les périodes concernées
  **dans la même PR** (déclencheur de mise à jour, [ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/)).
- Le générateur doit produire **exactement le style Prettier**, sinon le
  contrôle de fraîcheur boucle (leçon de l'ADR 0028).

### B. Snapshots de l'état présent → série append-only, jamais diff-checkée

Une donnée qui dépend de l'**exécution** (couverture mesurée par les tests) ou
d'un **état serveur** (advisories de sécurité) **n'est pas reproductible** depuis
l'arbre. On ne peut ni la régénérer ni la comparer.

- Elle est **historisée dans un fichier de séries append-only commité**
  (`docs/.vitepress/data/kpi-history.json`), où l'intégration continue **ajoute
  une entrée datée** par exécution sur `main`.
- **Granularité : une entrée par jour au maximum** (idempotent — une nouvelle
  exécution le même jour écrase l'entrée du jour, n'empile pas). Croissance
  bornée (~365 lignes/an).
- Écriture **sur `main` uniquement** (jamais sur une PR) : les PR ne modifient
  pas la série, donc **ni conflit de merge, ni diff parasite en revue**.
- L'audit ne vérifie **pas une égalité** mais des **invariants structurels** :
  JSON valide, dates strictement croissantes, pas de doublon de date, schéma
  respecté, dernière date ≤ aujourd'hui. C'est **cohérence**, pas **fraîcheur** —
  aligné sur l'esprit de l'ADR 0028 (« on audite des invariants, jamais la
  valeur rédactionnelle »).

### C. Fichiers hybrides ou volatils → régénérés, non commités, non diff-checkés

Un fichier qui **mélange** du déterministe et du volatil (par exemple un
`repo-stats.json` portant à la fois une timeline Git et un `generatedAt`) **n'est
pas commité** : il est régénéré au build de la documentation et alimente
l'affichage, sans entrer dans le diff-check. Ce qu'on diff-checke, c'est la
**page Markdown générée** (déterministe), pas le JSON volatil qui la nourrit.

### Conséquence sur le rendu

- Les **chiffres volatils ne figurent jamais en dur** dans un Markdown commité :
  ils sont rendus au build par des composants lisant les fichiers de données.
  Ainsi la page commitée reste stable tant que sa structure (liste de paquets,
  liste de `TODO`) ne change pas.
- Les **graphes d'évolution dérivés de Git** (déterministes) peuvent, eux, vivre
  dans le Markdown généré et être diff-checkés.

## Statut

Accepted (2026-06-02). Étend [ADR 0028](/atlas/decisions/0028-documentation-verifiable/)
(documentation vérifiable) sans la remplacer ; en applique le principe à des
données partiellement non déterministes.

> **Note (2026-06-03).** La **règle de classification A/B/C reste en vigueur** :
> elle dicte comment traiter toute métrique documentée. En revanche, le
> **mécanisme de série append-only de la classe B** (le fichier
> `kpi-history.json` et le job planifié qui l'alimentait) a été **retiré** : à
> ce jour, aucune métrique de classe B n'est historisée. Les sections B
> ci-dessous décrivent donc le **modèle à appliquer** si une telle métrique est
> réintroduite, pas un dispositif actuellement déployé. Les métriques de classe
> A (graphes dérivés de Git, diff-checkés) restent en place.

## Conséquences

**Bénéfices.** L'anti-dérive est préservé là où il a un sens (données
reproductibles) et n'est pas imposé là où il produirait des faux positifs
(snapshots). Les KPI sont **historisés** — on lit une tendance, pas seulement un
instantané — sans rendre la CI instable. La règle est simple à appliquer : pour
toute nouvelle métrique, on se demande « reproductible octet à `HEAD` donné ? »
et la réponse dicte le traitement.

**Prix à payer.** Deux mécanismes coexistent (diff-check d'un côté, série
append-only auditée de l'autre) : il faut savoir lequel s'applique et **ne pas
les mélanger**. La série append-only implique une **écriture automatisée sur
`main`** par la CI (un commit de données par jour), à surveiller pour qu'elle
reste idempotente et silencieuse. L'historique des snapshots ne démarre **qu'à
partir de sa mise en place** : pas de rétro-historique fiable pour la couverture
ou les vulnérabilités (l'état d'hier n'est pas reproductible aujourd'hui).

**Garde-fous.**

- **Aucun horodatage** dans une sortie diff-checkée ; tout générateur soumis au
  `--check` produit du Prettier exact.
- Le fichier de séries (`kpi-history.json`) est **append-only et idempotent par
  jour**, écrit **uniquement sur `main`**, audité en **cohérence structurelle**
  (jamais en fraîcheur).
- Les **données volatiles ne sont pas commitées en dur** dans le Markdown :
  composants de rendu + fichiers de données.
- Toute nouvelle métrique documentée est classée explicitement A, B ou C selon
  sa reproductibilité — à défaut, elle ne rentre pas dans la documentation
  générée.
