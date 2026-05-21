<script lang="ts">
  // Bootstrap CSS + icons live in the shared design-system package
  // (single source of truth for the version). The JS bundle has to be
  // pulled in separately because the UMD form trips Vite's pre-bundle
  // when re-exported through atlas-ui — see `ui/atlas-ui/src/lib/client.ts`.
  import '@univ-lehavre/atlas-ui/client';
  import 'bootstrap/dist/js/bootstrap.bundle.min.js';

  let { children } = $props();
</script>

{@render children?.()}
