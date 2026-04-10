<script lang="ts">
  import { untrack } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types.js';
  import type { SseEvent } from '$lib/types.js';

  const { data }: { data: PageData } = $props();

  type HealthState = 'OK' | 'WARN' | 'ERROR';
  type SortKey = 'name' | 'version' | 'date';
  type SortDir = 'asc' | 'desc';

  const initialState: HealthState = untrack(() => (data.stale ? 'WARN' : 'OK'));
  const initialCachedAt: number | null = untrack(() => data.cachedAt);

  let fetching = $state(false);
  let fetchStep = $state(0);
  let fetchSteps = $state(0);
  let fetchLabel = $state('Prêt à actualiser');
  let currentState = $state<HealthState>(initialState);
  let lastUpdatedAt = $state<number | null>(initialCachedAt);
  let lastAttemptAt = $state<number | null>(null);
  let lastErrorAt = $state<number | null>(null);

  let sortKey = $state<SortKey>('name');
  let sortDir = $state<SortDir>('asc');

  const pct = $derived(fetchSteps > 0 ? Math.round((fetchStep / fetchSteps) * 100) : 0);

  const stateText = $derived(
    currentState === 'OK'
      ? 'Données à jour'
      : currentState === 'WARN'
        ? fetching
          ? 'Actualisation en cours'
          : 'Actualisation recommandée'
        : "Échec de l'actualisation"
  );

  const sortedPackages = $derived.by(() =>
    [...data.packages].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'version') return a.version.localeCompare(b.version) * dir;
      return a.date.localeCompare(b.date) * dir;
    })
  );

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  };

  const sortIndicator = (key: SortKey): string =>
    sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '↕';

  const formatDate = (value: number | null): string =>
    value === null ? '—' : new Date(value).toLocaleString('fr-FR');

  const formatIso = (iso: string): string =>
    iso === '' ? '—' : new Date(iso).toLocaleString('fr-FR');

  const fmtRelative = (iso: string): string => {
    if (iso === '') return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 30) return `il y a ${String(days)} j`;
    return `il y a ${String(Math.floor(days / 30))} mois`;
  };

  const collectFromApi = () => {
    fetching = true;
    fetchStep = 0;
    fetchSteps = 0;
    fetchLabel = 'Connexion…';
    currentState = 'WARN';
    lastAttemptAt = Date.now();

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
        lastUpdatedAt = msg.cachedAt;
        currentState = 'OK';
        source.close();
        await invalidateAll();
        fetching = false;
      } else if (msg.type === 'done') {
        fetchLabel = 'Actualisation terminée';
        lastUpdatedAt = msg.cachedAt;
        currentState = 'OK';
        source.close();
        await invalidateAll();
        fetching = false;
      } else if (msg.type === 'error') {
        fetchLabel = `Erreur : ${msg.message}`;
        lastErrorAt = Date.now();
        currentState = 'ERROR';
        source.close();
        fetching = false;
      }
    };

    source.onerror = () => {
      fetchLabel = 'Connexion perdue';
      lastErrorAt = Date.now();
      currentState = 'ERROR';
      source.close();
      fetching = false;
    };
  };
</script>

<main>
  <header class="header">
    <a class="link-back" href="/">← Retour au dashboard</a>
    <h1>Actualisation</h1>
    <p class="subtitle">État du cache et liste des paquets npm publiés</p>
  </header>

  <section class="status-card">
    <div class="status-row">
      <span class="badge" data-state={currentState}>{currentState}</span>
      <span class="state-label">{stateText}</span>
      {#if fetching}
        <span class="spinner" aria-label="Actualisation en cours"></span>
      {/if}
    </div>
    <p class="status-message">{fetchLabel}</p>

    <div class="dates-grid">
      <div class="date-item">
        <p class="label">Dernière mise à jour</p>
        <p class="value">{formatDate(lastUpdatedAt)}</p>
      </div>
      <div class="date-item">
        <p class="label">Dernière tentative</p>
        <p class="value">{formatDate(lastAttemptAt)}</p>
      </div>
      <div class="date-item">
        <p class="label">Dernière erreur</p>
        <p class="value">{formatDate(lastErrorAt)}</p>
      </div>
      <div class="date-item">
        <p class="label">Chargement de la page</p>
        <p class="value">{formatDate(data.loadedAt)}</p>
      </div>
    </div>

    {#if fetching}
      <div class="progress-wrap">
        <div
          class="progress-bar"
          class:indeterminate={fetchSteps === 0}
          style="width: {fetchSteps > 0 ? pct : 100}%"
        ></div>
      </div>
      <p class="progress-label">{fetchSteps > 0 ? `${String(pct)} %` : fetchLabel}</p>
    {/if}

    <button class="btn-refresh" onclick={collectFromApi} disabled={fetching}>
      {fetching ? 'Actualisation…' : 'Lancer une actualisation'}
    </button>
  </section>

  <section class="table-card">
    <h2>Paquets npm ({data.packages.length})</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <button class="sort-btn" type="button" onclick={() => onSort('name')}>
                Paquet <span class="sort-ind">{sortIndicator('name')}</span>
              </button>
            </th>
            <th>
              <button class="sort-btn" type="button" onclick={() => onSort('version')}>
                Version <span class="sort-ind">{sortIndicator('version')}</span>
              </button>
            </th>
            <th>
              <button class="sort-btn" type="button" onclick={() => onSort('date')}>
                Dernière publication <span class="sort-ind">{sortIndicator('date')}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#if sortedPackages.length === 0}
            <tr>
              <td colspan="3" class="empty-cell"
                >Aucun paquet — cliquez sur « Lancer une actualisation ».</td
              >
            </tr>
          {:else}
            {#each sortedPackages as pkg (pkg.name)}
              <tr>
                <td class="col-name">{pkg.name}</td>
                <td class="col-version">{pkg.version}</td>
                <td class="col-date" title={formatIso(pkg.date)}>{fmtRelative(pkg.date)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</main>

<style>
  main {
    max-width: 920px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, sans-serif;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .link-back {
    color: #2563eb;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .link-back:hover {
    text-decoration: underline;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0.75rem 0 0.25rem;
  }

  h2 {
    font-size: 1.1rem;
    margin: 0 0 0.75rem;
  }

  .subtitle {
    color: #6b7280;
    margin: 0;
  }

  .status-card,
  .table-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
  }

  .table-card {
    margin-top: 1rem;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 64px;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
  }

  .badge[data-state='OK'] {
    background: #15803d;
  }
  .badge[data-state='WARN'] {
    background: #b45309;
  }
  .badge[data-state='ERROR'] {
    background: #b91c1c;
  }

  .state-label {
    font-weight: 500;
    color: #111827;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #d1d5db;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .status-message {
    margin: 0.6rem 0 1rem;
    color: #4b5563;
    font-size: 0.9rem;
  }

  .dates-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    margin-bottom: 1rem;
  }

  .date-item {
    border: 1px solid #f3f4f6;
    border-radius: 8px;
    padding: 0.75rem;
    background: #f9fafb;
  }

  .label {
    margin: 0 0 0.25rem;
    font-size: 0.78rem;
    color: #6b7280;
  }

  .value {
    margin: 0;
    font-size: 0.9rem;
    color: #111827;
  }

  .progress-wrap {
    height: 6px;
    background: #e5e7eb;
    border-radius: 999px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .progress-bar {
    height: 100%;
    background: #2563eb;
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
    margin: 0.45rem 0 0.9rem;
    font-size: 0.8rem;
    color: #6b7280;
  }

  .btn-refresh {
    border: none;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .btn-refresh:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .btn-refresh:not(:disabled):hover {
    background: #1d4ed8;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
    padding: 0.6rem 0.75rem;
    vertical-align: middle;
    font-size: 0.875rem;
  }

  .sort-btn {
    border: none;
    background: transparent;
    font: inherit;
    font-weight: 600;
    font-size: 0.78rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .sort-ind {
    font-size: 0.75rem;
  }

  .col-name {
    font-family: monospace;
    font-size: 0.82rem;
    color: #111827;
  }

  .col-version {
    color: #6b7280;
    white-space: nowrap;
  }

  .col-date {
    color: #6b7280;
    white-space: nowrap;
  }

  .empty-cell {
    color: #6b7280;
    text-align: center;
  }
</style>
