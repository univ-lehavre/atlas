<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types.js';

  type HealthState = 'OK' | 'WARN' | 'ERROR';
  type SortKey = 'projectId' | 'lastUpdatedAt' | 'status';
  type SortDirection = 'asc' | 'desc';

  const { data }: { data: PageData } = $props();

  const formatDate = (value: number | null): string =>
    value === null ? 'Non disponible' : new Date(value).toLocaleString('fr-FR');
  const statusRank: Record<HealthState, number> = { OK: 0, WARN: 1, ERROR: 2 };
  const statusText = (status: HealthState): string =>
    status === 'OK' ? 'À jour' : status === 'WARN' ? 'À surveiller' : 'À corriger';

  let fetching = $state(false);
  let progress = $state(0);
  let progressTotal = $state(0);
  let statusMessage = $state('Prêt à actualiser');
  let currentState = $state<HealthState>('WARN');
  let lastUpdatedAt = $state<number | null>(null);
  let lastAttemptAt = $state<number | null>(null);
  let lastErrorAt = $state<number | null>(null);
  let initialized = $state(false);
  let sortKey = $state<SortKey>('projectId');
  let sortDirection = $state<SortDirection>('asc');

  const pct = $derived(progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0);

  const stateText = $derived.by(() => {
    if (currentState === 'OK') return 'Service opérationnel';
    if (currentState === 'WARN')
      return fetching ? 'Actualisation en cours' : 'Actualisation requise';
    return 'Échec de l’actualisation';
  });
  const sortedProjects = $derived.by(() =>
    [...data.projects].sort((a, b) => {
      if (sortKey === 'projectId') {
        return sortDirection === 'asc' ? a.projectId - b.projectId : b.projectId - a.projectId;
      }
      if (sortKey === 'lastUpdatedAt') {
        const left = a.lastUpdatedAt ?? -1;
        const right = b.lastUpdatedAt ?? -1;
        return sortDirection === 'asc' ? left - right : right - left;
      }
      const left = statusRank[a.status];
      const right = statusRank[b.status];
      return sortDirection === 'asc' ? left - right : right - left;
    })
  );

  const onSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    sortKey = nextKey;
    sortDirection = 'asc';
  };

  $effect(() => {
    if (initialized) return;
    lastUpdatedAt = data.cachedAt;
    currentState = data.cachedAt === null || data.stale ? 'WARN' : 'OK';
    initialized = true;
  });

  const collectFromApi = () => {
    fetching = true;
    progress = 0;
    progressTotal = 0;
    lastAttemptAt = Date.now();
    statusMessage = 'Connexion…';
    currentState = 'WARN';

    const source = new EventSource('/api/logs?force=1');

    source.onmessage = async (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as {
        type: string;
        total?: number;
        done?: number;
        cachedAt?: number | null;
      };

      if (msg.type === 'start') {
        progressTotal = msg.total ?? 0;
        statusMessage = 'Collecte en cours…';
      } else if (msg.type === 'progress') {
        progress = msg.done ?? 0;
        statusMessage = `${String(progress)} / ${String(progressTotal)} projets`;
      } else if (msg.type === 'cached') {
        statusMessage = 'Données déjà à jour';
        lastUpdatedAt = msg.cachedAt ?? lastUpdatedAt;
        currentState = 'OK';
        source.close();
        await invalidateAll();
        fetching = false;
      } else if (msg.type === 'done') {
        statusMessage = 'Actualisation terminée';
        lastUpdatedAt = msg.cachedAt ?? Date.now();
        currentState = 'OK';
        source.close();
        await invalidateAll();
        fetching = false;
      } else if (msg.type === 'error') {
        statusMessage = 'Erreur lors de la collecte';
        lastErrorAt = Date.now();
        currentState = 'ERROR';
        source.close();
        fetching = false;
      }
    };

    source.onerror = () => {
      statusMessage = 'Connexion perdue';
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
    <h1>Actualisation des statistiques</h1>
    <p class="subtitle">Pilotage de la collecte REDCap et état de fraîcheur des données</p>
  </header>

  <section class="status-card">
    <div class="status-row">
      <span class="badge" data-state={currentState}>{currentState}</span>
      <span class="state-label">{stateText}</span>
      {#if fetching}
        <span class="spinner" aria-label="Actualisation en cours"></span>
      {/if}
    </div>
    <p class="status-message">{statusMessage}</p>

    <div class="dates-grid">
      <div class="date-item">
        <p class="label">Dernière mise à jour des données</p>
        <p class="value">{formatDate(lastUpdatedAt)}</p>
      </div>
      <div class="date-item">
        <p class="label">Dernière tentative d’actualisation</p>
        <p class="value">{formatDate(lastAttemptAt)}</p>
      </div>
      <div class="date-item">
        <p class="label">Dernière erreur</p>
        <p class="value">{formatDate(lastErrorAt)}</p>
      </div>
      <div class="date-item">
        <p class="label">Dernier chargement de la page</p>
        <p class="value">{formatDate(data.loadedAt)}</p>
      </div>
    </div>

    {#if fetching}
      <div class="progress-wrap">
        <div class="progress-bar" style="width: {pct}%"></div>
      </div>
      <p class="progress-label">{progressTotal > 0 ? `${String(pct)} %` : 'Préparation…'}</p>
    {/if}

    <button class="btn-refresh" onclick={collectFromApi} disabled={fetching}>
      {fetching ? 'Actualisation…' : 'Lancer une actualisation'}
    </button>
  </section>

  <section class="table-card">
    <h2>État par projet</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <button class="sort-btn" type="button" onclick={() => onSort('projectId')}>
                Projet
                <span class="sort-indicator"
                  >{sortKey === 'projectId' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span
                >
              </button>
            </th>
            <th>
              <button class="sort-btn" type="button" onclick={() => onSort('lastUpdatedAt')}>
                Dernière mise à jour
                <span class="sort-indicator"
                  >{sortKey === 'lastUpdatedAt' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span
                >
              </button>
            </th>
            <th>
              <button class="sort-btn" type="button" onclick={() => onSort('status')}>
                Statut
                <span class="sort-indicator"
                  >{sortKey === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</span
                >
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#if sortedProjects.length === 0}
            <tr>
              <td colspan="3" class="empty-cell">Aucun projet trouvé dans redcap-token.csv.</td>
            </tr>
          {:else}
            {#each sortedProjects as project (project.projectId)}
              <tr>
                <td>{project.projectId}</td>
                <td>{formatDate(project.lastUpdatedAt)}</td>
                <td>
                  <span class="badge" data-state={project.status}>{project.status}</span>
                  <span class="status-inline">{statusText(project.status)}</span>
                </td>
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

  .subtitle {
    color: #6b7280;
    margin: 0;
  }

  .status-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    background: #fff;
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
    from {
      transform: rotate(0deg);
    }

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
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

  .table-card {
    margin-top: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #fff;
    padding: 1rem;
  }

  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 560px;
  }

  th,
  td {
    text-align: left;
    border-bottom: 1px solid #f3f4f6;
    padding: 0.6rem 0.5rem;
    vertical-align: middle;
  }

  .sort-btn {
    border: none;
    background: transparent;
    font: inherit;
    font-weight: 600;
    color: #111827;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .sort-indicator {
    color: #6b7280;
    font-size: 0.8rem;
  }

  .status-inline {
    margin-left: 0.45rem;
    font-size: 0.82rem;
    color: #6b7280;
  }

  .empty-cell {
    color: #6b7280;
    text-align: center;
  }
</style>
