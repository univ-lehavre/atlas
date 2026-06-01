import type { Preview } from "@storybook/svelte-vite";

// Pulled from the package's own dependencies — same version as every
// consumer app, no CDN drift. Bump `bootstrap` in
// `ui/atlas-ui/package.json` and every surface (Storybook + amarre +
// future apps) inherits.
import "../src/lib/client";

// Opt-in theming tokens + helper. Importing `theme.css` only sets the
// default custom properties (= the historical hardcoded values), so the
// "Default" theme renders exactly as before. The toolbar lets reviewers
// flip to an alternative palette to eyeball the theming surface.
import "../src/theme/theme.css";
import { applyTheme, type AtlasUiTheme } from "../src/theme/index";

const ATLAS_UI_THEMES: Record<string, Partial<AtlasUiTheme>> = {
  default: {},
  forest: {
    colorPrimary: "#1b4332",
    colorPrimaryHover: "#2d6a4f",
    colorOverlay: "rgba(27, 67, 50, 0.55)",
    fontHeading: "Georgia, serif",
  },
};

// Re-applies the toolbar-selected theme by (re)writing a single scoped
// `<style>` rule in the preview head. Replacing the whole rule means
// switching back to "default" leaves no residual override — no per-key
// DOM mutation, so it stays a single side-effecting statement.
const THEME_STYLE_ID = "atlas-ui-theme-vars";
function applyToolbarTheme(name: string | undefined): void {
  if (typeof document === "undefined") return;
  const overrides = applyTheme(ATLAS_UI_THEMES[name ?? "default"] ?? {});
  const existing = document.querySelector<HTMLStyleElement>(
    `style#${THEME_STYLE_ID}`,
  );
  const styleEl = existing ?? document.createElement("style");
  styleEl.id = THEME_STYLE_ID;
  styleEl.textContent = overrides ? `:root { ${overrides} }` : "";
  if (!existing) document.head.append(styleEl);
}

// Bootstrap modals (`.modal.fade`) start with `display: none` — they
// rely on Bootstrap JS to add `.show` when the user clicks a
// `data-bs-toggle="modal"` trigger. The preview iframe doesn't load
// the Bootstrap JS bundle (it's UMD and trips Vite pre-bundle), so
// modals stay invisible by default. We expose the toggle through a
// per-story parameter `atlasUi.forceModalsOpen`. Standalone Signup /
// CreateRequest stories opt-in (their whole story IS the modal
// content) ; the composite HomePage stays in its production state
// with modals closed.
if (typeof document !== "undefined") {
  const css = document.createElement("style");
  css.dataset.atlasUi = "force-modals-open";
  css.textContent = `
    .atlas-sb-force-modals .modal.fade {
      display: block !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: auto !important;
    }
    .atlas-sb-force-modals .modal.fade .modal-dialog {
      transform: none !important;
      margin: 1rem auto;
    }
  `;
  if (
    !document.head.querySelector('style[data-atlas-ui="force-modals-open"]')
  ) {
    document.head.append(css);
  }
}

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "white",
      values: [
        { name: "white", value: "#ffffff" },
        { name: "dark", value: "#111111" },
      ],
    },
  },
  globalTypes: {
    atlasUiTheme: {
      description: "atlas-ui opt-in theme tokens",
      defaultValue: "default",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "default", title: "Default" },
          { value: "forest", title: "Forest" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      if (typeof document !== "undefined") {
        const params = context.parameters as {
          atlasUi?: { forceModalsOpen?: boolean };
        };
        const force = params.atlasUi?.forceModalsOpen === true;
        document.documentElement.classList.toggle(
          "atlas-sb-force-modals",
          force,
        );

        // Apply the toolbar-selected theme. "default" writes an empty
        // rule, so the values declared in `theme.css` win (zero override).
        const globals = context.globals as { atlasUiTheme?: string };
        applyToolbarTheme(globals.atlasUiTheme);
      }
      return Story();
    },
  ],
};

export default preview;
