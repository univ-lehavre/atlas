<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import KpiCard from '$lib/components/KpiCard.svelte';
  import Sparkline from '$lib/components/Sparkline.svelte';
  import type { PageData } from './$types.js';
  import type { DashboardStats, Period, SseEvent } from '$lib/types.js';

  const { data }: { data: PageData } = $props();

  type PeriodOption = { value: Period; label: string };
  const PERIOD_OPTIONS: PeriodOption[] = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'quarter', label: 'Trimestre' },
  ];

  let selectedPeriod = $state<Period>('week');
  let stats = $state<DashboardStats | null>(null);

  $effect(() => {
    const period = selectedPeriod;
    void data.cachedAt;
    fetch(`/api/stats?period=${period}`)
      .then((r) => r.json())
      .then((body: DashboardStats | { error: string }) => {
        if ('error' in body) {
          stats = null;
          return;
        }
        stats = body as DashboardStats;
      })
      .catch(() => {
        /* keep stale stats */
      });
  });

  let fetching = $state(false);
  let fetchLabel = $state('');
  let fetchStep = $state(0);
  let fetchSteps = $state(0);

  const pct = $derived(fetchSteps > 0 ? Math.round((fetchStep / fetchSteps) * 100) : 0);

  const collectFromApi = () => {
    fetching = true;
    fetchLabel = 'Connexion…';
    fetchStep = 0;
    fetchSteps = 0;

    const source = new EventSource('/api/refresh');

    source.onmessage = async (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as SseEvent;
      if (msg.type === 'start') {
        fetchLabel = 'Démarrage…';
      } else if (msg.type === 'progress') {
        fetchLabel = msg.label;
        fetchStep = msg.step;
        fetchSteps = msg.steps;
      } else if (msg.type === 'cached') {
        fetchLabel = 'Données déjà à jour';
        source.close();
        fetching = false;
      } else if (msg.type === 'done') {
        fetchLabel = 'Actualisation terminée';
        source.close();
        await invalidateAll();
        fetching = false;
      } else if (msg.type === 'error') {
        fetchLabel = `Erreur : ${msg.message}`;
        source.close();
        fetching = false;
      }
    };

    source.onerror = () => {
      fetchLabel = 'Connexion perdue';
      source.close();
      fetching = false;
    };
  };

  const cachedAt = $derived(
    data.cachedAt !== null ? new Date(data.cachedAt).toLocaleString('fr-FR') : null
  );

  const fmtRelative = (isoDate: string): string => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 30) return `il y a ${String(days)} j`;
    const months = Math.floor(days / 30);
    return `il y a ${String(months)} mois`;
  };

  const fmtNumber = (n: number): string =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)} M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)} k`
        : String(n);
</script>

<main>
  <header>
    <div class="header-row">
      <div>
        <h1>Atlas Dashboard</h1>
        <p class="subtitle">
          Statistiques du dépôt et des paquets npm — {new Date().toLocaleDateString('fr-FR')}
          {#if cachedAt !== null}
            <span class="cache-info">· données du {cachedAt}</span>
          {/if}
        </p>
      </div>
      <div class="controls">
        <label class="period-label" for="period-select">Période</label>
        <select id="period-select" class="period-select" bind:value={selectedPeriod}>
          {#each PERIOD_OPTIONS as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <button class="btn-refresh" onclick={collectFromApi} disabled={fetching}>
          {fetching ? 'Collecte…' : 'Actualiser'}
        </button>
      </div>
    </div>

    {#if fetching}
      <div class="progress-bar-wrap">
        <div
          class="progress-bar"
          style="width: {fetchSteps > 0 ? pct : 100}%"
          class:indeterminate={fetchSteps === 0}
        ></div>
      </div>
      <p class="progress-label">
        {fetchLabel}{fetchSteps > 0 ? ` — ${String(pct)} %` : ''}
      </p>
    {/if}
  </header>

  {#if stats !== null}
    <section class="kpi-grid">
      <KpiCard label="Releases" value={stats.kpi.releases} />
      <KpiCard
        label="Paquets"
        value={stats.kpi.packagesTotal}
        sub="{stats.kpi.packagesActive} actif{stats.kpi.packagesActive > 1
          ? 's'
          : ''} sur la période"
      />
      <KpiCard label="Téléchargements" value={fmtNumber(stats.kpi.downloadsTotal)} />
    </section>

    <section class="table-card">
      <table>
        <thead>
          <tr>
            <th class="col-name">Paquet</th>
            <th class="col-version">Version</th>
            <th class="col-date">Dernière publication</th>
            <th class="col-spark">Tendance</th>
            <th class="col-dl">Téléchargements</th>
          </tr>
        </thead>
        <tbody>
          {#each stats.packages as pkg (pkg.name)}
            <tr>
              <td class="col-name">
                <span class="pkg-name">{pkg.name.replace('@univ-lehavre/', '')}</span>
              </td>
              <td class="col-version">{pkg.version}</td>
              <td class="col-date">{fmtRelative(pkg.lastPublishedAt)}</td>
              <td class="col-spark">
                {#if pkg.dailyDownloads.length > 0}
                  <Sparkline data={pkg.dailyDownloads} />
                {:else}
                  <span class="no-data">—</span>
                {/if}
              </td>
              <td class="col-dl">{fmtNumber(pkg.totalDownloads)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {:else}
    <p class="empty">Aucune donnée — cliquez sur « Actualiser ».</p>
  {/if}
</main>

<style>
  main {
    max-width: 1100px;
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

  .progress-bar.indeterminate {
    animation: slide 1.5s infinite;
    width: 40% !important;
  }

  @keyframes slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(300%);
    }
  }

  .progress-label {
    font-size: 0.8rem;
    color: #6b7280;
    margin: 0 0 1.5rem;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .table-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead th {
    background: #f9fafb;
    padding: 0.65rem 1rem;
    text-align: left;
    font-size: 0.78rem;
    font-weight: 600;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
  }

  tbody tr {
    border-bottom: 1px solid #f3f4f6;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr:hover {
    background: #f9fafb;
  }

  tbody td {
    padding: 0.6rem 1rem;
    vertical-align: middle;
  }

  .pkg-name {
    font-family: monospace;
    font-size: 0.82rem;
    color: #111827;
  }

  .col-version {
    color: #6b7280;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .col-date {
    color: #6b7280;
    white-space: nowrap;
  }

  .col-spark {
    width: 140px;
  }

  .col-dl {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #374151;
    white-space: nowrap;
  }

  .no-data {
    color: #d1d5db;
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

    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .col-spark {
      display: none;
    }
  }
</style>
