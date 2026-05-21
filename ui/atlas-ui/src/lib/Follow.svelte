<script lang="ts">
  import HorizontalScroller from "./HorizontalScroller.svelte";
  import SectionTile from "./SectionTile.svelte";
  import Request from "./Request.svelte";

  let { requests } = $props();
  let showHeading = $state(false);
</script>

<div id="follow">
  <HorizontalScroller
    ariaLabel="Follow cards"
    headingText="Suivre"
    bind:showHeading
    variant="light"
  >
    <SectionTile title={!showHeading ? "Suivre" : ""} />
    {#each requests as request (request.record_id)}
      <Request {request} />
    {/each}
  </HorizontalScroller>
</div>
