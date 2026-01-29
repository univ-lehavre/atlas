# Audit Citations

> **Dernière mise à jour :** 29 janvier 2026

Ce document présente l'audit du module Citations.

## État actuel

| Métrique | Valeur |
|----------|--------|
| Clients implémentés | 2 (OpenAlex, Crossref) |
| Clients planifiés | 3 (HAL, ArXiv, ORCID) |
| Schéma unifié | En cours |
| Tests | À définir |

## Points d'attention

### Architecture

- Validation de la stratégie OpenAPI-first
- Cohérence des adaptateurs entre sources
- Gestion du rate limiting

### Qualité

- Couverture de tests à améliorer
- Documentation TSDoc à compléter

## Recommandations

1. Finaliser les clients OpenAlex et Crossref avant d'ajouter de nouvelles sources
2. Implémenter des tests d'intégration avec les APIs réelles
3. Documenter les différences de comportement entre sources
