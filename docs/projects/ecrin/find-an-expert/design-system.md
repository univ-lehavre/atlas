---
title: Design System
description: Talent Finder design system documentation - colors, typography, and components
tags: [design, ui, tailwind, components, colors]
---

# Design System

This document describes the Talent Finder design system built with Tailwind CSS v4.

## Colors

### Primary (Blue)

Professional blue palette representing trust and reliability.

| Token                          | Usage                         |
| ------------------------------ | ----------------------------- |
| `primary-50` to `primary-200`  | Backgrounds, hover states     |
| `primary-500`                  | Default primary color         |
| `primary-600`                  | Buttons, interactive elements |
| `primary-700`                  | Hover states for buttons      |
| `primary-800` to `primary-950` | Dark accents, text            |

```html
<button class="bg-primary-600 hover:bg-primary-700 text-white">Button</button>
```

### Secondary (Slate)

Neutral slate palette for text and backgrounds.

| Token                              | Usage                     |
| ---------------------------------- | ------------------------- |
| `secondary-50`                     | Page background           |
| `secondary-100` to `secondary-300` | Card backgrounds, borders |
| `secondary-500` to `secondary-700` | Secondary text, icons     |
| `secondary-900`                    | Primary text              |

### Accent (Teal)

Vibrant teal for highlighting and calls to action.

| Token        | Usage           |
| ------------ | --------------- |
| `accent-500` | Accent elements |
| `accent-600` | Accent buttons  |
| `accent-700` | Hover states    |

### Semantic Colors

| Color   | Tokens                                                    | Usage                            |
| ------- | --------------------------------------------------------- | -------------------------------- |
| Success | `success-50`, `success-500`, `success-600`, `success-700` | Positive feedback, confirmations |
| Warning | `warning-50`, `warning-500`, `warning-600`, `warning-700` | Cautions, pending states         |
| Error   | `error-50`, `error-500`, `error-600`, `error-700`         | Errors, destructive actions      |

## Typography

### Font Families

- **Sans**: Inter (UI text)
- **Mono**: JetBrains Mono (code)

```html
<p class="font-sans">Regular text</p>
<code class="font-mono">Code snippet</code>
```

### Font Sizes

| Class       | Size     |
| ----------- | -------- |
| `text-xs`   | 0.75rem  |
| `text-sm`   | 0.875rem |
| `text-base` | 1rem     |
| `text-lg`   | 1.125rem |
| `text-xl`   | 1.25rem  |
| `text-2xl`  | 1.5rem   |
| `text-3xl`  | 1.875rem |
| `text-4xl`  | 2.25rem  |

## Components

### Buttons

```html
<!-- Variants -->
<button class="btn-primary">Primary</button>
<button class="btn-secondary">Secondary</button>
<button class="btn-accent">Accent</button>
<button class="btn-outline">Outline</button>
<button class="btn-ghost">Ghost</button>

<!-- Sizes -->
<button class="btn-primary btn-sm">Small</button>
<button class="btn-primary">Default</button>
<button class="btn-primary btn-lg">Large</button>
```

### Cards

```html
<div class="card">
	<h3>Card Title</h3>
	<p>Card content</p>
</div>

<div class="card-bordered">
	<h3>Bordered Card</h3>
	<p>With border instead of shadow</p>
</div>
```

### Form Elements

```html
<!-- Input -->
<label class="label" for="input">Label</label>
<input class="input" id="input" type="text" placeholder="Placeholder" />

<!-- Error state -->
<input class="input input-error" type="text" />
```

### Badges

```html
<span class="badge-primary">Primary</span>
<span class="badge-accent">Accent</span>
<span class="badge-success">Success</span>
<span class="badge-warning">Warning</span>
<span class="badge-error">Error</span>
```

### Alerts

```html
<div class="alert-info">Informational message</div>
<div class="alert-success">Success message</div>
<div class="alert-warning">Warning message</div>
<div class="alert-error">Error message</div>
```

### Layout

```html
<!-- Container with responsive padding -->
<div class="container-app">
	<!-- Content -->
</div>
```

## Customization

To customize the design system, edit the `@theme` block in `src/app.css`.

### Changing Primary Color

Replace the hue value (currently `250` for blue):

```css
@theme {
	/* Change 250 to your desired hue (0-360) */
	--color-primary-500: oklch(55% 0.15 YOUR_HUE);
}
```

Common hue values:

- Red: 25
- Orange: 50
- Yellow: 85
- Green: 145
- Teal: 180
- Blue: 250
- Purple: 280
- Pink: 330

### Adding Custom Colors

```css
@theme {
	--color-custom-500: oklch(55% 0.15 YOUR_HUE);
}
```

Then use with `bg-custom-500`, `text-custom-500`, etc.

## Related Documentation

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Code source](https://github.com/univ-lehavre/atlas/tree/main/packages/find-an-expert)
