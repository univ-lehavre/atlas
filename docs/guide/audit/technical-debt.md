# Audit de la dette technique

> **Dernière mise à jour :** 29 janvier 2026

Ce document présente un audit de la dette technique du monorepo Atlas, identifiant les zones nécessitant une attention particulière.

## Résumé exécutif

| Catégorie | Nombre | Sévérité |
|-----------|--------|----------|
| Fichiers volumineux (>400 lignes) | 5 | Haute |
| Packages sans tests | 3 | Critique |
| Assertions de type `as any` | 1 | Moyenne |
| Commentaires `eslint-disable` | 15 | Basse |
| Scripts manquants | 1 | Moyenne |

---

## 1. Couverture de tests

### 1.1 Packages sans tests

| Package | Fichiers source | Impact |
|---------|-----------------|--------|
| `@univ-lehavre/atlas-redcap-openapi` | 18 | **Critique** - Logique complexe d'extraction OpenAPI |
| `@univ-lehavre/atlas-logos` | 0 | Faible - Assets uniquement |
| `@univ-lehavre/atlas-shared-config` | 0 | Faible - Configuration uniquement |

### 1.2 Couverture insuffisante

| Package | Tests | Fichiers | Ratio |
|---------|-------|----------|-------|
| `@univ-lehavre/atlas-crf` | 7 | 41 | 17% |
| `@univ-lehavre/atlas-errors` | 1 | 4 | 25% |
| `@univ-lehavre/atlas-net` | 3 | 10 | 30% |

### 1.3 Bonne couverture

| Package | Tests | Fichiers | Ratio |
|---------|-------|----------|-------|
| `@univ-lehavre/atlas-redcap-core` | 18 | 60 | 30% |
| `@univ-lehavre/atlas-amarre` | 11 | 31 | 35% |
| `@univ-lehavre/atlas-auth` | 2 | 5 | 40% |

---

## 2. Fichiers volumineux

### 2.1 Fichiers critiques (>500 lignes)

| Fichier | Lignes | Problème |
|---------|--------|----------|
| `find-an-expert/src/lib/content/types.ts` | 821 | Types i18n monolithiques |
| `redcap-openapi/src/extractor/generator.ts` | 580 | Générateur complexe |
| `redcap-openapi/src/core/generator.ts` | 534 | Logique de génération |
| `redcap-openapi/src/extractor/parsers.ts` | 500 | Parseurs PHP |
| `crf/src/redcap/client.ts` | 412 | Client REDCap principal |

### 2.2 Recommandations

1. **content/types.ts** : Diviser par domaine (common, health, profile, research)
2. **extractor/generator.ts** : Extraire les sous-générateurs en modules
3. **crf/client.ts** : Modulariser par fonctionnalité (records, users, surveys)

---

## 3. Qualité du code

### 3.1 Assertions de type

```typescript
// packages/crf/src/cli/shared/terminal.ts:314
options: selectOptions as any
```

**Contexte** : Limitation des types conditionnels de `@clack/prompts`.

### 3.2 Exemptions ESLint

| Catégorie | Nombre | Packages |
|-----------|--------|----------|
| Règles fonctionnelles | 8 | net, crf |
| Tests | 6 | appwrite, auth, errors |
| Sécurité | 1 | net |

**Observation** : La plupart des exemptions sont justifiées pour du code impératif ou des tests.

---

## 4. Scripts manquants

### 4.1 Script `typecheck`

| Package | Impact |
|---------|--------|
| `@univ-lehavre/atlas-redcap-openapi` | Moyen - Erreurs de type non détectées localement |

**Solution** : Ajouter `"typecheck": "tsc --noEmit"` au package.json.

---

## 5. Dépendances

### 5.1 Versions peer dependencies

| Outil | shared-config | Packages |
|-------|---------------|----------|
| TypeScript | `^5.0.0` | `^5.9.3` |
| ESLint | `^9.0.0` | `^9.39.2` |
| Prettier | `^3.0.0` | `^3.8.1` |

**Observation** : Les peer dependencies sont volontairement larges pour la compatibilité.

### 5.2 Cohérence

- **Effect** : Toutes les versions alignées sur `^3.19.15`
- **Vitest** : Toutes les versions alignées sur `^4.0.18`

---

## 6. Patterns dépréciés

| Fichier | Pattern | Alternative |
|---------|---------|-------------|
| `find-an-expert/src/lib/content/index.ts` | Barrel imports | Imports modulaires |
| `find-an-expert/src/lib/content/core/i18n-context.svelte.ts` | Ancien API content | common, health, profile, research |

---

## 7. Plan de remédiation

### Priorité 1 - Critique

| Action | Package | Effort |
|--------|---------|--------|
| Ajouter des tests | redcap-openapi | Élevé |
| Diviser types.ts | find-an-expert | Moyen |
| Ajouter script typecheck | redcap-openapi | Faible |

### Priorité 2 - Important

| Action | Package | Effort |
|--------|---------|--------|
| Refactoriser generators | redcap-openapi | Élevé |
| Améliorer couverture tests | crf | Moyen |
| Modulariser client.ts | crf | Moyen |

### Priorité 3 - Souhaitable

| Action | Package | Effort |
|--------|---------|--------|
| Extraire données statiques | find-an-expert | Faible |
| Partager config vitest | monorepo | Moyen |
| Documenter API publique | redcap-openapi | Faible |

---

## 8. Métriques de suivi

Pour suivre la réduction de la dette technique :

```bash
# Fichiers volumineux (>400 lignes)
find packages -name "*.ts" -exec wc -l {} \; | awk '$1 > 400 {print}' | wc -l

# Couverture de tests
pnpm test -- --coverage

# Commentaires TODO/FIXME
grep -r "TODO\|FIXME" packages/*/src --include="*.ts" | wc -l
```
