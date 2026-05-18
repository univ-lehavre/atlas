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
  type NotificationKind = 'info' | 'success' | 'warning' | 'error';
  type NotificationCode = 'COLLECT' | 'CACHE' | 'DONE' | 'ERROR' | 'NETWORK';

  interface Notification {
    readonly id: number;
    readonly kind: NotificationKind;
    readonly code: string;
    readonly icon: string;
    readonly message: string;
  }

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
  let notifications = $state<Notification[]>([]);
  let notificationId = 0;
  let progressNotified = false;

  const pct = $derived(progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0);

  const dismissNotification = (id: number) => {
    notifications = notifications.filter((notification) => notification.id !== id);
  };

  const notificationMeta: Record<
    NotificationCode,
    { kind: NotificationKind; icon: string; label: string }
  > = {
    COLLECT: { kind: 'info', icon: 'R', label: 'COLLECTE' },
    CACHE: { kind: 'success', icon: 'C', label: 'CACHE' },
    DONE: { kind: 'success', icon: 'V', label: 'TERMINE' },
    ERROR: { kind: 'error', icon: '!', label: 'ERREUR' },
    NETWORK: { kind: 'warning', icon: 'N', label: 'RESEAU' },
  };

  const pushNotification = (
    code: NotificationCode,
    message: string,
    options?: { sticky?: boolean; durationMs?: number }
  ) => {
    const id = ++notificationId;
    const sticky = options?.sticky ?? false;
    const durationMs = options?.durationMs ?? 5000;
    const meta = notificationMeta[code];
    notifications = [
      ...notifications,
      { id, kind: meta.kind, code: meta.label, icon: meta.icon, message },
    ].slice(-5);
    if (!sticky) {
      setTimeout(() => dismissNotification(id), durationMs);
    }
  };

  const collectFromApi = () => {
    fetching = true;
    progress = 0;
    progressTotal = 0;
    progressNotified = false;
    statusMessage = 'Connexion…';
    pushNotification('COLLECT', 'Connexion à REDCap en cours…');

    const source = new EventSource('/api/logs');

    source.onmessage = async (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as {
        type: string;
        total?: number;
        done?: number;
        cachedAt?: number;
        message?: string;
      };

      if (msg.type === 'start') {
        progressTotal = msg.total ?? 0;
        statusMessage = 'Collecte en cours…';
        pushNotification('COLLECT', `Collecte démarrée (${String(progressTotal)} projets).`);
      } else if (msg.type === 'progress') {
        progress = msg.done ?? 0;
        statusMessage = `${String(progress)} / ${String(progressTotal)} projets`;
        if (!progressNotified && progressTotal > 0) {
          progressNotified = true;
          pushNotification('COLLECT', 'Progression de la collecte en cours.');
        }
      } else if (msg.type === 'cached') {
        statusMessage = 'Données récentes disponibles';
        pushNotification('CACHE', 'Le cache est récent: aucune collecte nécessaire.');
        source.close();
        fetching = false;
      } else if (msg.type === 'done') {
        statusMessage = 'Mise à jour des graphiques…';
        source.close();
        await invalidateAll();
        pushNotification('DONE', 'Actualisation terminée, graphiques mis à jour.');
        fetching = false;
      } else if (msg.type === 'error') {
        statusMessage = 'Erreur lors de la collecte';
        pushNotification('ERROR', msg.message ?? 'Erreur pendant la collecte REDCap.', {
          durationMs: 7000,
        });
        source.close();
        fetching = false;
      }
    };

    source.onerror = () => {
      statusMessage = 'Connexion perdue';
      pushNotification('NETWORK', 'Connexion SSE perdue pendant la collecte.', {
        durationMs: 7000,
      });
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

  <div class="notice-stack" aria-live="polite">
    {#each notifications as notification (notification.id)}
      <article class="notice" data-kind={notification.kind}>
        <div class="notice-main">
          <div class="notice-meta">
            <span class="notice-icon">{notification.icon}</span>
            <span class="notice-code">{notification.code}</span>
          </div>
          <p>{notification.message}</p>
        </div>
        <button
          class="notice-close"
          type="button"
          aria-label="Fermer la notification"
          onclick={() => dismissNotification(notification.id)}
        >
          ×
        </button>
      </article>
    {/each}
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

  .notice-stack {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    display: grid;
    gap: 0.6rem;
    width: min(360px, calc(100vw - 2rem));
    z-index: 50;
  }

  .notice {
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
    padding: 0.65rem 0.75rem;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .notice-main {
    display: grid;
    gap: 0.35rem;
  }

  .notice-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .notice-icon {
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    border: 1px solid #d1d5db;
    color: #111827;
    background: #f9fafb;
  }

  .notice-code {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    border-radius: 999px;
    padding: 0.12rem 0.4rem;
    border: 1px solid #d1d5db;
    color: #374151;
    background: #f3f4f6;
  }

  .notice p {
    margin: 0;
    font-size: 0.85rem;
    color: #111827;
  }

  .notice[data-kind='info'] {
    border-left: 4px solid #2563eb;
  }

  .notice[data-kind='success'] {
    border-left: 4px solid #15803d;
  }

  .notice[data-kind='warning'] {
    border-left: 4px solid #b45309;
  }

  .notice[data-kind='error'] {
    border-left: 4px solid #b91c1c;
  }

  .notice[data-kind='success'] .notice-icon,
  .notice[data-kind='success'] .notice-code {
    border-color: #86efac;
    background: #dcfce7;
    color: #14532d;
  }

  .notice[data-kind='warning'] .notice-icon,
  .notice[data-kind='warning'] .notice-code {
    border-color: #fcd34d;
    background: #fef3c7;
    color: #78350f;
  }

  .notice[data-kind='error'] .notice-icon,
  .notice[data-kind='error'] .notice-code {
    border-color: #fca5a5;
    background: #fee2e2;
    color: #7f1d1d;
  }

  .notice-close {
    border: none;
    background: transparent;
    color: #6b7280;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
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
