<script lang="ts">
  import Graph from '$lib/ui/Graph.svelte';
  import GraphSelector from '$lib/ui/GraphSelector.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let selectedUser = $state(data.userId);
  let viewableSelector = $state(true);
  const promise = async (record: string | undefined) => {
    if (!record) return;
    const response = await fetch(`/api/v1/graphs?record=${record}`);
    const result = await response.json();
    return result.data;
  };
  const promise2 = async (record: string | undefined) => {
    if (!record) return;
    const response = await fetch(`/api/v1/graphs/global`);
    const result = await response.json();
    return result.data;
  };
</script>

<div class="d-flex justify-content-center">
  {#if viewableSelector}
    {#await promise(selectedUser)}
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    {:then number}
      <Graph network={number.graph} />
    {:catch error}
      <p style="color: red">{error.message}</p>
    {/await}
  {:else}
    {#await promise2(selectedUser)}
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    {:then number}
      <Graph network={number.graph} />
    {:catch error}
      <p style="color: red">{error.message}</p>
    {/await}
  {/if}
</div>

<div class="d-flex justify-content-center fixed-top mt-2">
  <GraphSelector users={data.users} bind:selectedUser bind:viewableSelector />
</div>
