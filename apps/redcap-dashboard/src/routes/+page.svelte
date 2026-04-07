<script lang="ts">
  import PlotChart from '$lib/components/PlotChart.svelte';
  import {
    usersOptions,
    projectsOptions,
    actionsOptions,
    actionCategoriesOptions,
  } from '$lib/charts.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();

  const cachedAt = $derived(
    data.cachedAt !== null ? new Date(data.cachedAt).toLocaleString('fr-FR') : null
  );
</script>

<main>
  <header>
    <h1>REDCap Dashboard</h1>
    <p class="subtitle">
      Fenêtre glissante 30 jours — {new Date().toLocaleDateString('fr-FR')}
      {#if cachedAt !== null}
        <span class="cache-info">· données du {cachedAt}</span>
      {/if}
    </p>
  </header>

  <div class="grid">
    <PlotChart title="G1 — Utilisateurs actifs" options={usersOptions(data.rolling)} />
    <PlotChart title="G2 — Projets actifs" options={projectsOptions(data.rolling)} />
    <PlotChart title="G3 — Actions totales" options={actionsOptions(data.rolling)} />
    <PlotChart title="G4 — Actions par catégorie" options={actionCategoriesOptions(data.rolling)} />
  </div>
</main>

<style>
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, sans-serif;
  }

  header {
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }

  .subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }

  .cache-info {
    color: #9ca3af;
  }

  .grid {
    display: grid;
    gap: 1.5rem;
  }
</style>
