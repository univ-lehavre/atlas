<script lang="ts">
  import { enhance } from '$app/forms';
  import PlotChart from '$lib/components/PlotChart.svelte';
  import {
    usersOptions,
    projectsOptions,
    actionsOptions,
    actionCategoriesOptions,
    type SerializedPoint,
  } from '$lib/charts.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();

  const cachedAt = $derived(
    data.cachedAt !== null ? new Date(data.cachedAt).toLocaleString('fr-FR') : null
  );

  // PageData.rolling comes as SerializedPoint[] after JSON serialization
  const rolling = $derived(data.rolling as unknown as SerializedPoint[]);

  let refreshing = $state(false);
</script>

<main>
  <header>
    <div class="header-row">
      <div>
        <h1>REDCap Dashboard</h1>
        <p class="subtitle">
          Fenêtre glissante 30 jours — {new Date().toLocaleDateString('fr-FR')}
          {#if cachedAt !== null}
            <span class="cache-info">· données du {cachedAt}</span>
          {/if}
        </p>
      </div>
      <form
        method="POST"
        action="?/refresh"
        use:enhance={() => {
          refreshing = true;
          return async ({ update }) => {
            await update();
            refreshing = false;
          };
        }}
      >
        <button type="submit" class="btn-refresh" disabled={refreshing}>
          {refreshing ? 'Chargement…' : 'Actualiser depuis REDCap'}
        </button>
      </form>
    </div>
  </header>

  <div class="grid">
    <PlotChart title="G1 — Utilisateurs actifs" options={usersOptions(rolling)} />
    <PlotChart title="G2 — Projets actifs" options={projectsOptions(rolling)} />
    <PlotChart title="G3 — Actions totales" options={actionsOptions(rolling)} />
    <PlotChart title="G4 — Actions par catégorie" options={actionCategoriesOptions(rolling)} />
  </div>
</main>

<style>
  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, sans-serif;
  }

  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
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

  .btn-refresh {
    padding: 0.5rem 1rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-refresh:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .btn-refresh:not(:disabled):hover {
    background: #1d4ed8;
  }

  .grid {
    display: grid;
    gap: 1.5rem;
  }
</style>
