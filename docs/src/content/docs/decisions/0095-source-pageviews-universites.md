---
title: "0095 — Source dataops « pageviews universités » (audience Wikipédia des établissements)"
---

## Contexte

On veut mesurer, dans le temps, l'**audience Wikipédia des établissements
d'enseignement supérieur** — les consultations de leurs pages, toutes langues
confondues — pour alimenter un modèle explicatif du trafic (→ [ADR 0096]). Cette
source ne préexiste pas dans le dépôt ; elle s'ajoute aux sources dataops
existantes (OpenAlex citation, mediawatch GKG) et doit suivre leurs invariants :
snapshot reproductible, contrat Great Expectations (GE), matérialisation, cadence.

Quatre faits ont été **vérifiés directement sur les API/données publiques** avant
rédaction (POC, juillet 2026) :

1. **OpenAlex fournit le référentiel d'établissements.** Le filtre
   `type:education` renvoie ~24 761 institutions, **toutes porteuses d'un ROR**
   (100 % sur échantillon de 500), typées et filtrables par pays. C'est un
   périmètre **propre** — au contraire d'une requête Wikidata `wdt:P31/P279* wd:Q3918`
   qui ramène un bruit important (entités disparues, homonymes, sous-entités).
2. **La jointure vers Wikipédia passe par le ROR, pas par le champ `wikidata`
   d'OpenAlex.** Ce dernier n'est renseigné que ~41 % du temps (il manque même
   Michigan, Cornell, UCL). En joignant par ROR sur la propriété Wikidata
   **`P6782`**, on récupère le QID **quasi systématiquement** (jointure d'identité
   **100 %** sur échantillon uniforme de 793 ; 299 de ces items exploitables — avec
   page — étaient **absents** du champ natif OpenAlex). Via les `sitelinks`, on
   obtient les **titres d'article par langue** — mais la distribution est **très
   asymétrique** : sur un tirage uniforme, **médiane 3 langues, moyenne 5,6, max
   107**, et **24 % des établissements couverts sont monolingues**. Les « 37 langues
   médianes » d'un premier POC provenaient d'un échantillon biaisé vers les
   établissements notoires (voir Limite assumée).
3. **La cible (les vues) vient de Wikimedia Pageviews**, indexée par
   `(langue.wikipedia, titre d'article)`. L'agrégat « toutes langues » n'est pas un
   détail : sur l'Université Le Havre Normandie, le trafic **non-francophone**
   (russe, anglais, allemand…) représente ~48 % du total — l'ignorer biaiserait la
   mesure.
4. **Les renommages/redirections se résolvent par l'API MediaWiki.** L'ancien
   titre « Université du Havre » **redirige** vers « Université Le Havre Normandie »,
   et `prop=redirects` liste les 6 anciens titres pointant vers la page actuelle.
   Sans cette étape, un renommage produit une **fausse rupture de niveau** dans la
   série (marche observée fin 2020 sur Le Havre) que le modèle capterait comme un
   signal réel.

## Décision

On crée une source dataops **`pageviews-universites`** à quatre entrées, au grain
**établissement × langue × mois**.

### Périmètre et neutralité

Le périmètre est **généraliste** (tout `type:education` d'OpenAlex,
[ADR 0035]) ; aucun identifiant ne nomme un établissement ou un pays particulier
(bucket/namespace/secret neutres, [ADR 0022]). Le ROR est l'identifiant pivot.
**Aucun seuil de périmètre au niveau source** : un seuil `works_count` ne nettoie
rien (la jointure matche à 100 %, aucun parasite à écarter) et rejouerait un **proxy
de notoriété** — le confondeur même que le modèle ([ADR 0096]) neutralise. Tout
filtrage (ex. `works_count ≥ 100`) est reporté au niveau de l'**échantillon
d'estimation** du modèle, réversible, et non du référentiel.

### Sources et rôles (aucune n'est substituable)

| Source                                                  | Rôle                                                             | Accès à l'échelle                       |
| ------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| **OpenAlex** (`type:education`)                         | liste + ROR + covariables de contexte (pays, works_count)        | dump Parquet (déjà utilisé, [ADR 0094]) |
| **Wikidata** (`P6782` ↔ sitelinks)                      | QID + titres d'article multilingues                              | dump JSON/RDF hebdo, ou SPARQL par lots |
| **Pageviews**                                           | variable cible (vues)                                            | dump `pageview_complete` **mensuel**    |
| **MediaWiki API / dumps `pagelinks`+`page`+`redirect`** | features de page (§ ADR 0096) **et** résolution des redirections | dumps XML/SQL bimensuels                |

### Snapshot — dumps, pas API, à l'échelle

À **~19 330 établissements couverts** (78,1 % des 24 761, cf. Limite assumée)
× ~5,6 langues ≈ **~1,1 × 10⁵ séries** (grain établissement × langue), l'API
Pageviews reste disqualifiée (10⁵ appels demeurent fragiles, non reproductibles,
sujets au rate limiting — un `502` Wikidata et un throttling ont été rencontrés dès
le POC). On **snapshote les dumps** vers le S3 interne via `rclone`, comme
OpenAlex/mediawatch :

- `pageview_complete` **mensuel**, filtré sur l'ensemble des titres du référentiel ;
- dump Wikidata (référentiel) rafraîchi au **même rythme mensuel** (les
  établissements ne changent pas de nom à la semaine) ;
- dumps `pagelinks`/`page`/`redirect` **bimensuels** pour les features + redirections.

L'API n'est conservée que pour le **POC** et les rattrapages ponctuels, avec
`User-Agent` identifiant + retry/backoff exponentiel sur `429/502/503` (le POC a
montré qu'un lot en échec silencieux fausse les taux à la baisse).

### Résolution des redirections (prérequis, pas option)

Avant matérialisation, pour chaque page cible on agrège les vues de **tous ses
titres redirigés** (`prop=redirects` / table `redirect`). Une série par
`(établissement, langue)` est ainsi **continue** malgré les renommages. Cette étape
conditionne la validité de la cible ; elle est **en amont** du contrat GE.

### Contrat GE

Le contrat valide, sans matérialiser de colonnes lourdes inutiles (leçon
[ADR 0094] : ne pas déclencher un parsing de forme sur des champs imbriqués) :
unicité de `(ror, lang, month)`, `views ≥ 0`, `month` dans la plage couverte,
`ror` non nul, cohérence du référentiel (un `ror` du fait existe dans la dimension).

### Matérialisation

Table longue `fait_pageviews_universites(ror, lang, month, views)` +
dimension `dim_etablissement(ror, qid, display_name, country_code, works_count,
n_langues, has_wp, works_band)`. Les colonnes `has_wp` (booléen « a ≥ 1 page
Wikipédia ») et `works_band` (tranche de `works_count`) servent la **segmentation**
plutôt qu'un filtre de périmètre (cf. Périmètre) : les établissements sans page
restent dans la dimension (dénominateur de couverture) mais sont naturellement
absents du fait (pas de titre → pas de vues). Le grain **× langue** est retenu car
(a) la saisonnalité est décalée par pays/hémisphère et l'agrégat mondial la
brouillerait, (b) les features de page ([ADR 0096]) sont **par langue**. L'agrégat
« toutes langues » reste dérivable pour d'autres usages.

### Cadence

Cron **mensuel** (post-publication du `pageview_complete`, ~J+3–5 après fin de
mois) : récupère le dump, résout les redirections, filtre, agrège, valide (GE),
matérialise, pousse en S3.

## Conséquences

- **Positif** : source reproductible et hors-ligne ; zéro dépendance runtime à une
  API ; **jointure d'identité ROR 100 %** ; grain riche réutilisable. Distinguer
  **taux de jointure** (100 %) et **taux de couverture exploitable** (78,1 %) : ce
  ne sont pas la même chose.
- **Coût** : une 4ᵉ source à opérer ; volumétrie dumps (à streamer une fois par
  cycle) ; complexité de la résolution des redirections à l'échelle (~10⁵ titres,
  pas ~10⁶).
- **Limite assumée (mesurée en Phase 0, tirage uniforme n=793)** : la **couverture
  exploitable** (≥ 1 page Wikipédia) est de **78,1 %** (IC 95 % [75 ; 81]), non
  « quasi complète ». Elle suit un **fort gradient de taille** : de **54,3 %** pour
  les établissements à < 100 works à **98,8 %** au-delà de 10 000 — les deux tiers
  du déficit viennent du tiers le plus petit. Les ~22 % non couverts sont des items
  Wikidata **réels mais sans article** (plancher imposé par le contenu de Wikipédia,
  non récupérable par ingénierie). Conséquence pour le modèle : voir la **limite de
  validité externe** de l'[ADR 0096].
- **Point de contact `cluster`** : si le snapshot S3 est consommé côté `cluster`,
  mettre à jour [ADR 0033] dans la même PR.

[ADR 0022]: /atlas/decisions/0022-naming-convention/
[ADR 0033]: /atlas/decisions/0033-contrat-interface-cluster/
[ADR 0035]: /atlas/decisions/0035-depot-generaliste-ouvert/
[ADR 0094]: /atlas/decisions/0094-mart-eunicoast-parquet-co-autorat/
[ADR 0096]: /atlas/decisions/0096-modele-explicatif-trafic-universites/
