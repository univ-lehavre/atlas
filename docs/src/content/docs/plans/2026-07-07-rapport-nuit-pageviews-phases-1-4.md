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

### Phase 4b — Modèle WITHIN-PAGE ✅ (le test décisif, ADR 0096)

Le between-pages ci-dessus n'identifie pas causalement (la longueur pourrait juste
marquer la notoriété). On a donc collecté l'**historique versionné de la taille de
page** (`prop=revisions`, **94 512 obs** `(ror,lang,month)` sur 958 séries — faisable
en API !) et estimé un panel **à effets fixes page + mois** : l'effet de la longueur
est alors identifié par la **variation temporelle d'une même page** (elle s'allonge →
ses vues bougent-elles ?), ce qui **absorbe toute la notoriété invariante**.

Résultat sur **52 657 obs / 506 pages** (celles dont la taille varie dans le temps) :

> **log_length → log_views : coef +0,182, IC 95 % [0,113 ; 0,251], p < 0,001.**

**Interprétation :** à notoriété fixe, **quand une page s'allonge, ses vues
augmentent** — association within-page positive et robuste. C'est le résultat le
plus solide de la nuit : il donne au conseil « enrichir la page » un **fondement
empirique défendable**, pas une simple corrélation. L'effet (0,18) est plus faible
que le between naïf (une part de ce dernier était bien de la notoriété), mais il
**survit** au contrôle le plus exigeant. Reste observationnel (pas un essai
randomisé) → toujours formulé comme piste, cf. limite causale ADR 0096.

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
- **Within-page fait sur la SEULE feature versionnée facilement (longueur)** : liens
  et images n'ont pas encore d'historique reconstruit → within limité à la longueur
  pour l'instant. Les autres features restent en between (non causal).
- **Observationnel** → within-page ≠ essai randomisé ; associations conditionnelles
  robustes, pas preuve d'un levier. Toujours restitué comme piste (ADR 0096).
- **API et non dumps** → volume limité, non reproductible à l'échelle.

## Points de décision restants (pour toi)

1. **`backlinks` comme variable** : le garder comme **contrôle** (pas levier) ou
   l'exclure ? Il capte la notoriété mais peut masquer l'effet des vrais leviers.
   Recommandation : contrôle explicite, jamais restitué comme conseil.
2. **Within-page étendu aux autres features** : la longueur a un historique
   (`prop=revisions`) et donne un effet within robuste (+0,18). Étendre aux liens/
   images exige leur historique (dumps `pagelinks`/`page` par run, ou reconstruction).
   Décision : quelles features versionner en priorité ?
3. **Passage aux dumps (Phase 5)** : non faisable en autonomie (S3, secrets, To).
   C'est le prochain gros jalon — nécessite ton implication infra.
4. **Seuil d'inclusion analytique** (`works ≥ 100 ∧ n_langs ≥ 2`) : à valider sur
   données réelles avant de figer.
