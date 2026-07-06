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

- Mesurer le taux de jointure sur **tirage uniforme** des ~24 761 établissements
  (pas la pagination biaisée vers les notoires). Livrable : % ROR→Wikidata,
  % avec ≥ 1 page Wikipédia, distribution du nombre de langues. Dimensionne la
  couverture réelle.
- Décider le **seuil de périmètre** : tout `type:education`, ou un sous-ensemble
  (≥ N works, pays cible). Amender l'ADR 0095 si le périmètre bouge.
- Valider l'accès **dumps** (`pageview_complete`, `pagelinks`/`page`/`redirect`,
  Wikidata) et la cible S3 (`rclone`), cohérent avec le pattern OpenAlex/mediawatch.

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
- Contrats GE en gate ; alerte si le taux de jointure ou la couverture chute.
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
5. **Biais d'échantillon** : le taux de jointure de 100 % est mesuré sur les
   établissements notoires ; la longue traîne sera plus basse — Phase 0 le quantifie.

## Séquencement

- Acter les ADR 0095 et 0096 (statut _Accepted_) avant la Phase 1.
- Mettre à jour `decisions/index.md` (table des ADR) et `parcours.md` (compteur).
