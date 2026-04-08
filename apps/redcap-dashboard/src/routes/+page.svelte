<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import PlotChart from '$lib/components/PlotChart.svelte';
  import {
    loggedUsersOptions,
    projectsOptions,
    actionCategoriesOptions,
    type SerializedPoint,
  } from '$lib/charts.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();

  const cachedAt = $derived(
    data.cachedAt !== null ? new Date(data.cachedAt).toLocaleString('fr-FR') : null
  );

  type Granularity = 'day' | 'week' | 'month' | 'quarter';
  type Period = '6m' | '12m' | 'all';

  let selectedGranularity = $state<Granularity>('month');
  let selectedPeriod = $state<Period>('6m');

  let points = $state<SerializedPoint[]>([]);

  $effect(() => {
    const g = selectedGranularity;
    // Depend on cachedAt so the effect re-runs after invalidateAll()
    void data.cachedAt;
    fetch(`/api/stats?granularity=${g}`)
      .then((r) => r.json())
      .then((body: { points?: SerializedPoint[] }) => {
        if (body.points) points = body.points;
      })
      .catch(() => {
        /* keep current points on error */
      });
  });

  const startOf = (date: Date, g: Granularity): Date => {
    if (g === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (g === 'week') {
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
    }
    if (g === 'quarter') {
      const q = Math.floor(date.getMonth() / 3);
      return new Date(date.getFullYear(), q * 3, 1);
    }
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const subtractPeriod = (anchor: Date, period: Period, g: Granularity): Date => {
    if (period === 'all') return new Date(0);
    const months = period === '6m' ? 6 : 12;
    return startOf(new Date(anchor.getFullYear(), anchor.getMonth() - (months - 1), 1), g);
  };

  const filteredPoints = $derived.by(() => {
    if (selectedPeriod === 'all' || points.length === 0) return points;
    const last = new Date(points.at(-1)!.date);
    const anchor = startOf(last, selectedGranularity);
    const from = subtractPeriod(anchor, selectedPeriod, selectedGranularity).getTime();
    return points.filter((p) => startOf(new Date(p.date), selectedGranularity).getTime() >= from);
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
          Statistiques — {new Date().toLocaleDateString('fr-FR')}
          {#if cachedAt !== null}
            <span class="cache-info">· données du {cachedAt}</span>
          {/if}
        </p>
        <a class="link-refresh-page" href="/actualisation">Page d'actualisation des statistiques</a>
      </div>
      <div class="controls">
        <label class="period-label" for="granularity-select">Agrégation</label>
        <select id="granularity-select" class="period-select" bind:value={selectedGranularity}>
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
          <option value="quarter">Trimestre</option>
        </select>
        <label class="period-label" for="period-select">Période</label>
        <select id="period-select" class="period-select" bind:value={selectedPeriod}>
          <option value="6m">6 derniers mois</option>
          <option value="12m">Dernière année</option>
          <option value="all">Tout l'historique</option>
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

  {#if filteredPoints.length > 0}
    <div class="grid">
      <PlotChart
        title="Nombre d'utilisateurs actifs"
        options={loggedUsersOptions(filteredPoints)}
      />
      <PlotChart title="Nombre de projets actifs" options={projectsOptions(filteredPoints)} />
      <PlotChart title="Nombre d'évènements" options={actionCategoriesOptions(filteredPoints)} />
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
