import type { Preview } from "@storybook/svelte-vite";

// Pulled from the package's own dependencies — same version as every
// consumer app, no CDN drift. Bump `bootstrap` in
// `ui/atlas-ui/package.json` and every surface (Storybook + amarre +
// future apps) inherits.
import "../src/lib/client";

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
};

export default preview;
