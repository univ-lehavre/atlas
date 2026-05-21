// Single source of truth for Bootstrap version across the atlas
// monorepo. Consumer apps (and the Storybook preview here) import this
// entrypoint so a `pnpm -F @univ-lehavre/atlas-ui up bootstrap` propagates
// to every UI surface — no CDN URLs to chase down.
//
// Usage from a consumer SvelteKit app :
//
//   // src/routes/+layout.svelte
//   <script lang="ts">
//     import '@univ-lehavre/atlas-ui/client';
//   </script>

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Bootstrap JS is loaded eagerly so global delegated behaviours
// (`data-bs-toggle`, modal open/close, etc.) work without each
// consumer wiring them up.
import "bootstrap/dist/js/bootstrap.bundle.min.js";
