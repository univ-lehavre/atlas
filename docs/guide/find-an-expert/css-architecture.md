# CSS Architecture

> Guide de l'architecture CSS pour Talent Finder

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Design tokens](#design-tokens)
- [Approche hybride](#approche-hybride)
- [Système de thèmes](#système-de-thèmes)
- [Dark mode](#dark-mode)
- [Composants](#composants)
- [Bonnes pratiques](#bonnes-pratiques)
- [Checklist PR](#checklist-pr)

## Vue d'ensemble

Le projet utilise une architecture CSS moderne combinant :

| Technologie               | Usage                                         | Proportion |
| ------------------------- | --------------------------------------------- | ---------- |
| **Tailwind CSS 4.1**      | Utilitaires (layout, spacing)                 | ~70%       |
| **CSS Custom Properties** | Design tokens centralisés                     | Global     |
| **Scoped Styles**         | Composants complexes avec variants            | ~30%       |
| **OKLCH Color Space**     | Système de couleurs perceptuellement uniforme | 100%       |

### Fichiers clés

```
src/
├── app.css              # Design system global (~775 lignes)
└── lib/
    └── ui/
        └── *.svelte     # Composants avec styles scoped
```

## Design tokens

Tous les tokens sont définis dans `src/app.css` et accessibles via CSS custom properties.

### Couleurs (OKLCH)

Le système utilise l'espace colorimétrique OKLCH pour générer des nuances cohérentes :

```css
/* Paramètres de base */
:root {
  --hue-primary: 250;    /* Teinte principale (0-360°) */
  --hue-accent: 180;     /* Teinte d'accent */
  --hue-neutral: 260;    /* Teinte neutre */
  --chroma: 0.15;        /* Saturation (0-0.3) */
}

/* Nuances générées automatiquement */
--color-primary-50   /* Plus clair */
--color-primary-100
--color-primary-200
--color-primary-300
--color-primary-400
--color-primary-500  /* Base */
--color-primary-600
--color-primary-700
--color-primary-800
--color-primary-900
--color-primary-950  /* Plus foncé */
```

**Catégories de couleurs :**

| Catégorie   | Usage                           | Tokens              |
| ----------- | ------------------------------- | ------------------- |
| `primary`   | Actions principales, liens, CTA | 50-950 (11 nuances) |
| `accent`    | Mise en évidence secondaire     | 50-950 (11 nuances) |
| `secondary` | Texte, arrière-plans neutres    | 50-950 (11 nuances) |
| `success`   | Feedback positif                | 50, 500, 600, 700   |
| `warning`   | Alertes, avertissements         | 50, 500, 600, 700   |
| `error`     | Erreurs, états critiques        | 50, 500, 600, 700   |

### Typographie

```css
/* Familles de polices */
--font-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;
--font-heading: var(--font-heading-family), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-mono-family), ui-monospace, monospace;

/* Tailles */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
```

### Espacement

```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */
--spacing-xl: 2rem; /* 32px */
--spacing-2xl: 3rem; /* 48px */
```

### Autres tokens

```css
/* Border Radius */
--radius-sm: 0.25rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px 0 oklch(0% 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px oklch(0% 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px oklch(0% 0 0 / 0.1);

/* Transitions */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

## Approche hybride

### Quand utiliser Tailwind

Utiliser Tailwind (classes utilitaires) pour :

- Layout (flex, grid, positioning)
- Spacing (margin, padding)
- Responsive design (breakpoints)
- Styles simples et directs

```svelte
<!-- ✅ Bon : Tailwind pour layout et spacing -->
<div class="flex items-center gap-4 p-6 md:p-8">
	<h2 class="text-2xl font-semibold">Titre</h2>
</div>
```

### Quand utiliser les styles scoped

Utiliser les styles scoped (`<style>`) pour :

- Composants avec plusieurs variants (`data-variant`)
- Animations complexes
- États dynamiques multiples
- Intégration avec CSS custom properties

```svelte
<!-- ✅ Bon : Styles scoped pour variants complexes -->
<div class="alert" data-variant={variant}>
	<slot />
</div>

<style>
	.alert {
		--alert-bg: var(--color-primary-50);
		--alert-border: var(--color-primary-200);
		background-color: var(--alert-bg);
		border: 1px solid var(--alert-border);
	}

	.alert[data-variant='success'] {
		--alert-bg: var(--color-success-50);
		--alert-border: var(--color-success-500);
	}

	.alert[data-variant='error'] {
		--alert-bg: var(--color-error-50);
		--alert-border: var(--color-error-500);
	}
</style>
```

## Système de thèmes

### Palettes de couleurs (18)

Le système propose 18 palettes prédéfinies via l'attribut `data-palette` :

| Catégorie    | Palettes                       |
| ------------ | ------------------------------ |
| Professional | `corporate`, `executive`       |
| Nature       | `forest`, `ocean`, `earth`     |
| Vibrant      | `neon`, `electric`, `tropical` |
| Minimal      | `paper`, `slate`, `stone`      |
| Warm         | `amber`, `rose`, `terracotta`  |
| Cool         | `arctic`, `indigo`, `mint`     |

```html
<!-- Appliquer une palette -->
<body data-palette="ocean"></body>
```

### Pairings typographiques (30)

30 combinaisons de polices via l'attribut `data-font` :

| Catégorie  | Fonts                                                            |
| ---------- | ---------------------------------------------------------------- |
| Sans-serif | `modern`, `humanist`, `geometric`, `minimal`, `startup`, etc.    |
| Serif      | `editorial`, `classic`, `literary`, `magazine`, `academic`, etc. |
| Display    | `bold-statement`, `creative`, `luxe`, `vintage`, `urban`, etc.   |
| Technical  | `technical`, `developer`, `terminal`, `data`, `science`, etc.    |

```html
<!-- Appliquer un pairing -->
<body data-font="editorial"></body>
```

## Dark mode

### Implémentation

Le dark mode utilise la classe `.dark` sur l'élément `<html>` :

```css
/* Tailwind custom variant */
@custom-variant dark (&:where(.dark, .dark *));

/* Schéma de couleur */
html {
	color-scheme: light;
}
html.dark {
	color-scheme: dark;
}
```

### Pattern pour styles scoped

```css
/* Styles light (défaut) */
.component {
	--bg: var(--color-secondary-50);
	--text: var(--color-secondary-900);
	background-color: var(--bg);
	color: var(--text);
}

/* Styles dark */
:global(.dark) .component {
	--bg: var(--color-secondary-800);
	--text: var(--color-secondary-100);
}
```

### Pattern OKLCH pour dark mode

Pour les couleurs avec teinte préservée :

```css
:global(.dark) .alert[data-variant='success'] {
	--alert-bg: oklch(from var(--color-success-500) 20% 0.05 h);
}
```

### Couleurs dark mode standards

| Élément         | Light           | Dark            |
| --------------- | --------------- | --------------- |
| Background      | `secondary-50`  | `secondary-900` |
| Surface/Cards   | `white`         | `secondary-800` |
| Text principal  | `secondary-900` | `secondary-100` |
| Text secondaire | `secondary-600` | `secondary-400` |
| Borders         | `secondary-200` | `secondary-700` |
| Primary actions | `primary-600`   | `primary-400`   |

## Composants

### Classes utilitaires globales

Définies dans `app.css` via `@layer components` :

**Boutons :**

- `.btn-primary` - Action principale
- `.btn-secondary` - Action secondaire
- `.btn-accent` - Action d'accent
- `.btn-outline` - Bouton bordure
- `.btn-ghost` - Bouton transparent
- `.btn-sm`, `.btn-lg` - Tailles

**Cards :**

- `.card` - Card avec ombre
- `.card-bordered` - Card avec bordure

**Formulaires :**

- `.input` - Champ de saisie
- `.input-error` - État erreur
- `.label` - Label de formulaire

**Badges :**

- `.badge-primary`, `.badge-accent`
- `.badge-success`, `.badge-warning`, `.badge-error`

**Alertes :**

- `.alert-info`, `.alert-success`
- `.alert-warning`, `.alert-error`

### Système de variants (data-attributes)

Les composants complexes utilisent des attributs `data-*` pour les variants :

```svelte
<!-- Variants de style -->
<Section data-variant="surface" />
<Section data-variant="card" />
<Section data-variant="transparent" />

<!-- Tailles -->
<Badge data-size="sm" />
<Badge data-size="md" />
<Badge data-size="lg" />

<!-- Spacing -->
<Section data-spacing="sm" />
<Section data-spacing="md" />
<Section data-spacing="lg" />
```

## Bonnes pratiques

### 1. Source unique de vérité

Toujours utiliser les design tokens :

```css
/* ✅ Bon */
color: var(--color-primary-600);
padding: var(--spacing-md);
border-radius: var(--radius-lg);

/* ❌ Mauvais */
color: #4f46e5;
padding: 16px;
border-radius: 8px;
```

### 2. Couleurs sémantiques

Ne jamais utiliser de couleurs descriptives :

```css
/* ✅ Bon */
@apply bg-primary-600 text-success-500;

/* ❌ Mauvais */
@apply bg-blue-600 text-green-500;
```

### 3. Mobile-first responsive

Toujours partir du mobile :

```svelte
<!-- ✅ Bon : mobile-first -->
<div class="flex-col md:flex-row lg:gap-8">

<!-- ❌ Mauvais : desktop-first -->
<div class="flex-row max-md:flex-col">
```

### 4. Accessibilité

Toujours inclure :

```css
/* Focus visible */
:focus-visible {
	@apply outline-2 outline-offset-2 outline-primary-500;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
	* {
		animation-duration: 0.01ms !important;
		transition-duration: 0.01ms !important;
	}
}
```

### 5. Pas de magic numbers

```css
/* ✅ Bon */
gap: var(--spacing-md);
font-size: var(--text-lg);

/* ❌ Mauvais */
gap: 16px;
font-size: 18px;
```

### 6. Scoped styles minimaux

Les styles scoped ne doivent contenir que ce qui ne peut pas être fait avec Tailwind :

```svelte
<!-- ✅ Bon : Tailwind pour layout, scoped pour variants -->
<div class="flex items-center gap-4 p-4" data-variant={variant}>

<style>
  /* Seulement les variants complexes */
  [data-variant='success'] { --icon-color: var(--color-success-500); }
  [data-variant='error'] { --icon-color: var(--color-error-500); }
</style>
```

## Checklist PR

### Avant de soumettre du CSS

- [ ] **Tokens** : Utilise les design tokens (pas de valeurs hardcodées)
- [ ] **Dark mode** : Le composant supporte le dark mode
- [ ] **Responsive** : Mobile-first avec breakpoints appropriés
- [ ] **Accessibilité** : Focus states visibles, contrastes suffisants
- [ ] **Sémantique** : Couleurs sémantiques (primary, success, error)
- [ ] **Scoped minimal** : Pas de duplication avec Tailwind
- [ ] **Variants** : Utilise `data-*` attributes si plusieurs variants

### Vérifications automatiques

```bash
# Linting CSS (si Stylelint configuré)
pnpm lint

# Build pour vérifier le purge CSS
pnpm build
```

## Audit et qualité

- [CSS Audit Report](./audit/css-audit-report.md) - Rapport d'audit détaillé (Issue #41)

## Ressources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [OKLCH Color Space](https://oklch.com/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Svelte Scoped Styles](https://svelte.dev/docs/svelte-components#style)
