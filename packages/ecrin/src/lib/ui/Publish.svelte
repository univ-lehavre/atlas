<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  let showHeading = $state(false);
</script>

<div id="publish">
  <HorizontalScroller ariaLabel="Publish cards" headingText="Publish" bind:showHeading>
    <SectionTile title={!showHeading ? 'Publish' : ''} />
    <div class="flex-shrink-0">
      <CardItem
        title="My data"
        description="I publish my research data to share it with the community."
      ></CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem
        title="My news"
        description="I write a blog post to share my research insights with the community."
      ></CardItem>
    </div>
  </HorizontalScroller>
</div>
