---
title: "Rapport de nuit — pipeline pageviews-universités (Phases 1→4)"
---

Exécution autonome sur **échantillon de travail borné** (121 établissements
stratifiés par taille, 46 pays, Le Havre inclus). Objectif : dérisquer le
pipeline de bout en bout et poser le modèle, **pas** produire des chiffres de
production. Met en œuvre le
[plan pageviews universités](/atlas/plans/2026-07-06-source-pageviews-universites/)
([ADR 0095](/atlas/decisions/0095-source-pageviews-universites/),
[ADR 0096](/atlas/decisions/0096-modele-explicatif-trafic-universites/)).

## Résultats par phase

### Phase 1 — Référentiel `dim_etablissement` ✅

- 121 établissements, **994 titres** d'article sur **146 langues distinctes**.
- Jointure OpenAlex→Wikidata par ROR, titres via sitelinks. GE : ror unique, titres non vides.

### Phase 2 — Cible (vues) + redirections ✅

- **62 669 observations** `(ror,lang,month)`, **676 séries**, **409 redirections
  résolues** (41 % des titres avaient ≥ 1 ancien titre à sommer — le « piège Le
  Havre » est **généralisé**, pas une exception). La résolution des redirections
  fonctionne à l'échelle.
- 120 mois couverts (2015-07 → 2025-06).

### Phase 3 — Features de page ✅ (avec réserve)

- **324 lignes de features sur 994 titres** : ~2/3 des pages renvoient un extract
  vide/`missing`. Signal de longue traîne — beaucoup de sitelinks Wikidata pointent
  vers des pages très maigres ou des redirects non-articles. À creuser : distinguer
  « page absente » de « page-stub réelle ».
- Distributions : words médiane 166 (max 13065), links_out médiane 39 (plafonné à
  500 par l'API non paginée — **approximation**), images médiane 5, backlinks médiane 30.
- **Réserve** : `links_out` tronqué à 500 sous-estime les grosses pages ; à paginer
  pour la prod.

### Phase 4 — Modèle panel ✅ (résultats prudents)

Panel : **254 obs (ror,lang)**, 54 établissements, 75 langues. Cible = `log(vues
mensuelles moyennes)`. FE langue (≥ 3 obs) + contrôles, SE clusterisées par établissement.

| Levier                 | OLS naïf       | FE + contrôles                | Lecture                                                          |
| ---------------------- | -------------- | ----------------------------- | ---------------------------------------------------------------- |
| `log_words` (longueur) | +0,214 (p .06) | **+0,226** [.03 ; .42] p .02  | **levier le plus défendable** : robuste au contrôle              |
| `log_links_out`        | +0,311 (p .06) | −0,045 (p .73)                | **corrélation naïve trompeuse** : disparaît après FE langue      |
| `log_backlinks`        | +0,554         | **+0,533** [.34 ; .73] p .001 | dominant MAIS **proxy de notoriété** — pas un levier actionnable |
| `log_images`           | −0,064 (ns)    | +0,138 (ns)                   | non significatif                                                 |

R² : 0,56 (naïf) → 0,79 (FE). **Message clé** : `log_words` est le seul levier
vraiment actionnable qui survit ; `backlinks` domine mais confond cause/symptôme
(exactement le risque anticipé par l'ADR 0096) ; `links_out` illustre pourquoi le
modèle naïf est trompeur.

## Surprises / soucis rencontrés

- **Redirections omniprésentes** (41 % des titres) : confirme que l'étape de
  résolution est un vrai prérequis, pas un cas particulier.
- **Attrition du funnel** : 121 étab. → 82 avec vues → 71 avec features exploitables.
  Beaucoup de sitelinks pointent vers des pages-stubs sans extract. À anticiper dans
  le contrat GE (taux de complétude des features par strate).
- **`backlinks` domine le modèle** : signal fort mais c'est le collider de notoriété.
  Ne surtout pas le restituer comme levier — risque n°1 de conseil trompeur.
- **`links_out` s'effondre après FE** : bel exemple pédagogique de l'intérêt du panel.

## Limites assumées de cette exécution

- **Échantillon borné** (121 étab.) → non représentatif, tendances indicatives.
- **Features en snapshot unique** → identification between-pages, PAS le within-page
  de l'ADR 0096 ; les coefficients ne sont PAS des effets causaux. À relire.
- **API et non dumps** → volume limité, non reproductible à l'échelle.

## Points de décision restants (pour toi)

1. **`backlinks` comme variable** : le garder comme **contrôle** (pas levier) ou
   l'exclure ? Il capte la notoriété mais peut masquer l'effet des vrais leviers.
   Recommandation : contrôle explicite, jamais restitué comme conseil.
2. **Features en snapshot unique** : la vraie identification (within-page) exige
   l'historique des features → dumps `pagelinks`/`page` par run (Phase 3 du plan).
   Décision : vaut-il l'effort maintenant, ou après validation à l'échelle ?
3. **Passage aux dumps (Phase 5)** : non faisable en autonomie (S3, secrets, To).
   C'est le prochain gros jalon — nécessite ton implication infra.
4. **Seuil d'inclusion analytique** (`works ≥ 100 ∧ n_langs ≥ 2`) : à valider sur
   données réelles avant de figer.
