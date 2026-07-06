---
title: "Plan — source pageviews universités + modèle explicatif du trafic"
---

Ce plan opérationnalise l'[ADR 0095](/atlas/decisions/0095-source-pageviews-universites/)
(source dataops) et l'[ADR 0096](/atlas/decisions/0096-modele-explicatif-trafic-universites/)
(modèle). Le code vit dans `dataops/` (Python natif : uv/ruff/pytest, hors graphe
pnpm — [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)). Toutes les
briques ci-dessous reposent sur un POC vérifié sur les API/données publiques
(juillet 2026).

## Phase 0 — Cadrage & couverture réelle (avant tout code de prod)

- **[fait]** Taux mesuré sur **tirage uniforme** (`sample=` OpenAlex, 4 seeds,
  793 établissements, works médian 438, 122 pays) : **jointure ROR→Wikidata
  100 %**, **couverture ≥ 1 page Wikipédia 78,1 %** (IC 95 % [75 ; 81]),
  **langues médiane 3 / moyenne 5,6 / max 107** (24 % monolingues). Gradient de
  taille : **54,3 %** (< 100 works) → **98,8 %** (≥ 10 000). Volume extrapolé :
  **~19 330 établissements couverts, ~1,1 × 10⁵ séries** (grain × langue).
- **[tranché] Seuil de périmètre : aucun au niveau source.** On matérialise tout
  `type:education` (neutralité [ADR 0035] ; un seuil `works` rejouerait un proxy de
  notoriété). Le filtrage `works_count ≥ 100 ∧ n_langues ≥ 2` est reporté à
  l'**échantillon d'estimation** du modèle (inclusion analytique réversible ; porte
  la couverture à ~89 %). Colonnes `has_wp` / `works_band` ajoutées à la dimension
  pour la segmentation.
- Valider l'accès **dumps** (`pageview_complete`, `pagelinks`/`page`/`redirect`,
  Wikidata) et la cible S3 (`rclone`), cohérent avec le pattern OpenAlex/mediawatch.
- **Action tech-debt (issue, charte [ADR 0052])** : (i) persister/versionner le
  script de tirage et comparer la distribution (works, pays) de l'échantillon aux
  24 761 pour **objectiver l'uniformité** de `sample=` ; (ii) étape légère de
  réconciliation nom + pays pour rattraper le cas « item Wikidata dupliqué sans
  ROR » (~+0,2 à +1,7 pt de couverture).

## Phase 1 — Référentiel (dimension établissement)

- Extraire d'OpenAlex (**dump Parquet**,
  [ADR 0094](/atlas/decisions/0094-mart-eunicoast-parquet-co-autorat/)) :
  `ror, display_name, country_code, works_count, type`. Colonnaire : ne pas
  matérialiser les colonnes lourdes.
- Joindre à **Wikidata par `P6782`** (dump ou SPARQL par lots de ≤ 100, avec
  **retry/backoff** sur `429/502/503` — un échec silencieux fausse le taux) →
  `qid`, `sitelinks` (titre par langue).
- Produire `dim_etablissement(ror, qid, display_name, country_code, works_count,
n_langues)` + table `titres(ror, lang, title)`.
- **GE** : `ror` unique non nul ; `n_langues ≥ 0` ; chaque `title` non vide.

## Phase 2 — Cible (vues) + résolution des redirections

- Pour chaque `(ror, lang, title)`, collecter les **anciens titres** via
  `prop=redirects` / table `redirect`, et **sommer leurs vues** → série continue.
- Charger `pageview_complete` **mensuel**, filtrer sur l'ensemble des titres
  (courants + redirigés), agréger au grain `(ror, lang, month)`.
- Densifier l'axe temporel (mois sans vue → 0, pas absent).
- Produire `fait_pageviews_universites(ror, lang, month, views)`.
- **GE** : unicité `(ror, lang, month)` ; `views ≥ 0` ; `month` dans la plage ;
  intégrité référentielle `ror` ∈ dimension.

## Phase 3 — Features de page (pour le modèle)

- Par `(ror, lang)` : longueur (mots + octets), liens sortants, liens entrants
  (backlinks), images, sections, références, statut qualité. Source : **dumps
  `pagelinks` + `page`** à l'échelle (API MediaWiki réservée au POC/rattrapage).
- **Snapshoter les features par run** (bimensuel) → permet la version
  _within-page_ du modèle (ADR 0096).
- Produire `features_page(ror, lang, snapshot_date, longueur, liens_out,
backlinks, images, sections, refs, qualite)`.
- **GE** : compteurs `≥ 0` ; `snapshot_date` valide.

## Phase 4 — Modèle explicatif (ADR 0096)

- Assembler le **panel** page × mois : cible (vues dé-saisonnalisées) × features
  (décalées) × contrôles (`n_langues`, `works_count`, pays).
- Estimer le **panel à effets fixes** (établissement + langue + temps) +
  saisonnalité par hémisphère.
- Séparer explicitement **leviers** et **contrôles** dans les sorties.
- Restitution : pour un établissement, ses pages **sous-performantes vs leurs
  pairs** (résidu) + pistes actionnables, **avec incertitude et avertissement**
  (associations conditionnelles, pas garanties).

## Phase 5 — Industrialisation

- Cron **mensuel** (post-publication `pageview_complete`, ~J+3–5).
- Contrats GE en gate. **Seuil d'alerte couverture ~75 %** (borne basse de l'IC
  observé 78,1 %), calé **par strate `works_band`** — pas un chiffre agrégé unique,
  vu le gradient 54 % → 99 %.
- Si le snapshot est consommé côté `cluster` → mettre à jour l'
  [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) dans la même PR.

## Points de vigilance (issus des POC)

1. **Rate limiting / robustesse** : dumps > API à l'échelle ; retry/backoff
   obligatoire en mode API ; un lot en échec silencieux fausse les métriques (un
   `502` Wikidata a sous-estimé un taux de 100 % à 80 % lors du POC).
2. **Multilingue non négociable** : ~48 % du trafic de l'Université Le Havre
   Normandie est non francophone (russe, anglais, allemand…).
3. **Redirections = prérequis**, pas option : sinon fausses ruptures de niveau
   (marche observée fin 2020 sur Le Havre).
4. **Cause ≠ symptôme** : le nombre de langues est un **contrôle** de notoriété,
   pas un levier (ADR 0096).
5. **Biais d'échantillon — quantifié en Phase 0** : la couverture exploitable est
   de **78,1 % sur tirage uniforme** (vs 99,8 % sur l'échantillon biaisé notoire),
   avec un gradient de taille marqué. Le modèle est **muet sur les ~46 % de petits
   établissements sans page** ; ne pas transporter ses coefficients vers eux
   (validité externe, [ADR 0096]).

## Séquencement

- Acter les ADR 0095 et 0096 (statut _Accepted_) avant la Phase 1.
- Mettre à jour `decisions/index.md` (table des ADR) et `parcours.md` (compteur).
