<script lang="ts">
  import { Icon, LoadingSpinner, Alert } from '$lib/ui';
  import type { TInstitution, TInstitutionStatsResponse } from '$lib/server/openalex';

  /**
   * ArticlesCountCard - Card displaying article statistics for selected organizations.
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/ArticlesCountCard.
   *
   * @example
   * ```svelte
   * <ArticlesCountCard {selectedOrganizations} {hasConsent} content={articlesCountContent} />
   * ```
   */
  interface ArticlesCountContent {
    /** Card title */
    title: string;
    /** Consent message when no consent granted */
    consentMessage: string;
    /** Message when no organizations selected */
    selectOrganizations: string;
    /** Loading message */
    loading: string;
    /** Articles by year section label */
    articlesByYear: string;
    /** Label for "before" period */
    beforeLabel: string;
    /** Affiliated authors section label */
    affiliatedAuthors: string;
    /** Total label */
    totalLabel: string;
    /** Consent required tooltip */
    consentRequired: string;
  }

  interface Props {
    /** Selected organizations to count articles for */
    selectedOrganizations: TInstitution[];
    /** Whether user has granted consent for OpenAlex API usage */
    hasConsent?: boolean;
    /** Content for the card (required) */
    content: ArticlesCountContent;
  }

  let { selectedOrganizations, hasConsent = false, content }: Props = $props();

  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let stats = $state<TInstitutionStatsResponse | null>(null);

  // Not reactive - just used for cleanup
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the component is disabled (no consent) */
  const isDisabled = $derived(!hasConsent);

  /**
   * Formats a number for display using French locale.
   * @param num - The number to format
   */
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  /**
   * Fetches the institution statistics from the API.
   */
  const fetchStats = async (): Promise<void> => {
    if (selectedOrganizations.length === 0 || !hasConsent) {
      stats = null;
      return;
    }

    isLoading = true;
    error = null;

    try {
      const ids = selectedOrganizations.map((org) => org.id).join(',');

      const response = await fetch(`/api/v1/institutions/stats?ids=${encodeURIComponent(ids)}`);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed: ${response.status}`);
      }

      stats = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      stats = null;
    } finally {
      isLoading = false;
    }
  };

  $effect(() => {
    // Track organization and consent changes to trigger fetch
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _trackDependency = `${selectedOrganizations.map((o) => o.id).join(',')}-${hasConsent}`;

    // Clear any existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce the API call
    debounceTimer = setTimeout(() => {
      fetchStats();
    }, 500);

    // Cleanup on effect re-run
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  });
</script>

<div class="card {isDisabled ? 'opacity-60' : ''}">
  <div class="flex items-center gap-2 mb-4">
    <Icon
      icon="lucide:library"
      width="20"
      height="20"
      class={isDisabled
        ? 'text-secondary-400 dark:text-secondary-500'
        : 'text-primary-600 dark:text-primary-400'}
    />
    <h2 class="text-xl font-semibold">{content.title}</h2>
    {#if isDisabled}
      <span title={content.consentRequired} class="ml-auto">
        <Icon
          icon="lucide:lock"
          width="16"
          height="16"
          class="text-secondary-400 dark:text-secondary-500"
        />
      </span>
    {/if}
  </div>

  {#if isDisabled}
    <div
      class="p-4 rounded-lg bg-secondary-100 dark:bg-secondary-700/50 border border-secondary-200 dark:border-secondary-600"
    >
      <p class="text-sm text-secondary-600 dark:text-secondary-400 text-center">
        {content.consentMessage}
      </p>
    </div>
  {:else if selectedOrganizations.length === 0}
    <div class="text-center py-8">
      <Icon
        icon="lucide:building-2"
        width="40"
        height="40"
        class="mx-auto mb-3 text-secondary-300 dark:text-secondary-600"
      />
      <p class="text-secondary-500 dark:text-secondary-400">
        {content.selectOrganizations}
      </p>
    </div>
  {:else if isLoading}
    <div class="flex flex-col items-center justify-center py-8">
      <LoadingSpinner size="lg" />
      <p class="mt-3 text-sm text-secondary-500 dark:text-secondary-400">{content.loading}</p>
    </div>
  {:else if error}
    <Alert variant="error">{error}</Alert>
  {:else if stats}
    <div class="space-y-4">
      <!-- Articles by year -->
      {#if stats.articlesByYear && stats.articlesByYear.length > 0}
        <div class="space-y-2">
          <p class="text-sm font-medium text-secondary-600 dark:text-secondary-400">
            {content.articlesByYear}
          </p>
          <div class="flex flex-wrap justify-start gap-1.5">
            {#each stats.articlesByYear as yearData (yearData.year)}
              <div
                class="text-center px-2 py-1 rounded {yearData.year === 'before'
                  ? 'bg-secondary-100 dark:bg-secondary-600/50'
                  : 'bg-secondary-50 dark:bg-secondary-700/50'}"
              >
                <p class="text-[10px] text-secondary-500 dark:text-secondary-400">
                  {yearData.year === 'before' ? content.beforeLabel : yearData.year}
                </p>
                <p
                  class="text-xs font-semibold {yearData.year === 'before'
                    ? 'text-secondary-600 dark:text-secondary-300'
                    : 'text-primary-600 dark:text-primary-400'}"
                >
                  {formatNumber(yearData.count)}
                </p>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Authors count -->
      <div class="space-y-2">
        <p class="text-sm font-medium text-secondary-600 dark:text-secondary-400">
          {content.affiliatedAuthors}
        </p>
        <div class="flex flex-wrap justify-start gap-1.5">
          <div class="text-center px-2 py-1 rounded bg-secondary-50 dark:bg-secondary-700/50">
            <p class="text-[10px] text-secondary-500 dark:text-secondary-400">
              {content.totalLabel}
            </p>
            <p class="text-xs font-semibold text-primary-600 dark:text-primary-400">
              {formatNumber(stats.authorsCount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
