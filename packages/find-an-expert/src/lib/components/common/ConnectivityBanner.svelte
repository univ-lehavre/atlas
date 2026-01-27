<script lang="ts">
  import { ConnectivityBanner as BaseConnectivityBanner } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * ConnectivityBanner - Pre-configured connectivity banner with i18n labels.
   *
   * Wraps $lib/ui/ConnectivityBanner and injects content from i18n.
   *
   * @example
   * ```svelte
   * <ConnectivityBanner error="no_internet" />
   * ```
   */
  interface Props {
    /** Type of connectivity error */
    error: 'appwrite_unavailable' | 'no_internet';
  }

  let { error }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    appwriteUnavailableTitle: ui.connectivity.appwriteUnavailable.title,
    appwriteUnavailableDescription: ui.connectivity.appwriteUnavailable.description,
    noInternetTitle: ui.connectivity.noInternet.title,
    noInternetDescription: ui.connectivity.noInternet.description,
    checkStatusLabel: ui.common.checkStatus,
  });
</script>

<BaseConnectivityBanner {error} {content} />
