<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { Icon, LoadingSpinner } from '$lib/ui';

  /**
   * HealthStatusCard - Card displaying system health status.
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/HealthStatusCard.
   *
   * @example
   * ```svelte
   * <HealthStatusCard content={healthContent} />
   * ```
   */
  interface RelativeTimeContent {
    justNow: string;
    secondsAgo: string;
    minutesAgo: string;
    hoursAgo: string;
    yesterday: string;
    daysAgo: string;
  }

  interface HealthStatusContent {
    title: string;
    refreshLabel: string;
    statusHealthy: string;
    statusDegraded: string;
    statusUnhealthy: string;
    serviceAppwrite: string;
    serviceInternet: string;
    checkedLabel: string;
    apiKeyLabel: string;
    validLabel: string;
    invalidLabel: string;
    notFoundLabel: string;
    missingLabel: string;
    tryAgainLabel: string;
    relativeTime: RelativeTimeContent;
  }

  interface Props {
    /** Content for the card (required) */
    content: HealthStatusContent;
  }

  let { content }: Props = $props();

  interface AttributeHealth {
    name: string;
    exists: boolean;
    type?: string;
  }

  interface CollectionHealth {
    id: string;
    name: string;
    exists: boolean;
    attributes?: AttributeHealth[];
    error?: string;
  }

  interface DatabaseHealth {
    id: string;
    name: string;
    exists: boolean;
    apiKeyValid?: boolean;
    collections?: CollectionHealth[];
    error?: string;
  }

  interface ServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTimeMs?: number;
    error?: string;
    database?: DatabaseHealth;
  }

  interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: ServiceHealth[];
  }

  /** Auto-refresh interval in milliseconds (1 minute) */
  const AUTO_REFRESH_INTERVAL_MS = 60000;

  /** How often to update the freshness indicator (every second) */
  const FRESHNESS_UPDATE_INTERVAL_MS = 1000;

  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let health = $state<HealthResponse | null>(null);
  let lastChecked = $state<Date | null>(null);

  /** Current time for freshness calculation (updated every second) */
  let currentTime = $state(Date.now());

  /** Interval IDs for cleanup */
  let autoRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
  let freshnessIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Calculates the freshness ratio (1 = just checked, 0 = stale/needs refresh).
   * Value decreases linearly from 1 to 0 over the auto-refresh interval.
   */
  const freshness = $derived.by(() => {
    if (!lastChecked) return 0;
    const elapsed = currentTime - lastChecked.getTime();
    const ratio = 1 - elapsed / AUTO_REFRESH_INTERVAL_MS;
    return Math.max(0, Math.min(1, ratio));
  });

  /**
   * Gets the appropriate color class based on freshness.
   * Uses secondary color for healthy status.
   */
  const getFreshnessColorClass = (baseStatus: 'healthy' | 'degraded' | 'unhealthy'): string => {
    // Only apply freshness fade for healthy status
    if (baseStatus !== 'healthy') {
      return statusConfig[baseStatus].color;
    }

    // Use secondary color for healthy status
    if (freshness > 0.66) {
      return 'text-secondary-600 dark:text-secondary-400';
    } else if (freshness > 0.33) {
      return 'text-secondary-500 dark:text-secondary-400';
    } else {
      return 'text-secondary-400 dark:text-secondary-500';
    }
  };

  /**
   * Gets the background color class for the overall status banner.
   */
  const getStatusBgClass = (status: 'healthy' | 'degraded' | 'unhealthy'): string => {
    if (status !== 'healthy') {
      if (status === 'degraded') return 'bg-warning-50 dark:bg-warning-900/20';
      return 'bg-error-50 dark:bg-error-900/20';
    }

    // Use secondary background for healthy status
    return 'bg-secondary-100 dark:bg-secondary-700/30';
  };

  const statusConfig = $derived<
    Record<'healthy' | 'degraded' | 'unhealthy', { icon: string; color: string; label: string }>
  >({
    healthy: {
      icon: 'lucide:check-circle',
      color: 'text-secondary-600 dark:text-secondary-400',
      label: content.statusHealthy,
    },
    degraded: {
      icon: 'lucide:alert-triangle',
      color: 'text-warning-600 dark:text-warning-400',
      label: content.statusDegraded,
    },
    unhealthy: {
      icon: 'lucide:x-circle',
      color: 'text-error-600 dark:text-error-400',
      label: content.statusUnhealthy,
    },
  });

  const serviceLabels = $derived<Record<string, string>>({
    appwrite: content.serviceAppwrite,
    internet: content.serviceInternet,
  });

  /** Track which services have their details expanded */
  const expandedServices = new SvelteSet<string>();

  /**
   * Toggles the expanded state of a service.
   */
  const toggleServiceExpanded = (serviceName: string): void => {
    if (expandedServices.has(serviceName)) {
      expandedServices.delete(serviceName);
    } else {
      expandedServices.add(serviceName);
    }
  };

  /**
   * Checks if a service has expandable details.
   */
  const hasExpandableDetails = (service: ServiceHealth): boolean => {
    return service.database !== undefined;
  };

  /**
   * Fetches health status from the API.
   */
  const fetchHealth = async (): Promise<void> => {
    isLoading = true;
    error = null;

    try {
      const response = await fetch('/api/v1/health');
      const data = await response.json();

      if (!response.ok && response.status !== 503) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      health = data;
      lastChecked = new Date();
      currentTime = Date.now();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch health status';
      health = null;
    } finally {
      isLoading = false;
    }
  };

  /**
   * Formats response time for display.
   */
  const formatResponseTime = (ms: number | undefined): string => {
    if (ms === undefined) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * Formats the time since last check.
   */
  const formatTimeSinceLastCheck = (date: Date | null): string => {
    if (!date) return '-';
    const elapsed = currentTime - date.getTime();
    const seconds = Math.floor(elapsed / 1000);

    if (seconds < 5) return content.relativeTime.justNow;
    if (seconds < 60) return content.relativeTime.secondsAgo.replace('{count}', String(seconds));
    return content.relativeTime.minutesAgo.replace('{count}', String(Math.floor(seconds / 60)));
  };

  /**
   * Starts the auto-refresh and freshness update intervals.
   */
  const startIntervals = (): void => {
    // Auto-refresh health check
    autoRefreshIntervalId = setInterval(() => {
      fetchHealth();
    }, AUTO_REFRESH_INTERVAL_MS);

    // Update current time for freshness calculation
    freshnessIntervalId = setInterval(() => {
      currentTime = Date.now();
    }, FRESHNESS_UPDATE_INTERVAL_MS);
  };

  /**
   * Stops all intervals.
   */
  const stopIntervals = (): void => {
    if (autoRefreshIntervalId) {
      clearInterval(autoRefreshIntervalId);
      autoRefreshIntervalId = null;
    }
    if (freshnessIntervalId) {
      clearInterval(freshnessIntervalId);
      freshnessIntervalId = null;
    }
  };

  onMount(() => {
    fetchHealth();
    startIntervals();
  });

  onDestroy(() => {
    stopIntervals();
  });
</script>

<div class="card">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <Icon
        icon="lucide:activity"
        width="20"
        height="20"
        class="text-primary-600 dark:text-primary-400"
      />
      <h2 class="text-xl font-semibold">{content.title}</h2>
    </div>
    <button
      type="button"
      onclick={fetchHealth}
      disabled={isLoading}
      class="p-2 text-secondary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors disabled:opacity-50"
      aria-label={content.refreshLabel}
    >
      <Icon
        icon="lucide:refresh-cw"
        width="18"
        height="18"
        class={isLoading ? 'animate-spin' : ''}
      />
    </button>
  </div>

  {#if isLoading && !health}
    <div class="flex justify-center py-8">
      <LoadingSpinner size="lg" />
    </div>
  {:else if error && !health}
    <div class="text-center py-6">
      <Icon icon="lucide:alert-circle" width="40" height="40" class="mx-auto mb-3 text-error-400" />
      <p class="text-error-600 dark:text-error-400">{error}</p>
      <button
        type="button"
        onclick={fetchHealth}
        class="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >
        {content.tryAgainLabel}
      </button>
    </div>
  {:else if health}
    <!-- Overall Status -->
    <div
      class="flex items-center gap-3 p-3 rounded-lg mb-4 transition-colors duration-1000 {getStatusBgClass(
        health.status
      )}"
    >
      <Icon
        icon={statusConfig[health.status].icon}
        width="24"
        height="24"
        class="transition-colors duration-1000 {getFreshnessColorClass(health.status)}"
      />
      <div class="flex-1">
        <p class="font-medium text-secondary-900 dark:text-secondary-100">
          {statusConfig[health.status].label}
        </p>
        <p class="text-xs text-secondary-500 dark:text-secondary-400">
          {content.checkedLabel}
          {formatTimeSinceLastCheck(lastChecked)}
        </p>
      </div>
      <!-- Freshness indicator bar -->
      {#if health.status === 'healthy'}
        <div class="w-16 h-1.5 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden">
          <div
            class="h-full bg-secondary-500 dark:bg-secondary-400 transition-all duration-1000 rounded-full"
            style="width: {freshness * 100}%"
          ></div>
        </div>
      {/if}
    </div>

    <!-- Services -->
    <div class="space-y-2">
      {#each health.services as service (service.name)}
        {@const isExpanded = expandedServices.has(service.name)}
        {@const canExpand = hasExpandableDetails(service)}
        <div class="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg overflow-hidden">
          <!-- Service header (clickable if expandable) -->
          {#if canExpand}
            <button
              type="button"
              onclick={() => toggleServiceExpanded(service.name)}
              class="w-full flex items-center justify-between p-3 hover:bg-secondary-100 dark:hover:bg-secondary-600/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon
                  icon={statusConfig[service.status].icon}
                  width="18"
                  height="18"
                  class="transition-colors duration-1000 {getFreshnessColorClass(service.status)}"
                />
                <div class="text-left">
                  <p class="font-medium text-secondary-900 dark:text-secondary-100">
                    {serviceLabels[service.name] || service.name}
                  </p>
                  {#if service.error}
                    <p class="text-xs text-error-600 dark:text-error-400">{service.error}</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-secondary-500 dark:text-secondary-400">
                  {formatResponseTime(service.responseTimeMs)}
                </span>
                <Icon
                  icon="lucide:chevron-down"
                  width="16"
                  height="16"
                  class="text-secondary-400 transition-transform duration-200 {isExpanded
                    ? 'rotate-180'
                    : ''}"
                />
              </div>
            </button>
          {:else}
            <div class="flex items-center justify-between p-3">
              <div class="flex items-center gap-3">
                <Icon
                  icon={statusConfig[service.status].icon}
                  width="18"
                  height="18"
                  class="transition-colors duration-1000 {getFreshnessColorClass(service.status)}"
                />
                <div>
                  <p class="font-medium text-secondary-900 dark:text-secondary-100">
                    {serviceLabels[service.name] || service.name}
                  </p>
                  {#if service.error}
                    <p class="text-xs text-error-600 dark:text-error-400">{service.error}</p>
                  {/if}
                </div>
              </div>
              <span class="text-sm text-secondary-500 dark:text-secondary-400">
                {formatResponseTime(service.responseTimeMs)}
              </span>
            </div>
          {/if}

          <!-- Database details (collapsible) -->
          {#if service.database && isExpanded}
            <div class="border-t border-secondary-200 dark:border-secondary-600 px-3 py-2">
              <!-- API Key status -->
              {#if service.database.apiKeyValid !== undefined}
                <div class="flex items-center gap-2 text-sm mb-2">
                  <Icon
                    icon="lucide:key-round"
                    width="14"
                    height="14"
                    class={service.database.apiKeyValid
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-error-600 dark:text-error-400'}
                  />
                  <span class="text-secondary-700 dark:text-secondary-300"
                    >{content.apiKeyLabel}</span
                  >
                  <span
                    class="text-xs {service.database.apiKeyValid
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-error-600 dark:text-error-400'}"
                  >
                    ({service.database.apiKeyValid ? content.validLabel : content.invalidLabel})
                  </span>
                </div>
              {/if}

              <!-- Database status -->
              <div class="flex items-center gap-2 text-sm">
                <Icon
                  icon={service.database.exists ? 'lucide:database' : 'lucide:database-zap'}
                  width="14"
                  height="14"
                  class={service.database.exists
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'}
                />
                <span class="text-secondary-700 dark:text-secondary-300">
                  {service.database.name}
                </span>
                {#if !service.database.exists}
                  <span class="text-xs text-error-600 dark:text-error-400">
                    ({service.database.error || content.notFoundLabel})
                  </span>
                {/if}
              </div>

              <!-- Collections -->
              {#if service.database.exists && service.database.collections}
                <div class="mt-2 space-y-1.5">
                  {#each service.database.collections as collection (collection.id)}
                    <div class="ml-4">
                      <div class="flex items-center gap-2 text-sm">
                        <Icon
                          icon={collection.exists ? 'lucide:folder-check' : 'lucide:folder-x'}
                          width="12"
                          height="12"
                          class={collection.exists
                            ? 'text-success-500 dark:text-success-400'
                            : 'text-error-500 dark:text-error-400'}
                        />
                        <span class="text-secondary-600 dark:text-secondary-400">
                          {collection.name}
                        </span>
                        {#if !collection.exists}
                          <span class="text-xs text-error-500">
                            ({collection.error || content.missingLabel})
                          </span>
                        {/if}
                      </div>

                      <!-- Attributes -->
                      {#if collection.exists && collection.attributes}
                        <div class="ml-4 mt-1 flex flex-wrap gap-1">
                          {#each collection.attributes as attr (attr.name)}
                            <span
                              class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded {attr.exists
                                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                                : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'}"
                            >
                              <Icon
                                icon={attr.exists ? 'lucide:check' : 'lucide:x'}
                                width="10"
                                height="10"
                              />
                              {attr.name}
                              {#if attr.type}
                                <span class="opacity-60">({attr.type})</span>
                              {/if}
                            </span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
