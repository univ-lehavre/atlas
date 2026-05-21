<script lang="ts">
  // Pulls Bootstrap CSS/icons/JS in via the package's own client entry.
  import "$lib/client";

  let { children } = $props();
</script>

{@render children?.()}
