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

### Phase 4b/4c — Modèle WITHIN-PAGE + tests de robustesse

Le between-pages ci-dessus n'identifie pas causalement (la longueur pourrait juste
marquer la notoriété). On a donc collecté l'**historique versionné de la taille de
page** (`prop=revisions`, **94 512 obs** `(ror,lang,month)` sur 958 séries — faisable
en API) et estimé un panel **à effets fixes page + mois** : l'effet de la longueur
est identifié par la **variation temporelle d'une même page**, ce qui absorbe la
notoriété invariante. Résultat brut : `log_length → log_views` **+0,18** [0,11 ;
0,25]. **Mais ce chiffre brut n'était pas fiable** — il a fallu le passer au crible.

**Ce que les tests de robustesse ont établi** (dont une vérification adversariale
multi-agents qui a corrigé deux erreurs de spécification) :

- **Un test placebo en _niveaux_ semblait tuer l'effet** (la longueur _future_
  prédisait les vues présentes aussi fort). **C'était un faux signal** : la longueur
  est quasi constante dans le temps (AR(1) ≈ 0,97), donc « longueur future ≈ présente »
  mécaniquement — un placebo univarié en niveaux est ininformatif ici. Ne pas citer
  ce test comme réfutation.
- **En premières différences, le placebo s'effondre proprement** : Δlongueur →
  Δvues **+0,14** (p ≈ 0,005), tandis que Δlongueur _future_ → Δvues est **nul**
  (p = 0,72). Signal contemporain propre.
- **Event-study sur 469 vraies éditions** (le test le plus propre) : **pré-tendance
  plate**, **saut net au mois d'édition +0,22** [0,16 ; 0,29], puis **retour partiel**
  les mois suivants. Signature d'un effet de timing réel et **transitoire**.

**Conclusion défendable (posture ADR 0096) :** allonger une page est **associé de
façon robuste** à une hausse **contemporaine** des vues (ordre de grandeur
**+10-15 %**, en partie **transitoire**) — pas la magnitude brute +0,18 qui intègre
de la co-évolution. **Ce n'est pas un effet causal net** (simultanéité idiosyncratique
page×mois non levée, un lead à 3 mois subsiste, puissance au plancher : MDE ≈ 0,135).
Formulation métier : « l'enrichissement est une **piste plausible, peu risquée et
cohérente avec les données** — sans garantie causale ni promesse de gain durable
chiffré ». Ni « prouvé nul », ni « garantie de +X % ».

**Hétérogénéité** : effet apparemment plus fort chez les petites universités
(works 0-99 : +0,43) mais sur 70 pages seulement, IC large, strate la plus endogène
— **hypothèse à tester, jamais une reco**.

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
