<script lang="ts">
  import type { PageProps } from './$types';

  import Collaborate from '$lib/ui/Collaborate.svelte';
  import Introduce from '$lib/ui/Introduce.svelte';
  import Explore from '$lib/ui/Explore.svelte';
  import Administrate from '$lib/ui/Administrate.svelte';
  import Ask from '$lib/ui/Ask.svelte';
  import Publish from '$lib/ui/Publish.svelte';
  import Options from '$lib/ui/Options.svelte';
  import ECRIN from '$lib/ui/ECRIN.svelte';
  import TopNavbar from '$lib/ui/TopNavbar.svelte';
  import Rule from '$lib/ui/Rule.svelte';

  let { data }: PageProps = $props();

  const userId = $derived(data.user?.id);
  const hasPushedAccount = $derived(
    (data.pushed as { hasPushedAccount?: boolean } | null)?.hasPushedAccount
  );
  const url = $derived(data.url);
  const email = $derived(data.user?.email);

  console.log('Page data:', data);

  let containerClass = $state<'container' | 'container-fluid' | 'container-fluid w-75'>(
    'container'
  );
  const handleContainerChange = (mode: 'default' | 'w-75' | 'fluid') => {
    containerClass =
      mode === 'fluid' ? 'container-fluid' : mode === 'w-75' ? 'container-fluid w-75' : 'container';
  };
</script>

<ECRIN />

<TopNavbar user={data.user} />

<div class={containerClass}>
  <div
    data-bs-spy="scroll"
    data-bs-target="#navbar1"
    data-bs-root-margin="0px 0px -50%"
    data-bs-smooth-scroll="true"
  >
    <Introduce />
    <Rule />
    <Collaborate {userId} {url} />
    <Rule />
    <Explore {userId} />
    <Rule />
    <Ask />
    <Rule />
    <Publish />
    <Rule />
    <Administrate {userId} {email} {url} {hasPushedAccount} />
    {#if data.user?.labels?.includes('admin')}
      <Rule />
      <Options onChange={handleContainerChange} />
    {/if}
  </div>
</div>

<style>
  :global(#introduce, #explore, #ask, #collaborate, #publish, #administrate) {
    /* Empêche la navbar sticky de masquer le haut des sections ciblées */
    scroll-margin-top: var(--nav-offset);
  }
</style>
