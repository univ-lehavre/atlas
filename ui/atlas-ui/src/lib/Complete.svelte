<script lang="ts">
  import HorizontalScroller from "./HorizontalScroller.svelte";
  import SectionTile from "./SectionTile.svelte";
  import Request from "./Request.svelte";

  let { requests } = $props();
  let showHeading = $state(false);
</script>

<div id="complete">
  <HorizontalScroller
    ariaLabel="Complete cards"
    headingText="Compléter"
    bind:showHeading
    variant="dark"
  >
    <SectionTile title={!showHeading ? "Compléter" : ""} />
    {#each requests as request (request.record_id)}
      <Request {request} />
    {/each}
  </HorizontalScroller>
</div>
