# CSS Architecture

> CSS architecture guide for Talent Finder

## Table of Contents

- [Overview](#overview)
- [Design tokens](#design-tokens)
- [Hybrid approach](#hybrid-approach)
- [Theme system](#theme-system)
- [Dark mode](#dark-mode)
- [Components](#components)
- [Best practices](#best-practices)
- [PR checklist](#pr-checklist)

## Overview

The project uses a modern CSS architecture combining:

| Technology                | Usage                                    | Proportion |
| ------------------------- | ---------------------------------------- | ---------- |
| **Tailwind CSS 4.1**      | Utilities (layout, spacing)              | ~70%       |
| **CSS Custom Properties** | Centralized design tokens                | Global     |
| **Scoped Styles**         | Complex components with variants         | ~30%       |
| **OKLCH Color Space**     | Perceptually uniform color system        | 100%       |

### Key Files

```
src/
├── app.css              # Global design system (~775 lines)
└── lib/
    └── ui/
        └── *.svelte     # Components with scoped styles
```

## Design Tokens

All tokens are defined in `src/app.css` and accessible via CSS custom properties.

### Colors (OKLCH)

The system uses the OKLCH color space to generate consistent shades:

```css
/* Base parameters */
:root {
  --hue-primary: 250;    /* Primary hue (0-360) */
  --hue-accent: 180;     /* Accent hue */
  --hue-neutral: 260;    /* Neutral hue */
  --chroma: 0.15;        /* Saturation (0-0.3) */
}

/* Automatically generated shades */
--color-primary-50   /* Lightest */
--color-primary-100
--color-primary-200
--color-primary-300
--color-primary-400
--color-primary-500  /* Base */
--color-primary-600
--color-primary-700
--color-primary-800
--color-primary-900
--color-primary-950  /* Darkest */
```

**Color categories:**

| Category    | Usage                           | Tokens              |
| ----------- | ------------------------------- | ------------------- |
| `primary`   | Main actions, links, CTA        | 50-950 (11 shades)  |
| `accent`    | Secondary highlighting          | 50-950 (11 shades)  |
| `secondary` | Text, neutral backgrounds       | 50-950 (11 shades)  |
| `success`   | Positive feedback               | 50, 500, 600, 700   |
| `warning`   | Alerts, warnings                | 50, 500, 600, 700   |
| `error`     | Errors, critical states         | 50, 500, 600, 700   |

### Typography

```css
/* Font families */
--font-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;
--font-heading: var(--font-heading-family), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-mono-family), ui-monospace, monospace;

/* Sizes */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
```

### Spacing

```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */
--spacing-xl: 2rem; /* 32px */
--spacing-2xl: 3rem; /* 48px */
```

### Other Tokens

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

## Hybrid Approach

### When to Use Tailwind

Use Tailwind (utility classes) for:

- Layout (flex, grid, positioning)
- Spacing (margin, padding)
- Responsive design (breakpoints)
- Simple and direct styles

```svelte
<!-- Good: Tailwind for layout and spacing -->
<div class="flex items-center gap-4 p-6 md:p-8">
	<h2 class="text-2xl font-semibold">Title</h2>
</div>
```

### When to Use Scoped Styles

Use scoped styles (`<style>`) for:

- Components with multiple variants (`data-variant`)
- Complex animations
- Multiple dynamic states
- Integration with CSS custom properties

```svelte
<!-- Good: Scoped styles for complex variants -->
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

## Theme System

### Color Palettes (18)

The system offers 18 predefined palettes via the `data-palette` attribute:

| Category     | Palettes                       |
| ------------ | ------------------------------ |
| Professional | `corporate`, `executive`       |
| Nature       | `forest`, `ocean`, `earth`     |
| Vibrant      | `neon`, `electric`, `tropical` |
| Minimal      | `paper`, `slate`, `stone`      |
| Warm         | `amber`, `rose`, `terracotta`  |
| Cool         | `arctic`, `indigo`, `mint`     |

```html
<!-- Apply a palette -->
<body data-palette="ocean"></body>
```

### Typography Pairings (30)

30 font combinations via the `data-font` attribute:

| Category   | Fonts                                                            |
| ---------- | ---------------------------------------------------------------- |
| Sans-serif | `modern`, `humanist`, `geometric`, `minimal`, `startup`, etc.    |
| Serif      | `editorial`, `classic`, `literary`, `magazine`, `academic`, etc. |
| Display    | `bold-statement`, `creative`, `luxe`, `vintage`, `urban`, etc.   |
| Technical  | `technical`, `developer`, `terminal`, `data`, `science`, etc.    |

```html
<!-- Apply a pairing -->
<body data-font="editorial"></body>
```

## Dark Mode

### Implementation

Dark mode uses the `.dark` class on the `<html>` element:

```css
/* Tailwind custom variant */
@custom-variant dark (&:where(.dark, .dark *));

/* Color scheme */
html {
	color-scheme: light;
}
html.dark {
	color-scheme: dark;
}
```

### Pattern for Scoped Styles

```css
/* Light styles (default) */
.component {
	--bg: var(--color-secondary-50);
	--text: var(--color-secondary-900);
	background-color: var(--bg);
	color: var(--text);
}

/* Dark styles */
:global(.dark) .component {
	--bg: var(--color-secondary-800);
	--text: var(--color-secondary-100);
}
```

### OKLCH Pattern for Dark Mode

For colors with preserved hue:

```css
:global(.dark) .alert[data-variant='success'] {
	--alert-bg: oklch(from var(--color-success-500) 20% 0.05 h);
}
```

### Standard Dark Mode Colors

| Element        | Light           | Dark            |
| -------------- | --------------- | --------------- |
| Background     | `secondary-50`  | `secondary-900` |
| Surface/Cards  | `white`         | `secondary-800` |
| Primary text   | `secondary-900` | `secondary-100` |
| Secondary text | `secondary-600` | `secondary-400` |
| Borders        | `secondary-200` | `secondary-700` |
| Primary actions| `primary-600`   | `primary-400`   |

## Components

### Global Utility Classes

Defined in `app.css` via `@layer components`:

**Buttons:**

- `.btn-primary` - Primary action
- `.btn-secondary` - Secondary action
- `.btn-accent` - Accent action
- `.btn-outline` - Outline button
- `.btn-ghost` - Transparent button
- `.btn-sm`, `.btn-lg` - Sizes

**Cards:**

- `.card` - Card with shadow
- `.card-bordered` - Card with border

**Forms:**

- `.input` - Input field
- `.input-error` - Error state
- `.label` - Form label

**Badges:**

- `.badge-primary`, `.badge-accent`
- `.badge-success`, `.badge-warning`, `.badge-error`

**Alerts:**

- `.alert-info`, `.alert-success`
- `.alert-warning`, `.alert-error`

### Variant System (data-attributes)

Complex components use `data-*` attributes for variants:

```svelte
<!-- Style variants -->
<Section data-variant="surface" />
<Section data-variant="card" />
<Section data-variant="transparent" />

<!-- Sizes -->
<Badge data-size="sm" />
<Badge data-size="md" />
<Badge data-size="lg" />

<!-- Spacing -->
<Section data-spacing="sm" />
<Section data-spacing="md" />
<Section data-spacing="lg" />
```

## Best Practices

### 1. Single Source of Truth

Always use design tokens:

```css
/* Good */
color: var(--color-primary-600);
padding: var(--spacing-md);
border-radius: var(--radius-lg);

/* Bad */
color: #4f46e5;
padding: 16px;
border-radius: 8px;
```

### 2. Semantic Colors

Never use descriptive colors:

```css
/* Good */
@apply bg-primary-600 text-success-500;

/* Bad */
@apply bg-blue-600 text-green-500;
```

### 3. Mobile-First Responsive

Always start from mobile:

```svelte
<!-- Good: mobile-first -->
<div class="flex-col md:flex-row lg:gap-8">

<!-- Bad: desktop-first -->
<div class="flex-row max-md:flex-col">
```

### 4. Accessibility

Always include:

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

### 5. No Magic Numbers

```css
/* Good */
gap: var(--spacing-md);
font-size: var(--text-lg);

/* Bad */
gap: 16px;
font-size: 18px;
```

### 6. Minimal Scoped Styles

Scoped styles should only contain what cannot be done with Tailwind:

```svelte
<!-- Good: Tailwind for layout, scoped for variants -->
<div class="flex items-center gap-4 p-4" data-variant={variant}>

<style>
  /* Only complex variants */
  [data-variant='success'] { --icon-color: var(--color-success-500); }
  [data-variant='error'] { --icon-color: var(--color-error-500); }
</style>
```

## PR Checklist

### Before Submitting CSS

- [ ] **Tokens**: Uses design tokens (no hardcoded values)
- [ ] **Dark mode**: Component supports dark mode
- [ ] **Responsive**: Mobile-first with appropriate breakpoints
- [ ] **Accessibility**: Visible focus states, sufficient contrasts
- [ ] **Semantic**: Semantic colors (primary, success, error)
- [ ] **Minimal scoped**: No duplication with Tailwind
- [ ] **Variants**: Uses `data-*` attributes if multiple variants

### Automated Checks

```bash
# CSS Linting (if Stylelint configured)
pnpm lint

# Build to verify CSS purge
pnpm build
```

## Audit and Quality

- [CSS Audit Report](/audit/ecrin/css-audit-report) - Detailed audit report (Issue #41)

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [OKLCH Color Space](https://oklch.com/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Svelte Scoped Styles](https://svelte.dev/docs/svelte-components#style)
