<script lang="ts">
  import { HealthStatusCard as BaseHealthStatusCard } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * HealthStatusCard - Pre-configured health status card with i18n labels.
   *
   * Wraps $lib/ui/HealthStatusCard and injects content from i18n.
   *
   * @example
   * ```svelte
   * <HealthStatusCard />
   * ```
   */

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    title: ui.health.title,
    refreshLabel: ui.health.refreshLabel,
    statusHealthy: ui.health.status.healthy,
    statusDegraded: ui.health.status.degraded,
    statusUnhealthy: ui.health.status.unhealthy,
    serviceAppwrite: ui.health.services.appwrite,
    serviceInternet: ui.health.services.internet,
    checkedLabel: ui.health.checked,
    apiKeyLabel: ui.health.apiKey,
    validLabel: ui.health.valid,
    invalidLabel: ui.health.invalid,
    notFoundLabel: ui.health.notFound,
    missingLabel: ui.health.missing,
    tryAgainLabel: ui.common.tryAgain,
    relativeTime: {
      justNow: ui.relativeTime.justNow,
      secondsAgo: ui.relativeTime.secondsAgo,
      minutesAgo: ui.relativeTime.minutesAgo,
      hoursAgo: ui.relativeTime.hoursAgo,
      yesterday: ui.relativeTime.yesterday,
      daysAgo: ui.relativeTime.daysAgo,
    },
  });
</script>

<BaseHealthStatusCard {content} />
