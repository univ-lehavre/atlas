<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import PlotChart from '$lib/components/PlotChart.svelte';
  import {
    loggedUsersOptions,
    projectsOptions,
    actionsOptions,
    actionCategoriesOptions,
    type SerializedPoint,
    type YScaleMode,
  } from '$lib/charts.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();

  const cachedAt = $derived(
    data.cachedAt !== null ? new Date(data.cachedAt).toLocaleString('fr-FR') : null
  );
  const monthly = $derived(data.monthly as unknown as SerializedPoint[]);

  type Period = '6m' | '12m' | 'all';
  let selectedPeriod = $state<Period>('6m');
  let yScaleMode = $state<YScaleMode>('linear');

  const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
  const subtractMonths = (date: Date, months: number): Date =>
    new Date(date.getFullYear(), date.getMonth() - months, 1);

  const filteredMonthly = $derived.by(() => {
    if (selectedPeriod === 'all' || monthly.length === 0) return monthly;
    const last = new Date(monthly.at(-1)!.date);
    const anchor = startOfMonth(last);
    const months = selectedPeriod === '6m' ? 6 : 12;
    const from = subtractMonths(anchor, months - 1).getTime();
    const to = anchor.getTime();
    return monthly.filter((point) => {
      const ts = startOfMonth(new Date(point.date)).getTime();
      return ts >= from && ts <= to;
    });
  });

  let fetching = $state(false);
  let progress = $state(0);
  let progressTotal = $state(0);
  let statusMessage = $state('');

  const pct = $derived(progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0);

  const collectFromApi = () => {
    fetching = true;
    progress = 0;
    progressTotal = 0;
    statusMessage = 'Connexion…';

    const source = new EventSource('/api/logs');

    source.onmessage = async (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as {
        type: string;
        total?: number;
        done?: number;
        cachedAt?: number;
      };

      if (msg.type === 'start') {
        progressTotal = msg.total ?? 0;
        statusMessage = 'Collecte en cours…';
      } else if (msg.type === 'progress') {
        progress = msg.done ?? 0;
        statusMessage = `${String(progress)} / ${String(progressTotal)} projets`;
      } else if (msg.type === 'cached') {
        statusMessage = 'Données récentes disponibles';
        source.close();
        fetching = false;
      } else if (msg.type === 'done') {
        statusMessage = 'Mise à jour des graphiques…';
        source.close();
        await invalidateAll();
        fetching = false;
      } else if (msg.type === 'error') {
        statusMessage = 'Erreur lors de la collecte';
        source.close();
        fetching = false;
      }
    };

    source.onerror = () => {
      statusMessage = 'Connexion perdue';
      source.close();
      fetching = false;
    };
  };
</script>

<main>
  <header>
    <div class="header-row">
      <div>
        <h1>REDCap Dashboard</h1>
        <p class="subtitle">
          Statistiques mensuelles (calendrier) — {new Date().toLocaleDateString('fr-FR')}
          {#if cachedAt !== null}
            <span class="cache-info">· données du {cachedAt}</span>
          {/if}
        </p>
        <a class="link-refresh-page" href="/actualisation">Page d’actualisation des statistiques</a>
      </div>
      <div class="controls">
        <label class="period-label" for="period-select">Période</label>
        <select id="period-select" class="period-select" bind:value={selectedPeriod}>
          <option value="6m">6 derniers mois</option>
          <option value="12m">Dernière année</option>
          <option value="all">Tout l’historique</option>
        </select>
        <label class="period-label" for="y-scale-select">Échelle Y</label>
        <select id="y-scale-select" class="period-select" bind:value={yScaleMode}>
          <option value="linear">Linéaire</option>
          <option value="log">Logarithmique</option>
        </select>
        <button class="btn-refresh" onclick={collectFromApi} disabled={fetching}>
          {fetching ? 'Collecte…' : 'Actualiser depuis REDCap'}
        </button>
      </div>
    </div>

    {#if fetching}
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width: {pct}%"></div>
      </div>
      <p class="progress-label">{statusMessage}{progressTotal > 0 ? ` — ${String(pct)} %` : ''}</p>
    {/if}
  </header>

  {#if filteredMonthly.length > 0}
    <div class="grid">
      <PlotChart
        title="G1 — Utilisateurs loggés"
        options={loggedUsersOptions(filteredMonthly, yScaleMode)}
      />
      <PlotChart
        title="G2 — Projets actifs"
        options={projectsOptions(filteredMonthly, yScaleMode)}
      />
      <PlotChart
        title="G3 — Actions totales"
        options={actionsOptions(filteredMonthly, yScaleMode)}
      />
      <PlotChart
        title="G4 — Actions par catégorie"
        options={actionCategoriesOptions(filteredMonthly, yScaleMode)}
      />
    </div>
  {:else}
    <p class="empty">Aucune donnée — cliquez sur « Actualiser depuis REDCap ».</p>
  {/if}
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
    margin-bottom: 1rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .period-label {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .period-select {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 0.45rem 0.55rem;
    font-size: 0.85rem;
    background: #fff;
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

  .link-refresh-page {
    display: inline-block;
    margin-top: 0.45rem;
    font-size: 0.85rem;
    color: #2563eb;
    text-decoration: none;
  }

  .link-refresh-page:hover {
    text-decoration: underline;
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
    flex-shrink: 0;
  }

  .btn-refresh:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .btn-refresh:not(:disabled):hover {
    background: #1d4ed8;
  }

  .progress-bar-wrap {
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.4rem;
  }

  .progress-bar {
    height: 100%;
    background: #2563eb;
    border-radius: 3px;
    transition: width 0.2s ease;
  }

  .progress-label {
    font-size: 0.8rem;
    color: #6b7280;
    margin: 0 0 1.5rem;
  }

  .grid {
    display: grid;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .empty {
    color: #9ca3af;
    font-size: 0.9rem;
    margin-top: 2rem;
    text-align: center;
  }

  @media (max-width: 780px) {
    .header-row {
      flex-direction: column;
      align-items: stretch;
    }

    .controls {
      justify-content: flex-start;
    }
  }
</style>
