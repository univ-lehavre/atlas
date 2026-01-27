<script lang="ts">
  import { Icon } from '$lib/ui';

  /**
   * ConnectivityBanner - Alert banner for connectivity issues
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/ConnectivityBanner.
   *
   * @example
   * ```svelte
   * <ConnectivityBanner error="no_internet" content={connectivityContent} />
   * ```
   */
  interface ConnectivityContent {
    /** Appwrite unavailable title */
    appwriteUnavailableTitle: string;
    /** Appwrite unavailable description */
    appwriteUnavailableDescription: string;
    /** No internet title */
    noInternetTitle: string;
    /** No internet description */
    noInternetDescription: string;
    /** Check status link text */
    checkStatusLabel: string;
  }

  interface Props {
    /** Type of connectivity error */
    error: 'appwrite_unavailable' | 'no_internet';
    /** Content for the banner (required) */
    content: ConnectivityContent;
  }

  let { error, content }: Props = $props();

  const messages = $derived<
    Record<
      'appwrite_unavailable' | 'no_internet',
      { title: string; description: string; icon: string }
    >
  >({
    appwrite_unavailable: {
      title: content.appwriteUnavailableTitle,
      description: content.appwriteUnavailableDescription,
      icon: 'lucide:server-off',
    },
    no_internet: {
      title: content.noInternetTitle,
      description: content.noInternetDescription,
      icon: 'lucide:wifi-off',
    },
  });

  const message = $derived(messages[error]);
</script>

<div
  class="bg-warning-50 dark:bg-warning-900/30 border-b border-warning-200 dark:border-warning-800"
  role="alert"
>
  <div class="container-app py-3">
    <div class="flex items-center gap-3">
      <Icon
        icon={message.icon}
        width="20"
        height="20"
        class="text-warning-600 dark:text-warning-400 flex-shrink-0"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-warning-800 dark:text-warning-200">
          {message.title}
        </p>
        <p class="text-xs text-warning-600 dark:text-warning-400">
          {message.description}
        </p>
      </div>
      <!-- eslint-disable svelte/no-navigation-without-resolve -- API endpoint link with target="_blank" -->
      <a
        href="/api/v1/health"
        target="_blank"
        class="text-xs text-warning-600 dark:text-warning-400 hover:underline flex-shrink-0"
      >
        {content.checkStatusLabel}
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </div>
  </div>
</div>
