<script lang="ts">
  import HorizontalScroller from "./HorizontalScroller.svelte";
  import SectionTile from "./SectionTile.svelte";

  let showHeading = $state(false);
</script>

<div id="retrieve">
  <HorizontalScroller
    ariaLabel="Retrieve cards"
    headingText="Retrouver"
    bind:showHeading
  >
    <SectionTile title={!showHeading ? "Retrouver" : ""} />
  </HorizontalScroller>
</div>
