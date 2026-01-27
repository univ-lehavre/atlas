<script lang="ts">
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  import CreateRequest from './CreateRequest.svelte';
  import type { SurveyRequestList } from '$lib/types/api/surveys';
  import { allowed_request_creation } from '$lib/validators/surveys';

  interface Props {
    userId: string | undefined;
    requests: SurveyRequestList;
  }
  let { userId, requests }: Props = $props();
  let allowingNewRequests = $derived(allowed_request_creation(requests));
  let showHeading = $state(false);
</script>

<CreateRequest />

<div id="collaborate">
  <HorizontalScroller
    ariaLabel="Collaborate cards"
    headingText="Collaborate"
    bind:showHeading
    variant="light"
  >
    <SectionTile title={!showHeading ? 'Déposer' : ''} />
    <div class="flex-shrink-0">
      <CardItem>
        {#snippet title()}
          Une demande
        {/snippet}
        {#snippet description()}
          {userId ? '' : "Je dois m'authentifier avant de déposer ou suivre une demande."}
        {/snippet}
        {#snippet actions()}
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
                S'authentifier
              </div>
            </div>
          </button>
          <button
            type="button"
            class="list-group-item list-group-item-action {userId && allowingNewRequests
              ? 'active'
              : 'disabled'}"
            data-bs-toggle="modal"
            data-bs-target="#CreateRequest"
          >
            <div class="d-flex flex-row {userId && allowingNewRequests ? 'fs-5' : ''}">
              <i class="bi bi-clipboard2-plus me-2"></i>
              <div
                class="list-group list-group-flush fw-{userId && allowingNewRequests
                  ? 'bold mb-1'
                  : 'light'}"
                style="font-family: Gambetta;"
              >
                Créer une nouvelle
              </div>
            </div>
          </button>
        {/snippet}</CardItem
      >
    </div>
  </HorizontalScroller>
</div>
