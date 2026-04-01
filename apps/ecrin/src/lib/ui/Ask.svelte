<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  let showHeading = $state(false);
</script>

<div id="ask">
  <HorizontalScroller ariaLabel="Ask cards" headingText="Ask" bind:showHeading>
    <SectionTile title={!showHeading ? 'Ask' : ''} />
    <div class="flex-shrink-0">
      <CardItem title="Data" description="I am looking for data to support my research."></CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem title="An expert" description="I want to discuss with an expert.">
        {#snippet footer()}
          <div class="list-group list-group-flush">
            <button
              type="button"
              class="list-group-item list-group-item-action list-group-item-primary disabled"
            >
              <div class="d-flex align-items-center">
                <i class="bi bi-question-circle me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  Based on his location
                </div>
              </div>
            </button>
            <button
              type="button"
              class="list-group-item list-group-item-action list-group-item-primary disabled"
            >
              <div class="d-flex align-items-center">
                <i class="bi bi-question-circle me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  On a specific thematic
                </div>
              </div>
            </button>
            <button
              type="button"
              class="list-group-item list-group-item-action list-group-item-primary disabled"
            >
              <div class="d-flex align-items-center">
                <i class="bi bi-question-circle me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  Owning interesting data
                </div>
              </div></button
            >
          </div>
        {/snippet}
      </CardItem>
    </div>
  </HorizontalScroller>
</div>
