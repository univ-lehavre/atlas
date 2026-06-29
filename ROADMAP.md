# Feuille de route

> 🇬🇧 **In English.** High-level direction of Atlas over the next ~12 months. This
> is an **intent**, not a commitment: priorities shift with needs and resources.
> Detailed, living plans live in [`docs/.../plans/`](docs/src/content/docs/plans/);
> day-to-day tracking is in [GitHub milestones](https://github.com/univ-lehavre/atlas/milestones).

Cette page donne la **direction** d'Atlas à horizon ~12 mois. C'est une
**intention**, pas un engagement contractuel : les priorités évoluent avec les
besoins et les moyens. Le détail vivant est dans les
[plans](docs/src/content/docs/plans/) ; le suivi au jour le jour, dans les
[milestones GitHub](https://github.com/univ-lehavre/atlas/milestones).

## Cap

Atlas est un **monorepo généraliste et ouvert**
([ADR 0035](docs/src/content/docs/decisions/0035-depot-generaliste-ouvert.md)) :
le cap est de **consolider la chaîne de qualité commune** et de **mener le pipeline
DataOps de bout en bout**, tout en restant réutilisable par n'importe quel
établissement.

## Axes

### 1. Pipeline de recommandation de collaborations

Mener le pipeline de [`dataops/`](dataops/) jusqu'à la mise en production : ingestion
d'instantané de littérature scientifique → transformations dbt → modèle d'uplift
FWCI → recommandations, avec surveillance de dérive et porte de sécurité.
_Suivi : [plan mise en production](docs/src/content/docs/plans/2026-06-23-mise-en-production-openalex.md),
[plan uplift](docs/src/content/docs/plans/2026-06-24-uplift-fwci-eunicoast.md)._

### 2. Socle d'exécution Effect

Achever le passage d'Effect de « langage de description » à **couche d'exécution**
sur le périmètre Node/TypeScript (runtime central, frontière SvelteKit, validation,
erreurs HTTP). _Suivi : [plan socle Effect](docs/src/content/docs/plans/2026-06-04-socle-effect.md)._

### 3. Qualité & sécurité

Renforcer les garde-fous : remonter honnêtement la **couverture de tests** vers le
palier **silver** du badge Best Practices (dette résorbée puis gate relevé, jamais
l'inverse — [ADR 0086](docs/src/content/docs/decisions/0086-posture-paliers-best-practices.md)),
maintenir Scorecard et la chaîne SAST/DAST, durcir la chaîne d'approvisionnement
(signature des tags, 2FA d'organisation).

### 4. Documentation & gouvernance

Maintenir la documentation Diátaxis (Astro Starlight) et la gouvernance lisible
([GOVERNANCE.md](GOVERNANCE.md)).

## Non-objectifs

Ce qu'Atlas **ne** cherche **pas** à faire, pour rester net :

- **Ancrer le dépôt dans un domaine métier ou une marque** — la neutralité est une
  règle ([ADR 0035](docs/src/content/docs/decisions/0035-depot-generaliste-ouvert.md)).
- **Viser le palier `gold`** du badge Best Practices — structurellement hors
  d'atteinte à mainteneur unique, et tracé comme tel
  ([ADR 0086](docs/src/content/docs/decisions/0086-posture-paliers-best-practices.md)).
- **Héberger l'infrastructure** — le socle (cluster Kubernetes, stockage, serveurs
  MLflow/Marquez) vit dans le dépôt [`cluster`](https://github.com/univ-lehavre/cluster)
  ([ADR 0033](docs/src/content/docs/decisions/0033-contrat-interface-cluster.md)).
