<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  let { userId, url } = $props();
  let showHeading = $state(false);
</script>

<div id="collaborate">
  <HorizontalScroller ariaLabel="Collaborate cards" headingText="Collaborate" bind:showHeading>
    <SectionTile title={!showHeading ? 'Collaborate' : ''} />
    <div class="flex-shrink-0">
      <CardItem
        title="Create my project"
        description="I declare my project to find collaborators within the community."
      >
        {#snippet footer()}
          <div class="list-group list-group-flush">
            <button
              type="button"
              class="list-group-item list-group-item-action {userId ? 'disabled' : 'active'}"
              data-bs-toggle="modal"
              data-bs-target="#SignUp"
            >
              <div class="d-flex flex-row {userId ? '' : 'fs-5'}">
                <i class="bi bi-box-arrow-in-right me-2"></i>
                <div
                  class="list-group list-group-flush fw-{userId ? 'light' : 'bold mb-1'}"
                  style="font-family: Gambetta;"
                >
                  Sign up
                </div>
              </div>
              {#if !userId}
                <p class="fw-light" style="font-family: Gambetta;">
                  In order to collaborate, you should first connect to an account.
                </p>
              {/if}
            </button>
            <form method="post" action="?/subscribe">
              <button
                type="submit"
                class="list-group-item list-group-item-action {userId && !url
                  ? 'active'
                  : 'disabled'}"
              >
                <div class="d-flex flex-row {userId && !url ? 'fs-5' : ''}">
                  <i class="bi bi-link-45deg me-2"></i>
                  <div
                    class="list-group list-group-flush fw-{userId && !url ? 'bold mb-1' : 'light'}"
                    style="font-family: Gambetta;"
                  >
                    Get a survey link
                  </div>
                </div>
                {#if userId && !url}
                  <p class="fw-light" style="font-family: Gambetta;">
                    Receive a unique link to share the survey with potential collaborators.
                  </p>
                {/if}
              </button>
            </form>
            <a
              href={url}
              class="list-group-item list-group-item-action {url ? 'active' : 'disabled'}"
            >
              <div class="d-flex flex-row {url ? 'fs-5' : ''}">
                <i class="bi bi-clipboard2-data me-2"></i>
                <div
                  class="list-group list-group-flush fw-{url ? 'bold mb-1' : 'light'}"
                  style="font-family: Gambetta;"
                >
                  Take the survey
                </div>
              </div>
              {#if url}
                <p class="fw-light" style="font-family: Gambetta;">
                  Complete the survey to declare your project.
                </p>
              {/if}
            </a>
          </div>
        {/snippet}</CardItem
      >
    </div>

    <div class="flex-shrink-0">
      <CardItem
        title="Build my team"
        description="I find collaborators for my project by sharing my needs with our community."
      />
    </div>

    <div class="flex-shrink-0">
      <CardItem
        title="Find my expert"
        description="I connect with experts in various fields to enhance my project's success."
      />
    </div>
    <div class="flex-shrink-0">
      <CardItem
        title="Fund my project"
        description="I seek funding opportunities to support my research project."
      />
    </div>
  </HorizontalScroller>
</div>
