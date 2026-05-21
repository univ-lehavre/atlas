// Single source of truth for the Bootstrap CSS layer across the atlas
// monorepo. Consumer apps (and the Storybook preview here) import this
// entrypoint so a `pnpm -F @univ-lehavre/atlas-ui up bootstrap`
// propagates to every UI surface — no CDN URLs to chase down.
//
// Usage from a consumer SvelteKit app :
//
//   // src/routes/+layout.svelte
//   <script lang="ts">
//     import '@univ-lehavre/atlas-ui/client';
//   </script>
//
// Bootstrap JS (modals, dropdowns, `data-bs-toggle` delegation) is *not*
// loaded here. The UMD bundle tripped Vite's pre-bundle when imported
// from this entry, and Storybook doesn't need the JS for visual review.
// Consumer apps that need interactive Bootstrap behaviours can pull the
// bundle in separately from their own `+layout.svelte` :
//
//   import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
