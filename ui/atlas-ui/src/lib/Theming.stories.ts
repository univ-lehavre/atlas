import type { Meta, StoryObj } from "@storybook/svelte-vite";
import ThemingDemo from "../theme/ThemingDemo.svelte";

// Demonstrates the OPT-IN theming surface. The "Default" story passes no
// theme, so the components render exactly as in production (the CSS-var
// fallbacks = the historical hardcoded values). "Forest" supplies a
// partial theme through `ThemeProvider`, showing how a handful of token
// overrides recolour every consuming component without touching their
// APIs. The global "Theme" toolbar (see `.storybook/preview.ts`) offers
// the same toggle across every story.
const meta = {
  title: "amarre/Theming",
  component: ThemingDemo,
  parameters: {
    docs: {
      description: {
        component:
          "Opt-in theming via `--atlas-ui-*` CSS custom properties. Wrap a subtree in `<ThemeProvider theme={...}>` (or call `applyTheme()`) to override colours, fonts, radius and card sizing. Omitted tokens fall back to the package defaults, so an empty theme is a no-op.",
      },
    },
  },
} satisfies Meta<typeof ThemingDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No theme supplied — proves the default rendering is unchanged. */
export const Default: Story = { args: { theme: {} } };

/** A partial alternative palette + heading font. */
export const Forest: Story = {
  args: {
    theme: {
      colorPrimary: "#1b4332",
      colorPrimaryHover: "#2d6a4f",
      colorOnPrimary: "#ffffff",
      fontHeading: "Georgia, serif",
      radius: "1.25rem",
    },
  },
};
