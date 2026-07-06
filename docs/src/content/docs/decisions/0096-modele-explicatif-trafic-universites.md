---
title: "0096 — Modèle explicatif du trafic Wikipédia des universités (posture associative, panel à effets fixes)"
---

## Contexte

La source [ADR 0095] produit des séries d'audience Wikipédia par
`(établissement, langue, mois)`. L'objectif métier est **prescriptif** :
_conseiller un établissement sur ce qu'il peut faire pour augmenter ses vues_.
Ce glissement de « décrire » à « recommander une action » est le point délicat —
il fait entrer le projet dans l'**inférence causale sur données observationnelles**,
et non plus la simple prédiction.

Le risque central est la **confusion cause/symptôme**. La plupart des variables
disponibles sont des **marqueurs de notoriété**, pas des leviers :

- Une page existe dans 77 langues **parce que** l'université est mondialement
  connue — pas l'inverse. « Créez des pages dans plus de langues » confond le
  symptôme et la cause.
- Les backlinks corrèlent avec les vues, mais la notoriété cause **les deux** ;
  agir sur les backlinks ne transférerait pas mécaniquement le trafic.

Un modèle purement prédictif restituerait ces corrélations et produirait des
**conseils non valides**. Le design doit donc séparer **variables actionnables**
(ce qu'un établissement peut modifier sur sa page) des **variables de contexte**
(notoriété, taille, ancienneté — non manipulables), et adopter une posture de
prudence explicite.

Les features de page ont été **vérifiées accessibles** (POC, juillet 2026, API
MediaWiki en un appel) : sur la page fr de Le Havre — 814 mots, 196 liens sortants,
12 images, 265 liens entrants, taille 14 288 o.

## Décision

### Posture : associations honnêtes, pas causalité forte

On assume un modèle **associatif conditionnel** : _« à notoriété et contexte
comparables, les pages plus longues / mieux structurées / mieux liées tendent à
être davantage consultées »_. On **ne prétend pas** établir d'effet causal net (ce
qui exigerait une variation expérimentale ou quasi-expérimentale absente ici). Les
sorties sont formulées comme des **pistes à tester**, avec incertitude affichée —
jamais comme des garanties de résultat. Cette limite est **opposable** et rappelée
dans toute restitution.

### Grain et unité d'analyse

Unité = **la page = (établissement × langue)**. Les features (longueur, liens,
images) sont des propriétés d'une page **dans une langue donnée** ; le grain × langue
d'[ADR 0095] est donc requis, pas optionnel.

### Variables — classées par rôle

| Variable                              | Source                  | Rôle                                          |
| ------------------------------------- | ----------------------- | --------------------------------------------- |
| longueur (mots / octets)              | MediaWiki               | **levier** actionnable                        |
| liens sortants internes               | MediaWiki               | **levier**                                    |
| nb d'images / médias                  | MediaWiki               | **levier**                                    |
| nb de sections, de références         | wikitext                | **levier**                                    |
| statut qualité (AdQ/BA)               | Wikidata / catégories   | **levier**                                    |
| liens entrants (backlinks)            | MediaWiki / `pagelinks` | **levier ambigu** (interpréter avec prudence) |
| **nb de langues**                     | Wikidata sitelinks      | **contrôle** de notoriété (pas un levier)     |
| works_count, taille, pays, ancienneté | OpenAlex / Wikidata     | **contrôle** / effet fixe                     |

Le nombre de langues **reste dans le modèle**, mais comme **variable de contrôle**
— pour ne pas attribuer à la longueur de page un effet qui provient en réalité de
la notoriété.

### Modèle

**Panel à effets fixes** au grain page×mois :

- **effets fixes établissement** (absorbent la notoriété/taille invariante),
- **effets fixes langue** (absorbent le volume propre de chaque édition),
- **effets fixes temps** (mois) (absorbent les chocs communs : COVID, tendances
  globales),
- **saisonnalité** modélisée par langue/hémisphère (le cycle universitaire diffère),
- **régresseurs actionnables** = les features de page (idéalement décalées, pour
  réduire la simultanéité).

L'identification repose alors sur la **variation intra-page dans le temps** (une
page qui s'enrichit voit-elle ses vues bouger ?) plutôt que sur la comparaison
brute entre pages — ce qui neutralise une large part du biais de notoriété. Une
version **within-page** (features datées) est le prolongement naturel si l'historique
des features est snapshoté (cf. dumps `pagelinks`/`page` par run, [ADR 0095]).

**Nuance sur les effets fixes langue** (mesurée en Phase 0) : la médiane est de
**3 langues** par établissement et **44 % des établissements couverts ont ≤ 2
langues**. L'identification par variation **inter-langue intra-établissement** ne
concerne donc réellement que les ~40 % d'établissements à > 3 langues (qui portent
~80 % du volume de séries) ; pour le reste, le panel repose sur la **seule variation
temporelle within-page**. Ce n'est pas un défaut du grain × langue (requis par les
features par page et le trafic non-francophone massif, [ADR 0095]), mais une borne
d'identification à connaître.

### Prérequis de données (bloquants)

- **Redirections résolues** en amont ([ADR 0095]) : sinon un renommage crée une
  fausse rupture que le modèle lirait comme un effet.
- **Cible dé-saisonnalisée avec soin** : ne pas confondre l'effet d'une feature
  avec un pic de rentrée.

## Conséquences

- **Positif** : conseils défendables, biais de notoriété explicitement contrôlé,
  cadre extensible vers du within-page/causal si besoin.
- **Coût** : modèle panel plus lourd qu'une régression naïve ; nécessite
  l'historique des features pour la version within-page.
- **Limite assumée (causale)** : données observationnelles → **associations
  conditionnelles**, jamais preuve d'un levier. Toute restitution le dit. Cohérent
  avec la posture du dépôt (le code **permet** l'analyse, il ne garantit pas le
  résultat — analogue à la logique RGPD « capacité, pas garantie »).
- **Limite assumée (validité externe — biais de sélection)** : la population
  réellement estimable est celle des **établissements dotés d'une page Wikipédia**,
  pas « toutes les universités ». La couverture n'est que de **78 %** et suit un
  gradient fort (**54 %** sous 100 works, **99 %** au-delà de 10 000, Phase 0). Trois
  conséquences opposables :
  1. Le modèle est **structurellement muet sur les ~46 % de petits établissements
     sans page** — pour eux, le seul « levier » est _créer une page_, ce qui relève
     d'un **régime distinct**, hors du panel (à ne pas traiter comme donnée
     manquante ignorée).
  2. Les coefficients seront estimés à ~47 % sur les deux tranches de taille hautes :
     **ne pas transporter l'élasticité vues↔features vers la tranche 0–99 sans
     validation de support** (effets plancher/plafond, dynamique de découverte
     différente). Prévoir une interaction taille × levier, ou un refus explicite
     d'extrapoler.
  3. L'existence d'une page étant elle-même un proxy de notoriété (le confondeur
     central), l'entrée dans le panel n'est **pas aléatoire** : toute restitution
     doit interdire de laisser croire à une couverture universelle.

[ADR 0095]: /atlas/decisions/0095-source-pageviews-universites/
