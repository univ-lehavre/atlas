// atlas-ui theming — OPT-IN public surface.
//
// The shared components read their colours / fonts / spacings through
// `var(--atlas-ui-*, <fallback>)`. Without any of the helpers below the
// fallbacks (= the historical hardcoded values) win, so the default
// rendering is unchanged. To customise, a consumer either:
//
//   1. imports `@univ-lehavre/atlas-ui/theme.css` and overrides the
//      variables in their own `:root` ; or
//   2. wraps a subtree in `<ThemeProvider theme={...}>` ; or
//   3. spreads `applyTheme(theme)` onto a `style` attribute themselves.
//
// All three paths are additive: nothing here runs unless the consumer
// opts in.

/**
 * The themeable tokens of atlas-ui. Every key maps to one
 * `--atlas-ui-<kebab-key>` CSS custom property. A theme is always a
 * `Partial`: a consumer overrides only the tokens they care about and the
 * rest fall back to the package defaults declared in `theme.css`.
 */
export interface AtlasUiTheme {
  /** Brand colour — dark surfaces, discover tiles, carousels. */
  colorPrimary: string;
  /** Hover/active variant of the brand colour. */
  colorPrimaryHover: string;
  /** Foreground colour used on top of `colorPrimary`. */
  colorOnPrimary: string;
  /** Neutral surface colour (navbar, footer, card backgrounds). */
  colorSurface: string;
  /** Translucent overlay/backdrop colour (modals). */
  colorOverlay: string;
  /** Heading font-family. */
  fontHeading: string;
  /** Corner radius for tiles, cards and dialogs. */
  radius: string;
  /** Default width of a card/section tile. */
  cardWidth: string;
  /** Gap between cards in a horizontal scroller. */
  cardGap: string;
}

/**
 * Maps each CSS custom property to a getter that reads its value from a
 * theme. Kept as an explicit list (rather than derived) so the contract
 * is greppable and stays in sync with `theme.css`. Using a getter — not a
 * key — means there is no dynamic indexing into the caller's object.
 */
const CSS_VARS: readonly (readonly [
  string,
  (theme: Partial<AtlasUiTheme>) => string | undefined,
])[] = [
  ["--atlas-ui-color-primary", (t) => t.colorPrimary],
  ["--atlas-ui-color-primary-hover", (t) => t.colorPrimaryHover],
  ["--atlas-ui-color-on-primary", (t) => t.colorOnPrimary],
  ["--atlas-ui-color-surface", (t) => t.colorSurface],
  ["--atlas-ui-color-overlay", (t) => t.colorOverlay],
  ["--atlas-ui-font-heading", (t) => t.fontHeading],
  ["--atlas-ui-radius", (t) => t.radius],
  ["--atlas-ui-card-width", (t) => t.cardWidth],
  ["--atlas-ui-card-gap", (t) => t.cardGap],
];

/**
 * Turns a partial theme into an inline `style` string that sets the
 * matching CSS custom properties. Apply it to any wrapper element to scope
 * the overrides to its subtree:
 *
 * ```svelte
 * <div style={applyTheme({ colorPrimary: '#2d6a4f' })}>
 *   <CardItem ... />
 * </div>
 * ```
 *
 * Returns an empty string for an empty/undefined theme, so it's safe to
 * spread unconditionally.
 */
export function applyTheme(theme: Partial<AtlasUiTheme> = {}): string {
  return CSS_VARS.map(([cssVar, read]) => [cssVar, read(theme)] as const)
    .filter(([, value]) => value !== undefined)
    .map(([cssVar, value]) => `${cssVar}: ${value};`)
    .join(" ");
}

export { default as ThemeProvider } from "./ThemeProvider.svelte";
