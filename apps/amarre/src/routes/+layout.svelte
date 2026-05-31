<script lang="ts">
  import { onMount } from 'svelte';

  // Bootstrap CSS + icons live in the shared design-system package
  // (single source of truth for the version).
  import '@univ-lehavre/atlas-ui/client';

  let { children } = $props();

  // Bootstrap JS is loaded browser-only via dynamic import : its UMD
  // bundle references `window`, which would crash node during SSR.
  // Vite's ESM wrapper around the UMD output captures the exports
  // instead of attaching to `window.bootstrap`, so we re-expose them
  // ourselves — restores the contract the UMD had pre-Vite, and lets
  // the end-to-end smoke (cf. amarre-sandbox/tests/e2e/smoke.spec.ts)
  // detect when Bootstrap's `data-bs-*` delegation is wired up.
  onMount(async () => {
    const bs = await import('bootstrap/dist/js/bootstrap.bundle.min.js');
    (globalThis as unknown as Window & { bootstrap?: unknown }).bootstrap = bs.default ?? bs;
  });
</script>

{@render children?.()}
