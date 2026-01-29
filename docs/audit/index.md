# Audits

Cette section contient les audits techniques du monorepo Atlas.

## Audits disponibles

| Document | Description | Dernière mise à jour |
|----------|-------------|----------------------|
| [Audit de la documentation](./common/documentation-audit.md) | État des lieux de la documentation, incohérences identifiées et recommandations | Janvier 2026 |
| [Audit ECRIN](./ecrin/) | Analyse des 6 cartes fonctionnelles et potentiel d'extraction en applications autonomes | Janvier 2026 |
| [Audit des dépendances](./common/dependencies-audit.md) | Inventaire des versions et roadmap de mise à jour | Janvier 2026 |

## Objectif

Les audits permettent de :

- Maintenir une vue d'ensemble de l'état technique du projet
- Identifier les incohérences et les dettes techniques
- Planifier les mises à jour et améliorations
- Documenter les décisions d'architecture

## Résumé des audits

### Audit de la documentation

L'audit de la documentation a identifié plusieurs axes d'amélioration :

- **Identification institutionnelle** : l'Université Le Havre Normandie et ses projets (Campus Polytechnique des Territoires Maritimes et Portuaires, EUNICoast) n'étaient pas mentionnés dans le README racine et la page d'accueil VitePress
- **Cohérence** : incohérences entre le README technique et la documentation utilisateur
- **Logos** : chemins cassés vers les logos dans certains packages

### Audit ECRIN

L'audit ECRIN a analysé les 6 cartes fonctionnelles de l'application :

| Carte | Statut | Potentiel extraction |
|-------|--------|---------------------|
| Introduce | Interface seulement | Moyen |
| Collaborate | Fonctionnel | Élevé |
| Explore | Fonctionnel | Très élevé |
| Ask | Interface seulement | Faible (fusionner avec find-an-expert) |
| Publish | Interface seulement | Moyen |
| Administrate | Fonctionnel | Élevé |

### Audit des dépendances

L'audit des dépendances maintient l'inventaire des 14 packages du monorepo et leurs versions standardisées.
