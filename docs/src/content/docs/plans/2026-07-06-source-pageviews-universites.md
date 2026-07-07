---
title: "Plan — source pageviews universités + modèle de prévision des vues"
---

> **Pivot (2026-07-07) — le modèle a changé.** L'ambition explicative causale de
> l'[ADR 0096](/atlas/decisions/0096-modele-explicatif-trafic-universites/) (panel à
> effets fixes, features de page, conseiller les leviers) a été **abandonnée** au
> profit d'une **prévision** des vues à horizons 1 / 3 / 12 mois
> ([ADR 0098](/atlas/decisions/0098-modele-prevision-vues-wikipedia/), supersede 0096,
> alignée sur le patron mediawatch [ADR 0081]). Conséquences sur ce plan :
> **la Phase 3 (features de page) devient caduque** (la prévision se fait sur
> l'historique des vues, pas sur des features de page), **la Phase 4 est remplacée**
> par le modèle de prévision. Les Phases 0-2 (référentiel, vues, redirections)
> restent valables. Le package `dataops/pageviews-dagster` + `pageviews-dbt`
> implémente ce périmètre révisé.

Ce plan opérationnalise l'[ADR 0095](/atlas/decisions/0095-source-pageviews-universites/)
(source dataops) et l'[ADR 0098](/atlas/decisions/0098-modele-prevision-vues-wikipedia/)
(modèle de prévision). Le code vit dans `dataops/` (Python natif : uv/ruff/pytest, hors
graphe pnpm — [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)). Les briques
ci-dessous reposent sur un POC vérifié sur les API/données publiques (juillet 2026).

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

## Phase 3 — ~~Features de page~~ (CADUQUE, pivot ADR 0098)

**Supprimée.** Le modèle de prévision ([ADR 0098](/atlas/decisions/0098-modele-prevision-vues-wikipedia/))
s'appuie sur l'**historique des vues** (auto-régression, saisonnalité), pas sur des
features de page. La collecte MediaWiki (longueur, liens, images) et la version
within-page ne sont plus au périmètre. Le mart timeline `(university_id, month, views)`
de la Phase 2 alimente directement le modèle.

## Phase 4 — Modèle de PRÉVISION (ADR 0098)

Aligné sur le patron mediawatch ([ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch.md)),
implémenté dans `dataops/pageviews-dagster/src/pageviews_dagster/forecast_model.py` :

- **Un modèle GLOBAL** `HistGradientBoostingRegressor` (établissement en feature
  catégorielle) — pas N modèles. Série **mensuelle**, saisonnalité **annuelle**.
- **Multi-horizon direct** : horizon `h` (mois) en feature → agrégation aval en
  fenêtres **`month_1` / `month_3` / `year_1`** (1 / 3 / 12 mois).
- **Validation honnête** : `TimeSeriesSplit` + **embargo** sur la date cible (contrôle
  négatif : bruit i.i.d. → mode descriptif). **Porte de décision** `R² > 0,05 ∧ MAE <
MAE_baseline` → prédictif, sinon repli **descriptif** (baseline saisonnière).
- **Sortie** : mart `marts/views_forecast` `(university_id, horizon_label, window_start,
window_end, views_pred, served_mode)` + `manifest.json` atomique. Prévision ≥ 0,
  déterminisme figé. MLflow best-effort + drift Evidently (bascule predictive→descriptive
  bloquante).
- **Validé** : le cœur pur tourne (predictive sur signal saisonnier, descriptive sur
  bruit — honnête). Les assets S3 sont testés par mocking (couverture ≥ 90 %).

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
