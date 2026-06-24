---
title: "0072 — Tests basés sur les propriétés au dataops Python (Hypothesis)"
---

## Contexte

Un **test basé sur les propriétés** (_property-based testing_, PBT) renverse la logique du
test classique : au lieu d'écrire à la main un jeu d'exemples (« pour cette entrée précise,
j'attends cette sortie »), on énonce un **invariant** que le code doit respecter pour
**toute** entrée d'un domaine, et la machine **génère des centaines d'entrées** pour tenter
de le **falsifier**. Quand elle y parvient, elle **réduit** automatiquement le contre-exemple
à sa forme minimale (_shrinking_), ce qui rend le défaut lisible. Le test classique, dit
**basé sur l'exemple** (_example-based_), vérifie les cas auxquels le développeur a pensé ;
le PBT cherche ceux auxquels il **n'a pas** pensé.

Cette pratique est **déjà en place côté TypeScript** du dépôt : six fichiers
`*.property.test.ts` exercent des invariants avec **fast-check** (la bibliothèque de
référence du PBT en TypeScript) — sur les validateurs (`packages/validators`) et sur les
_brands_ (types nominaux validés) de `packages/crf-core`. Exemple type : « `isEmail` accepte
toute adresse produite par le générateur d'adresses » et « rejette toute chaîne sans `@` ».
Ces tests **complètent** (ne remplacent pas) les tests par l'exemple voisins.

Côté **dataops/** (la catégorie Python native, [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)),
le PBT est **absent** : les suites pytest sont **uniquement** basées sur l'exemple. Or
c'est précisément là que des **fonctions pures parsent une entrée non fiable** :

- `mediawatch-dagster/.../gkg.py` projette le flux **GKG** (_Global Knowledge Graph_, le
  graphe de connaissances de la source d'actualités intégrée — [ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)) :
  `parse_master_list` lit une liste de fichiers ligne à ligne, `project_csv` projette un CSV
  **tabulé sans en-tête de 27 colonnes**, `_split_enhanced_organizations` découpe un champ
  composite `Nom,offset;Nom,offset;…` où le **nom peut contenir des virgules** ;
- `mediawatch-dagster/.../ror.py` : `project_record` projette un enregistrement d'un **dump
  de référentiel d'organisations** (schema v2, [ADR 0065](/atlas/decisions/0065-classification-universites-heuristique-referentiel/))
  où chaque champ peut **manquer ou être d'un type inattendu** ;
- `citation-dagster/.../uplift_model.py` : des **dérivations bornées** (vecteurs
  L2-normalisés, features de paire symétriques, métriques) du modèle d'uplift de FWCI
  ([ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)) dont les invariants
  mathématiques (symétrie, bornes, déterminisme) sont **énonçables**.

Ces fonctions ignorent déjà silencieusement les lignes malformées « par robustesse du flux
brut » (commentaire de `project_row`). Cette robustesse est **affirmée** mais **prouvée par
quelques exemples seulement** : rien ne garantit qu'une entrée hostile non anticipée
(virgule dans un nom d'organisation, champ JSON `None` là où on attend une liste, vecteur de
norme nulle) ne lève pas une exception au lieu d'être ignorée proprement. C'est exactement la
classe de bug que le PBT excelle à débusquer.

## Décision

> **On introduit Hypothesis — l'équivalent Python de fast-check — au dataops, ciblé sur les
> fonctions PURES à entrée non fiable : les parsers (`gkg.py`, `ror.py`) et les dérivations
> bornées (`uplift_model.py`). Les tests de propriété sont branchés DANS pytest via le
> décorateur `@given`, sans bascule de framework, et complètent les tests par l'exemple
> existants.**

### Hypothesis, branché dans pytest — pas un nouveau framework

**Hypothesis** est la bibliothèque de PBT de référence en Python. Elle **n'est pas** un
lanceur de tests concurrent de pytest : elle s'y **greffe** par un décorateur `@given(...)`
posé sur une fonction de test pytest ordinaire. Le test reste découvert, exécuté et compté
en couverture **par pytest** ; Hypothesis ne fait qu'alimenter la fonction avec des centaines
d'entrées générées. Concrètement, à côté de `tests/test_gkg.py` (par l'exemple, contre le
_fixture_ figé `gkg-sample`) on ajoute des tests `@given` dans le même fichier ou un voisin —
le parallèle exact de ce que `*.property.test.ts` fait à côté de `*.test.ts` côté TypeScript.

_Pourquoi Hypothesis et pas une génération maison ?_ Écrire soi-même des générateurs +
_shrinking_ serait réinventer, mal, un outil mûr. _Contre quelle alternative ?_ Rester en
example-based seul — rejeté : c'est l'état actuel, qui n'éprouve que les cas pensés.
_Contre l'alternative_ « réécrire les suites en PBT » — rejeté aussi : les tests par
l'exemple restent le bon outil pour les cas concrets connus et pour les _fixtures_ réelles
figées ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) ; le PBT les
**complète**, il ne les remplace pas.

### Une dépendance de développement épinglée, par code-location

Hypothesis est ajouté en **dev-dépendance** dans le `[dependency-groups] dev` de chaque
code-location concernée (`citation-dagster`, `mediawatch-dagster`), aux côtés de
`ruff`/`pytest`/`pytest-cov` déjà présents, et **verrouillé par `uv.lock`**
([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/), [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
C'est une dépendance **de test uniquement** : aucune entrée dans le runtime des assets, aucune
empreinte sur l'image Dagster servie. Chaque code-location reste **autonome** (pas de
dépendance Python partagée au niveau `dataops/` : la convention du dépôt est une toolchain
par projet Python).

### Exemples d'invariants à éprouver (ancrés sur le code réel)

Le PBT vise des **propriétés vraies pour toute entrée**, pas des valeurs précises :

- **`parse_master_list` / `project_csv` ne lèvent jamais** sur une chaîne arbitraire : sur
  n'importe quel texte (`@given(st.text())`), la sortie est une liste (vide à la rigueur),
  jamais une exception — la robustesse affirmée devient **prouvée**.
- **`_split_enhanced_organizations` survit aux virgules internes** : pour des noms
  d'organisations contenant des virgules, l'offset final `,<chiffres>` est retiré sans
  amputer le nom, et le résultat est dédupliqué en préservant l'ordre.
- **`project_record` (ror.py) tolère le bruit structurel** : sur un dictionnaire arbitraire
  (clés absentes, `types` à `None`, `locations` malformé), il renvoie une `University` valide
  **ou** `None`, jamais une `KeyError`/`TypeError`.
- **`pair_features(va, vb) == pair_features(vb, va)`** : l'invariant de **symétrie** du
  modèle d'uplift, vrai pour tout couple de vecteurs — propriété idéale pour le PBT, car
  fastidieuse à couvrir par l'exemple. De même, un vecteur L2-normalisé a une norme `≈ 1`
  (ou `0` s'il était nul), et `evaluate_grouped` est **déterministe** à graine figée
  (`RANDOM_STATE`, [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).

### Respect des garde-fous existants : hermétisme et « pas de xfail si bug »

Hypothesis génère ses entrées **en mémoire**, sans réseau ni horloge ni état machine : un
test `@given` reste **hermétique** au sens de l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/).
Pour préserver la **reproductibilité d'un échec**, la base d'exemples d'Hypothesis (`.hypothesis/`)
n'est pas un substitut au déterminisme : un contre-exemple trouvé doit être **figé en test par
l'exemple** une fois corrigé. Surtout, si le PBT **falsifie** un invariant, c'est qu'il a
trouvé un **vrai bug** : on **corrige le code** (rendre le parser réellement robuste), on
**n'annule jamais** le test (`@example`/`xfail` masquant un défaut) — application directe de
la règle « pas de xfail si bug » de l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/).

## Alternatives écartées

- **Rester en example-based seul.** L'état actuel : il n'éprouve que les cas pensés et laisse
  la robustesse des parsers à l'état d'affirmation. Rejeté — c'est le problème.
- **Réécrire les suites pytest en PBT.** Le PBT est mauvais pour vérifier une valeur concrète
  précise ou un _fixture_ réel figé ; il **complète** l'example-based, il ne le remplace pas.
- **Générateurs aléatoires maison.** Réinventer, sans _shrinking_, un outil mûr et standard.
- **Étendre le PBT à tout le code Python (assets Dagster, I/O).** Hors périmètre : les assets
  font de l'orchestration et de l'I/O, non déterministes et non purs ; le PBT n'a de valeur
  nette que sur les **fonctions pures à entrée non fiable**. On garde la cible serrée.

## Statut

Proposed.

## Conséquences

**Bénéfices.** La robustesse des parsers d'entrée hostile (GKG, dump de référentiel) passe
d'**affirmée** à **prouvée sur des centaines d'entrées**, _shrinking_ inclus pour rendre tout
défaut lisible. Les invariants mathématiques du modèle d'uplift (symétrie, bornes,
déterminisme) sont éprouvés systématiquement plutôt que par quelques exemples. Le dataops
**rejoint la maturité de test** déjà acquise côté TypeScript (fast-check), avec un outil
**homologue** — cohérence des pratiques d'un langage à l'autre.

**Prix à payer.** Une **dev-dépendance de plus** par code-location à maintenir et à verrouiller
(`uv.lock`). Un PBT mal écrit (générateur trop large, invariant flou) peut être **lent** ou
**instable** ; on borne les générateurs au domaine réel de la fonction et on fige les
contre-exemples trouvés en tests par l'exemple. La couverture pytest reste sous le **seuil
bloquant** existant (`--cov-fail-under=90`) : le PBT y contribue mais ne le contourne pas.

**Réserve honnête — la motivation « badge » ne transpose pas.** Le dépôt jumeau **cluster**
adopte le _fuzzing_ en partie pour un **badge de qualité** affiché par sa forge (ADR 0087 de
cluster). **Cette motivation ne s'applique pas à Atlas** : il n'y a pas d'équivalent ici, et
on ne décide pas une pratique pour décrocher un badge. La valeur retenue est **uniquement** la
**robustesse des parsers sur entrée hostile** (et les invariants du modèle) — qui **tient
seule**, indépendamment de toute reconnaissance externe. On crédite l'**inspiration de la
pratique du dépôt cluster** (ADR 0087, qui a généralisé le PBT/_fuzzing_ sur ses fonctions
pures), mais le périmètre, les cibles et la justification sont **propres à Atlas**.

**Garde-fous.**

- PBT **ciblé** sur les fonctions **pures à entrée non fiable** (parsers `gkg.py`/`ror.py`,
  dérivations `uplift_model.py`) — pas sur les assets Dagster ni l'I/O.
- Branché **via `@given` dans pytest**, sans bascule de framework ; complète, ne remplace pas,
  les tests par l'exemple.
- Hypothesis en **dev-dépendance épinglée** par code-location (`uv.lock`), zéro empreinte
  runtime.
- Un invariant **falsifié** = un **bug à corriger** dans le code ; **jamais** de `xfail`/`@example`
  masquant un défaut ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
- Tests **hermétiques** (génération en mémoire) ; contre-exemple trouvé **figé** en test par
  l'exemple pour la non-régression.
