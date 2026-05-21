<script lang="ts">
  // Pulls Bootstrap (CSS + icons + JS) in via the shared design-system
  // package. Replaces the CDN links previously in `src/app.html` —
  // versions now live in `ui/atlas-ui/package.json`.
  import '@univ-lehavre/atlas-ui/client';

  let { children } = $props();
</script>

{@render children?.()}
