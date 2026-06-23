---
title: "0065 — Qualifier une organisation comme « université » : heuristique de nom + référentiel"
---

## Contexte

La collecte « veille médiatique »
([ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)) ingère le GKG v2 de
GDELT pour établir un chronogramme du nombre d'articles mentionnant une
**université**. Or le GKG **ne type pas** les organisations qu'il détecte.

Fait technique vérifié (codebook GKG 2.1). Le champ `V2ENHANCEDORGANIZATIONS` est
une **liste de noms** d'organisations, toutes catégories confondues (entreprises,
ONG, organisations intergouvernementales, gouvernements, universités…), au format
**`Nom,offset;Nom,offset;…`** : entrées séparées par `;`, et au sein d'une entrée
le **nom** puis une **virgule** puis l'**offset caractère approximatif** dans le
document (l'offset sert à la **proximité** entre champs, pas à un typage). Aucun
champ n'attribue de **catégorie** à une organisation extraite. La documentation
GDELT le dit elle-même : le GKG repose sur la **co-occurrence de noms**, pas sur
une compréhension structurelle (« _not… the equivalent of an org chart_ »), et
invite à **dériver** soi-même les affiliations.

Les thèmes (`V2ENHANCEDTHEMES`) contiennent bien des entrées liées à l'éducation
(`SOC_POINTSOFINTEREST_UNIVERSITY`, `WB_482_TERTIARY_EDUCATION`…), **mais au niveau
document** : un thème signale que le mot « université » figure dans l'article, **pas**
que telle organisation extraite _est_ une université. Ce signal est, au mieux, un
appoint de proximité faillible.

Conséquence : qualifier une organisation comme « université » est un **travail à
faire nous-mêmes**, en aval de l'ingestion. Cette décision en fixe la méthode.

## Décision

> **Une organisation extraite est qualifiée d'« université » par la conjonction de
> deux signaux : (1) une heuristique multilingue sur le nom et (2) un appariement
> contre un référentiel d'établissements connus. Le référentiel fait foi ; la
> seule heuristique de nom ne suffit pas à elle seule à retenir une organisation,
> mais permet d'en signaler de nouvelles à arbitrer.**

### Deux signaux complémentaires

1. **Heuristique de nom (multilingue).** Une expression rationnelle couvrant les
   formes courantes — `Universit*` (français, anglais, italien, allemand…),
   `University`, `Universidad`, `Universität`, `Hochschule`, `Politecnico`,
   idéogrammes (`大学`, `대학교`)… — repère les noms **vraisemblablement**
   universitaires. Comme GDELT traduit les noms **vers l'anglais**
   ([ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)), la forme anglaise
   (`University…`) capte l'essentiel ; les autres formes captent les noms propres
   non traduits. L'heuristique est **bruitée** (faux positifs : « University Avenue »,
   « McDonald's University ; faux négatifs : sigles, noms sans le mot « université »
   comme « MIT », « Sorbonne ») — elle ne **décide pas** seule.

2. **Référentiel d'établissements (gazetteer).** Un **référentiel d'universités
   connues**, ingéré comme une source de données figée et versionnée (par exemple
   **ROR** — _Research Organization Registry_ — ou les entités **Wikidata**
   _instance of: university_, accès ouvert), sert de **table d'appariement** sur le
   nom normalisé. C'est lui qui **fait foi** : une organisation retenue est une
   organisation qui **matche le référentiel**.

Une organisation est **retenue** si elle apparie le référentiel. L'heuristique de
nom sert à **deux fins** : pré-filtrer le volume avant l'appariement (performance),
et **signaler** les organisations « universitaires d'aspect » **absentes** du
référentiel — candidates à l'enrichir, arbitrées hors automatisme.

### Pourquoi pas l'un sans l'autre

- **Référentiel seul** : manque les universités absentes du gazetteer (jeunes
  établissements, variantes de nom, translittérations) → silence.
- **Heuristique seule** : retient du bruit et rate les noms sans le mot-clé
  (« Sorbonne », sigles) → bruit **et** silence, sans source de vérité.

La conjonction donne une **précision** ancrée sur le référentiel et un **rappel**
amélioré par l'heuristique, avec un canal explicite d'enrichissement.

### Neutralité et RGPD

Le référentiel est nommé **génériquement** dans le code (`ref_universities`,
`s3://mediawatch/ref/…`) ; « ROR », « Wikidata » n'apparaissent qu'en **prose**
([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/),
[ADR 0022](/atlas/decisions/0022-naming-convention/)). Le code **permet** de
choisir/charger un référentiel ; il ne décide pas du référentiel à la place du
déployeur. La donnée traitée est **publique et organisationnelle** (noms
d'établissements, articles de presse), sans donnée personnelle — la qualification
porte sur des **organisations**, pas des individus.

## Statut

Accepted. **Complète** l'[ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)
(la collecte produit les mentions d'organisations ; le présent ADR fixe comment en
extraire les universités). S'inscrit dans le contrat dbt/Parquet du pipeline
([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)).

## Conséquences

**Bénéfices.** Qualification **fiable** (ancrée sur un référentiel faisant foi) et
**transparente** (deux signaux explicites, traçables), plutôt qu'une boîte noire.
Rappel amélioré par l'heuristique multilingue, gratuite grâce à la traduction amont
de GDELT. Canal d'**enrichissement** du référentiel (les « universitaires d'aspect »
non appariés sont listés, pas silencieusement perdus).

**Prix à payer.** Un **référentiel à maintenir** : une source de données
supplémentaire à ingérer et rafraîchir (le gazetteer évolue). Bruit résiduel de
l'heuristique à arbitrer. Sensibilité de l'appariement aux **variantes de nom**
(normalisation, accents, translittérations) : un travail de _matching_ de chaînes
non trivial, à éprouver sur fixtures.

**Garde-fous.** La qualification est validée par des **suites Great Expectations**
et des **fixtures déterministes** (un échantillon figé de `V2ENHANCEDORGANIZATIONS`
multilingue, avec les universités attendues consignées dans un `GOLDEN.md`,
[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) : on prouve
sur données contrôlées que les universités attendues sont retenues et que le bruit
connu est écarté. Le référentiel est **figé et versionné** (jamais re-téléchargé
en test). Aucune marque de référentiel dans les identifiants
([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
