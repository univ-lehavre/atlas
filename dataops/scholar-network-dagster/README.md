# scholar-network-dagster

## À quoi sert ce dossier ?

C'est le **pipeline de données** qui cartographie un **réseau de chercheurs** à partir
de leurs affiliations : identifier les chercheurs d'une alliance d'établissements, puis
décrire le **profil thématique** de chacun sur **toute** sa production récente. Le réseau
servi ici est l'alliance **EUNICoast** (14 établissements), mais l'identifiant de la
code-location reste **neutre** (`scholar-network`, [ADR 0022](https://univ-lehavre.github.io/atlas/decisions/0022-naming-convention/)) :
la marque n'apparaît qu'en description, jamais dans un nom de bucket/namespace.

## En quoi c'est distinct de `citation` ?

C'est un **produit distinct** de l'uplift FWCI de la code-location `citation`, avec un
**algorithme de sélection en deux passes** (là où `citation` est mono-passe) :

1. **Brut pré-filtré** — les articles `≥ 2016 ∧ type = 'article'`, projetés aux seules
   colonnes utiles. C'est le **prédicat commun** aux deux passes.
2. **Passe 1 — identification.** Les works à ≥1 affiliation du réseau → la table des
   chercheurs (`author_id`).
3. **Passe 2 — élargissement.** Semi-jointure : **tous** les articles ≥2016 de ces
   chercheurs, y compris ceux écrits hors du réseau.
4. **Profils.** Embedding sémantique par article, moyenne + normalisation L2 par
   chercheur, chargés en **pgvector**.

Le curseur cluster `persistence.mode` pilote ici un **cache du brut pré-filtré** (pas une
borne de volume) : la correction ne dépend jamais du mode. Voir
[ADR 0103](https://univ-lehavre.github.io/atlas/decisions/0103-code-location-profils-chercheurs-reseau/).

Cette code-location est **autonome** ([ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)) :
son propre bucket S3, sa propre base pgvector, son manifeste montant. `citation` reste
**inchangé** ; tout code réutilisé de `citation` est **copié**, jamais importé.

## État (lot 1 — squelette)

Squelette **chargeable et inerte** : structure conforme, `definitions.py` charge sans
aucun asset métier. Les assets (`prefiltered_raw`, `researchers`, `scholar_works`,
`scholar_profiles`) arrivent aux lots 2–5 du
[plan 2026-07-13-scholar-network](https://univ-lehavre.github.io/atlas/plans/2026-07-13-scholar-network/).

## Développement local

Outillage : [uv](https://docs.astral.sh/uv/) (dépendances), ruff (lint/format),
pytest (tests).

```bash
uv sync                       # installe les dépendances (dagster==1.13.7, …)
uv run ruff check             # lint
uv run pytest                 # tests unitaires
uv run dagster definitions validate -m scholar_network_dagster.definitions   # valide la code-location
```
