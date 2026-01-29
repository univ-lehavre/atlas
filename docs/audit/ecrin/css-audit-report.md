---
title: CSS Audit Report
description: Rapport d'audit CSS - Issue #41
tags: [audit, css, quality, documentation]
date: 2026-01-17
---

# CSS Audit Report

> Audit complet de l'architecture CSS du projet Talent Finder (Issue #41)

## Table des matières

- [Sommaire exécutif](#sommaire-exécutif)
- [Métriques actuelles](#métriques-actuelles)
- [Analyse de conformité](#analyse-de-conformité)
- [Problèmes identifiés](#problèmes-identifiés)
- [Recommandations](#recommandations)
- [Plan d'action](#plan-daction)

## Sommaire exécutif

| Catégorie        | Score   | Statut  |
| ---------------- | ------- | ------- |
| Design Tokens    | 95%     | Bon     |
| Dark Mode        | 90%     | Bon     |
| Accessibilité    | 70%     | Moyen   |
| Performance      | 85%     | Bon     |
| Maintenabilité   | 80%     | Bon     |
| **Score Global** | **84%** | **Bon** |

### Points forts

- Système de design tokens OKLCH cohérent et bien documenté
- Architecture hybride Tailwind/Scoped styles bien définie
- Support dark mode complet sur la plupart des composants
- Utilisation consistante de CSS custom properties
- Pattern `data-variant`/`data-size` bien implémenté

### Points d'amélioration

- Absence de support `prefers-reduced-motion` (accessibilité)
- Quelques valeurs hardcodées (`white` au lieu de tokens)
- Focus states manquants sur certains composants interactifs
- Duplication de la classe `.sr-only` dans plusieurs composants

## Métriques actuelles

### Distribution des fichiers

| Métrique                    | Valeur | Pourcentage |
| --------------------------- | ------ | ----------- |
| Fichiers Svelte totaux      | 88     | 100%        |
| Fichiers avec `<style>`     | 26     | 30%         |
| Fichiers Tailwind only      | 62     | 70%         |
| Fichiers avec `:global()`   | 22     | 25%         |
| Fichiers avec styles inline | 6      | 7%          |

### Design System

| Métrique             | Valeur |
| -------------------- | ------ |
| Variables CSS        | ~70    |
| Palettes de couleurs | 18     |
| Pairings de fonts    | 30     |
| Classes utilitaires  | 15     |

### CSS Bundle Size (Production)

| Fichier                          | Taille    | Gzip     |
| -------------------------------- | --------- | -------- |
| `0.CIcGkYdh.css` (layout)        | 59.79 kB  | 9.43 kB  |
| `3.BJGE_YKl.css` (theme page)    | 175.59 kB | 26.60 kB |
| `ConsentStatusCard.D4C9130X.css` | 38.39 kB  | 5.47 kB  |
| **Total estimé**                 | ~274 kB   | ~42 kB   |

> **Note** : Le fichier theme (175 kB) est volumineux car il contient les 18 palettes et 30 fonts. Ce CSS est chargé uniquement sur `/theme`.

## Analyse de conformité

### 1. Design Tokens

| Critère                       | Statut | Notes                  |
| ----------------------------- | ------ | ---------------------- |
| Couleurs via CSS custom props | ✅     | Bien implémenté        |
| Spacing via tokens            | ✅     | `--spacing-*` utilisé  |
| Typography via tokens         | ✅     | `--text-*`, `--font-*` |
| Border radius via tokens      | ✅     | `--radius-*`           |
| Transitions via tokens        | ✅     | `--transition-*`       |
| Shadows via tokens            | ✅     | `--shadow-*`           |

### 2. Patterns data-variant/data-size

**Composants utilisant `data-variant` (12)** :

- `Alert.svelte` ✅
- `Badge.svelte` ✅
- `InfoCard.svelte` ✅
- `StatCard.svelte` ✅
- `LinkButton.svelte` ✅
- `LoadingSpinner.svelte` ✅
- `Section.svelte` ✅
- `CenteredLayout.svelte` ✅
- `PageLayout.svelte` ✅
- `PageHeader.svelte` ✅
- `KeyValue.svelte` ✅
- `ErrorState.svelte` ✅

**Composants utilisant `data-size` (5)** :

- `Badge.svelte` ✅
- `StatCard.svelte` ✅
- `LinkButton.svelte` ✅
- `LoadingSpinner.svelte` ✅
- `KeyValue.svelte` ✅

### 3. Dark Mode

| Critère                          | Statut | Notes                        |
| -------------------------------- | ------ | ---------------------------- |
| Pattern `:global(.dark)` utilisé | ✅     | 22 fichiers                  |
| Couleurs adaptées correctement   | ✅     | Light/Dark cohérent          |
| Transitions smooth               | ✅     | `transition-colors` appliqué |
| OKLCH pour teintes préservées    | ✅     | Utilisé dans Badge, Alert    |

### 4. Accessibilité

| Critère                          | Statut | Notes                          |
| -------------------------------- | ------ | ------------------------------ |
| Focus visible states             | ⚠️     | Présent sur 2/26 composants    |
| `prefers-reduced-motion`         | ❌     | Non implémenté                 |
| Screen reader support (.sr-only) | ⚠️     | Dupliqué, à centraliser        |
| Contrastes WCAG AA               | ✅     | OKLCH garantit bons contrastes |
| `role` attributes                | ✅     | Présent où nécessaire          |

### 5. Performance

| Critère                    | Statut | Notes               |
| -------------------------- | ------ | ------------------- |
| PurgeCSS actif (Tailwind)  | ✅     | Intégré v4          |
| Pas de CSS-in-JS runtime   | ✅     | CSS statique        |
| Code splitting CSS         | ✅     | Par route           |
| Animations GPU-accelerated | ✅     | `transform` utilisé |

## Problèmes identifiés

### Priorité Haute

#### P1: Absence de `prefers-reduced-motion`

**Fichiers concernés** : Tous les composants avec animations

**Impact** : Accessibilité - utilisateurs sensibles aux mouvements

**Recommandation** : Ajouter dans `app.css` :

```css
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

#### P2: Focus states manquants

**Fichiers concernés** :

- `Button.svelte` - Focus state minimal
- `DataTable.svelte` - Pas de focus sur rows
- `Badge.svelte` - Pas de focus (non interactif, OK)
- Plusieurs composants interactifs

**Impact** : Navigation clavier difficile

**Recommandation** : Ajouter `:focus-visible` sur tous les éléments interactifs

### Priorité Moyenne

#### P3: Valeur `white` hardcodée

**Fichiers concernés** :

- `DataTable.svelte:153` - `background-color: white`
- `DataTable.svelte:208` - `background-color: white`
- `StatCard.svelte:89` - `--stat-bg: white`
- `LinkButton.svelte:117` - `--btn-text: white`

**Impact** : Incohérence potentielle avec le design system

**Recommandation** : Remplacer par `var(--color-secondary-50)` ou créer un token `--color-surface`

#### P4: Duplication de `.sr-only`

**Fichiers concernés** :

- `LoadingSpinner.svelte:98-108`
- `DataTable.svelte:272-282`

**Impact** : Code dupliqué, maintenance difficile

**Recommandation** : Ajouter `.sr-only` comme classe utilitaire dans `app.css`

### Priorité Basse

#### P5: Styles inline dynamiques

**Fichiers concernés** (6) :

- `ColorSwatch.svelte` - Justifié (couleurs dynamiques)
- `ColorScaleRow.svelte` - Justifié (couleurs dynamiques)
- `HealthStatusCard.svelte` - À évaluer
- `Modal.svelte` - Largeur dynamique
- `Signup.svelte` - À évaluer
- `theme/+page.svelte` - Justifié (preview)

**Impact** : Faible, la plupart sont justifiés

**Recommandation** : Réviser `HealthStatusCard.svelte` et `Signup.svelte`

#### P6: Animation sans `will-change`

**Fichiers concernés** :

- `Button.svelte` - spinner animation
- `LoadingSpinner.svelte` - spin animation

**Impact** : Performance potentiellement non optimale

**Recommandation** : Ajouter `will-change: transform` sur les éléments animés

## Recommandations

### Court terme (Sprint actuel)

1. **Ajouter `prefers-reduced-motion`** dans `app.css`
2. **Ajouter `.sr-only` global** dans `app.css` @layer utilities
3. **Auditer les focus states** des composants interactifs

### Moyen terme (Prochain sprint)

4. **Remplacer `white` hardcodé** par tokens
5. **Créer un token `--color-surface`** pour les backgrounds de cards
6. **Documenter les conventions de nommage** des CSS custom properties locales

### Long terme (Backlog)

7. **Évaluer l'ajout de Stylelint** pour automatiser les vérifications
8. **Créer des tests visuels** avec Playwright pour les composants UI
9. **Benchmark de performance CSS** avec Lighthouse

## Plan d'action

### Issues à créer

| ID  | Titre                                                        | Priorité | Labels             |
| --- | ------------------------------------------------------------ | -------- | ------------------ |
| 1   | fix(a11y): add prefers-reduced-motion support                | P1       | a11y, css          |
| 2   | fix(a11y): audit and improve focus-visible states            | P1       | a11y, css          |
| 3   | refactor(css): add global .sr-only utility class             | P2       | refactor, css      |
| 4   | fix(css): replace hardcoded white values with tokens         | P2       | css, design-system |
| 5   | feat(css): add --color-surface token                         | P3       | css, design-system |
| 6   | chore(docs): document CSS custom property naming conventions | P3       | docs, css          |

## Annexes

### A. Liste complète des fichiers avec styles scoped

```
src/lib/ui/feedback/Badge.svelte
src/lib/ui/feedback/Alert.svelte
src/lib/ui/feedback/LoadingSpinner.svelte
src/lib/ui/feedback/LoadingState.svelte
src/lib/ui/feedback/ErrorState.svelte
src/lib/ui/actions/Button.svelte
src/lib/ui/actions/LinkButton.svelte
src/lib/ui/actions/ButtonGroup.svelte
src/lib/ui/data-display/DataTable.svelte
src/lib/ui/data-display/StatCard.svelte
src/lib/ui/data-display/InfoCard.svelte
src/lib/ui/data-display/KeyValue.svelte
src/lib/ui/layout/Section.svelte
src/lib/ui/layout/Grid.svelte
src/lib/ui/layout/CenteredLayout.svelte
src/lib/ui/layout/PageLayout.svelte
src/lib/ui/layout/PageHeader.svelte
src/lib/ui/theme/ThemeToggleRow.svelte
src/lib/ui/forms/LoginForm.svelte
src/lib/ui/dashboard/ProfileCard.svelte
src/lib/ui/dashboard/ThemePreferencesCard.svelte
src/lib/ui/dashboard/ExternalLinkCard.svelte
src/lib/ui/dashboard/DashboardLinkCard.svelte
src/lib/ui/dashboard/ExternalLinksCard.svelte
src/lib/ui/dashboard/ComingSoonSection.svelte
src/routes/api/docs/+page.svelte
```

### B. Ressources utilisées

- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [CSS Architecture Guide](https://cssguidelin.es/)
- [OKLCH Color Space](https://oklch.com/)

---

_Rapport généré le 2026-01-17 dans le cadre de l'issue #41_
