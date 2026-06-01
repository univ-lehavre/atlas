<script lang="ts">
  import HorizontalScroller from "./HorizontalScroller.svelte";
  import SectionTile from "./SectionTile.svelte";
  import CardItem from "./CardItem.svelte";
  import CreateRequest from "./CreateRequest.svelte";
  import type { RequestRecordList } from "./types/request";
  import { allowedRequestCreation } from "./utils/request";

  interface Props {
    userId: string | undefined;
    requests: RequestRecordList;
    /** Forwarded to the nested CreateRequest modal (env-scoped per app). */
    rgpdUrl: string;
    /** Forwarded to the nested CreateRequest modal (consumer-app name). */
    platformName: string;
    /** Background variant — alternation is decided by the parent page so
     *  light/dark sections stay alternated even when conditional
     *  sections (Complete, Follow) are missing. */
    variant?: "light" | "dark";
  }
  let {
    userId,
    requests,
    rgpdUrl,
    platformName,
    variant = "light",
  }: Props = $props();
  let allowingNewRequests = $derived(allowedRequestCreation(requests));
  let showHeading = $state(false);
</script>

<CreateRequest {rgpdUrl} {platformName} />

<div id="collaborate">
  <HorizontalScroller
    ariaLabel="Collaborate cards"
    headingText="Collaborate"
    bind:showHeading
    {variant}
  >
    <SectionTile title={showHeading ? "" : "Déposer"} />
    <div class="flex-shrink-0">
      <CardItem>
        {#snippet title()}
          Une demande
        {/snippet}
        {#snippet description()}
          {userId
            ? ""
            : "Je dois m'authentifier avant de déposer ou suivre une demande."}
        {/snippet}
        {#snippet actions()}
          <button
            type="button"
            class="list-group-item list-group-item-action {userId
              ? 'disabled'
              : 'active'}"
            data-bs-toggle="modal"
            data-bs-target="#SignUp"
          >
            <div class="d-flex flex-row {userId ? '' : 'fs-5'}">
              <i class="bi bi-box-arrow-in-right me-2"></i>
              <div
                class="list-group list-group-flush fw-{userId
                  ? 'light'
                  : 'bold mb-1'}"
                style="font-family: var(--atlas-ui-font-heading, Gambetta);"
              >
                S'authentifier
              </div>
            </div>
          </button>
          <button
            type="button"
            class="list-group-item list-group-item-action {userId &&
            allowingNewRequests
              ? 'active'
              : 'disabled'}"
            data-bs-toggle="modal"
            data-bs-target="#CreateRequest"
          >
            <div
              class="d-flex flex-row {userId && allowingNewRequests
                ? 'fs-5'
                : ''}"
            >
              <i class="bi bi-clipboard2-plus me-2"></i>
              <div
                class="list-group list-group-flush fw-{userId &&
                allowingNewRequests
                  ? 'bold mb-1'
                  : 'light'}"
                style="font-family: var(--atlas-ui-font-heading, Gambetta);"
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
