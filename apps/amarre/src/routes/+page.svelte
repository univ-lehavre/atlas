<script lang="ts">
  import type { PageProps } from './$types';
  import type { SurveyRequestItem } from '$lib/types/api/surveys';
  import { resolve } from '$app/paths';
  import { PUBLIC_RGPD_NOTICE_URL } from '$env/static/public';

  import Collaborate from '@univ-lehavre/atlas-ui/Collaborate.svelte';
  import Complete from '@univ-lehavre/atlas-ui/Complete.svelte';
  import Administrate from '@univ-lehavre/atlas-ui/Administrate.svelte';
  import MainTitle from '@univ-lehavre/atlas-ui/MainTitle.svelte';
  import TopNavbar from '@univ-lehavre/atlas-ui/TopNavbar.svelte';
  import Follow from '@univ-lehavre/atlas-ui/Follow.svelte';
  import Footer from '@univ-lehavre/atlas-ui/Footer.svelte';

  let { data, form }: PageProps = $props();

  // Brand identity is amarre's responsibility — atlas-ui components
  // are name-agnostic and consume these as props.
  const PLATFORM_NAME = 'AMARRE';
  const FOOTER_LOGOS = [
    { src: '/logos/ulhn.svg', alt: 'Université Le Havre Normandie' },
    { src: '/logos/eunicoast.png', alt: 'EUNICoast' },
    { src: '/logos/france-2030.png', alt: 'France 2030' },
    { src: '/logos/region-normandie.png', alt: 'Région Normandie' },
  ];

  // SvelteKit-scoped URLs are resolved in the consumer app (here) and
  // passed as plain string props to the design-system components, so the
  // components stay portable across apps.
  const downloadUrl = resolve('/api/v1/surveys/download');
  const homeUrl = resolve('/');

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

  // Light/dark alternation is decided here so it stays correct when
  // Complete or Follow are conditionally hidden.
  const variantOf = $derived.by(() => {
    const visible: string[] = ['collaborate'];
    if (hasIncompleteRequests) visible.push('complete');
    if (hasRequestsInProgress) visible.push('follow');
    visible.push('administrate');
    return (name: string): 'light' | 'dark' => (visible.indexOf(name) % 2 === 0 ? 'light' : 'dark');
  });
</script>

<MainTitle logoSrc="/logos/amarre.png" logoAlt={PLATFORM_NAME} {homeUrl} />

<TopNavbar {hasIncompleteRequests} {hasRequestsInProgress} />

<div
  data-bs-spy="scroll"
  data-bs-target="#navbar1"
  data-bs-root-margin="0px 0px -50%"
  data-bs-smooth-scroll="true"
>
  <Collaborate
    {userId}
    requests={data.requests}
    rgpdUrl={PUBLIC_RGPD_NOTICE_URL}
    platformName={PLATFORM_NAME}
    variant={variantOf('collaborate')}
  />
  {#if hasIncompleteRequests}
    <Complete requests={incompleteRequests} variant={variantOf('complete')} />
  {/if}
  {#if hasRequestsInProgress}
    <Follow requests={requestsInProgress} variant={variantOf('follow')} />
  {/if}
  <Administrate {userId} {email} {form} {downloadUrl} variant={variantOf('administrate')} />
</div>

<Footer logos={FOOTER_LOGOS} />

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
