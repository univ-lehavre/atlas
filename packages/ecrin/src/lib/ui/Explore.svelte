<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  let { userId } = $props();
  let showHeading = $state(false);
</script>

<div id="explore">
  <HorizontalScroller ariaLabel="Explore cards" headingText="Explore" bind:showHeading>
    <SectionTile title={!showHeading ? 'Explore' : ''} />

    <div class="flex-shrink-0">
      <CardItem
        title="My graph"
        description="I visualize my scientific question and project in a graph."
      >
        {#snippet footer()}
          <div class="list-group list-group-flush">
            <a
              class="list-group-item list-group-item-action {userId ? 'active' : 'disabled'}"
              href="/global"
            >
              <div class="d-flex flex-row">
                <i class="bi bi-search me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  My projects graph
                </div>
              </div>
            </a>
          </div>
        {/snippet}
      </CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem
        title="Community graph"
        description="Visualize connections within our community to discover interesting research projects."
      >
        {#snippet footer()}
          <div class="list-group list-group-flush">
            <a class="list-group-item list-group-item-action disabled" href="/global">
              <div class="d-flex flex-row">
                <i class="bi bi-search me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  Someone else graph
                </div>
              </div>
            </a>
            <a class="list-group-item list-group-item-action disabled" href="/global">
              <div class="d-flex flex-row">
                <i class="bi bi-search me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  The whole community graph
                </div>
              </div>
            </a>
            <button type="button" class="list-group-item list-group-item-action disabled">
              <div class="d-flex flex-row">
                <i class="bi bi-search me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  View authors and projects
                </div>
              </div>
            </button>
            <button type="button" class="list-group-item list-group-item-action disabled">
              <div class="d-flex flex-row">
                <i class="bi bi-search me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  Your references
                </div>
              </div>
            </button>
          </div>
        {/snippet}
      </CardItem>
    </div>
  </HorizontalScroller>
</div>
