<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import Request from './Request.svelte';

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
    <SectionTile title={!showHeading ? 'Compléter' : ''} />
    {#each requests as request (request.record_id)}
      <Request {request} />
    {/each}
  </HorizontalScroller>
</div>
