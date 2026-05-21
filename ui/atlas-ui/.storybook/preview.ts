import type { Preview } from "@storybook/svelte-vite";

// Pulled from the package's own dependencies — same version as every
// consumer app, no CDN drift. Bump `bootstrap` in
// `ui/atlas-ui/package.json` and every surface (Storybook + amarre +
// future apps) inherits.
import "../src/lib/client";

// Bootstrap modals (`.modal.fade`) start with `display: none` — they
// rely on Bootstrap JS to add `.show` when the user clicks a
// `data-bs-toggle="modal"` trigger. Storybook's preview iframe doesn't
// load Bootstrap JS (the UMD bundle trips Vite pre-bundle), so the
// modals stay invisible : you'd see an empty story for Signup,
// CreateRequest, etc. Override the styles so every modal renders
// inline in the story canvas — Storybook is for visual review, not
// for testing the actual open/close transition.
const forceModalsOpen = (): void => {
  if (typeof document === "undefined") return;
  const style = document.createElement("style");
  style.dataset["atlasUi"] = "force-modals-open";
  style.textContent = `
    .modal.fade {
      display: block !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: auto !important;
    }
    .modal.fade .modal-dialog {
      transform: none !important;
      margin: 1rem auto;
    }
  `;
  if (
    !document.head.querySelector('style[data-atlas-ui="force-modals-open"]')
  ) {
    document.head.appendChild(style);
  }
};
forceModalsOpen();

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
