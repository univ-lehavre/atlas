<script lang="ts">
  // Composite that mirrors `apps/amarre/src/routes/+page.svelte` for
  // Storybook visual review. Lives in the design-system package so
  // reviewers can see the full home in one frame ; amarre still
  // composes the bits itself in its own +page.svelte (with the real
  // `data` from a load function + SvelteKit-scoped URLs).
  //
  // The composite stays free of proper names — every brand string
  // (logos, alt text, platform name, partner list) comes in via props.

  import Collaborate from "./Collaborate.svelte";
  import Complete from "./Complete.svelte";
  import Administrate from "./Administrate.svelte";
  import MainTitle from "./MainTitle.svelte";
  import TopNavbar from "./TopNavbar.svelte";
  import Follow from "./Follow.svelte";
  import Footer from "./Footer.svelte";
  import type { RequestRecordList } from "./types/request";

  interface Logo {
    src: string;
    alt: string;
  }
  interface Props {
    userId: string | undefined;
    email: string | null | undefined;
    requests: RequestRecordList;
    rgpdUrl: string;
    downloadUrl: string;
    /** Brand logo for the MainTitle (asset URL + alt text + home URL). */
    logoSrc: string;
    logoAlt: string;
    homeUrl: string;
    /** Platform name surfaced in the CreateRequest RGPD sentence. */
    platformName: string;
    /** Partner / funder logos in the Footer. */
    footerLogos: Logo[];
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
    logoSrc,
    logoAlt,
    homeUrl,
    platformName,
    footerLogos,
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

  // Background alternation is computed from the actually-visible
  // sections, so light/dark stay correct when Complete or Follow is
  // hidden (otherwise we'd get two adjacent sections of the same
  // colour).
  const variantOf = $derived.by(() => {
    const visible: string[] = ["collaborate"];
    if (hasIncompleteRequests) visible.push("complete");
    if (hasRequestsInProgress) visible.push("follow");
    visible.push("administrate");
    return (name: string): "light" | "dark" =>
      visible.indexOf(name) % 2 === 0 ? "light" : "dark";
  });
</script>

<MainTitle {logoSrc} {logoAlt} {homeUrl} />

<TopNavbar {hasIncompleteRequests} {hasRequestsInProgress} />

<div
  data-bs-spy="scroll"
  data-bs-target="#navbar1"
  data-bs-root-margin="0px 0px -50%"
  data-bs-smooth-scroll="true"
>
  <Collaborate
    {userId}
    {requests}
    {rgpdUrl}
    {platformName}
    variant={variantOf("collaborate")}
  />
  {#if hasIncompleteRequests}
    <Complete requests={incompleteRequests} variant={variantOf("complete")} />
  {/if}
  {#if hasRequestsInProgress}
    <Follow requests={requestsInProgress} variant={variantOf("follow")} />
  {/if}
  <Administrate
    {userId}
    {email}
    {form}
    {downloadUrl}
    variant={variantOf("administrate")}
  />
</div>

<Footer logos={footerLogos} />

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
