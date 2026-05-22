<script lang="ts">
  import { onMount } from 'svelte';

  // Bootstrap CSS + icons live in the shared design-system package
  // (single source of truth for the version).
  import '@univ-lehavre/atlas-ui/client';

  let { children } = $props();

  // Bootstrap JS loaded browser-only via dynamic import : its UMD
  // bundle references `window`, which would crash node during SSR.
  onMount(async () => {
    const bs = await import('bootstrap/dist/js/bootstrap.bundle.min.js');
    (window as Window & { bootstrap?: unknown }).bootstrap = bs.default ?? bs;
  });
</script>

{@render children?.()}
