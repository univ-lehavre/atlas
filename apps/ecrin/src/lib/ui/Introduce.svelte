<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  let showHeading = $state(false);
</script>

<div id="introduce">
  <HorizontalScroller ariaLabel="Introduce cards" headingText="Introduce" bind:showHeading>
    <SectionTile title={!showHeading ? 'Introduce' : ''} />

    <div class="flex-shrink-0">
      <CardItem
        title="My scientific question"
        description="I describe my scientific question to get feedback from the community."
      ></CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem
        title="My references"
        description="I use the tools to reference my recent scientific publications in one place."
      ></CardItem>
    </div>
  </HorizontalScroller>
</div>
