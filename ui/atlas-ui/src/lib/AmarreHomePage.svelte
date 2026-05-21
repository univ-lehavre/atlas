<script lang="ts">
  // Composite that mirrors `apps/amarre/src/routes/+page.svelte` for
  // Storybook visual review. Lives in the design-system package so
  // reviewers can see the full home in one frame ; amarre still
  // composes the bits itself in its own +page.svelte (with the real
  // `data` from a load function + SvelteKit-scoped URLs).

  import Collaborate from "./Collaborate.svelte";
  import Complete from "./Complete.svelte";
  import Administrate from "./Administrate.svelte";
  import ECRIN from "./MainTitle.svelte";
  import TopNavbar from "./TopNavbar.svelte";
  import Follow from "./Follow.svelte";
  import Footer from "./Footer.svelte";
  import type { RequestRecordList } from "./types/request";

  interface Props {
    userId: string | undefined;
    email: string | null | undefined;
    requests: RequestRecordList;
    rgpdUrl: string;
    downloadUrl: string;
    /** Stand-in for the SvelteKit `form` action result (only consumed
     *  by `Signup` inside `Administrate`). */
    form?: unknown;
  }
  let {
    userId,
    email,
    requests,
    rgpdUrl,
    downloadUrl,
    form = null,
  }: Props = $props();

  const incompleteRequests = $derived(
    requests.filter((r) => r.validation_finale_complete !== "2"),
  );
  const requestsInProgress = $derived(
    requests.filter((r) => r.validation_finale_complete === "2"),
  );
  const hasIncompleteRequests = $derived(incompleteRequests.length > 0);
  const hasRequestsInProgress = $derived(requestsInProgress.length > 0);
</script>

<ECRIN />

<TopNavbar {hasIncompleteRequests} {hasRequestsInProgress} />

<div
  data-bs-spy="scroll"
  data-bs-target="#navbar1"
  data-bs-root-margin="0px 0px -50%"
  data-bs-smooth-scroll="true"
>
  <Collaborate {userId} {requests} {rgpdUrl} />
  {#if hasIncompleteRequests}
    <Complete requests={incompleteRequests} />
  {/if}
  {#if hasRequestsInProgress}
    <Follow requests={requestsInProgress} />
  {/if}
  <Administrate {userId} {email} {form} {downloadUrl} />
</div>

<Footer />

<style>
  :global(
    #introduce,
    #explore,
    #ask,
    #collaborate,
    #complete,
    #follow,
    #retrieve,
    #publish,
    #administrate
  ) {
    scroll-margin-top: var(--nav-offset);
  }
</style>
