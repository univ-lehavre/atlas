<script lang="ts">
  import type { PageProps } from './$types';
  import type { SurveyRequestItem } from '$lib/types/api/surveys';

  import Collaborate from '$lib/ui/Collaborate.svelte';
  import Complete from '$lib/ui/Complete.svelte';
  import Administrate from '$lib/ui/Administrate.svelte';
  import ECRIN from '$lib/ui/MainTitle.svelte';
  import TopNavbar from '$lib/ui/TopNavbar.svelte';
  import Follow from '$lib/ui/Follow.svelte';
  import Footer from '$lib/ui/Footer.svelte';

  let { data, form }: PageProps = $props();

  const userId = $derived(data.user?.id);
  const email = $derived(data.user?.email);

  // Demandes avec formulaire non finalisé (form_complete != '2')
  let incompleteRequests = $derived(
    data.requests?.filter((r: SurveyRequestItem) => r.validation_finale_complete !== '2') ?? []
  );

  // Demandes en cours de validation (form_complete == '2' ET validation_finale_complete != '2')
  let requestsInProgress = $derived(
    data.requests?.filter((r: SurveyRequestItem) => r.validation_finale_complete === '2') ?? []
  );

  let hasIncompleteRequests = $derived(incompleteRequests.length > 0);
  let hasRequestsInProgress = $derived(requestsInProgress.length > 0);
</script>

<ECRIN />

<TopNavbar {hasIncompleteRequests} {hasRequestsInProgress} />

<div
  data-bs-spy="scroll"
  data-bs-target="#navbar1"
  data-bs-root-margin="0px 0px -50%"
  data-bs-smooth-scroll="true"
>
  <Collaborate {userId} requests={data.requests} />
  {#if hasIncompleteRequests}
    <Complete requests={incompleteRequests} />
  {/if}
  {#if hasRequestsInProgress}
    <Follow requests={requestsInProgress} />
  {/if}
  <Administrate {userId} {email} {form} />
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
    /* Empêche la navbar sticky de masquer le haut des sections ciblées */
    scroll-margin-top: var(--nav-offset);
  }
</style>
