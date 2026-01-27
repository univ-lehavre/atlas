<script lang="ts">
  import { ConsentStatusCard as BaseConsentStatusCard } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * ConsentStatusCard - Pre-configured consent status card with i18n labels.
   *
   * Wraps $lib/ui/ConsentStatusCard and injects content from i18n.
   *
   * @example
   * ```svelte
   * <ConsentStatusCard userEmail="user@example.com" bind:hasConsent />
   * ```
   */
  interface Props {
    /** User email to display in modal */
    userEmail?: string | null;
    /** Whether consent has been granted (bindable for parent components) */
    hasConsent?: boolean;
  }

  let { userEmail, hasConsent = $bindable(false) }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    title: ui.consent.title,
    openAlexTitle: ui.consent.openAlexTitle,
    grantedMessage: ui.consent.grantedMessage,
    declinedMessage: ui.consent.declinedMessage,
    pendingMessage: ui.consent.pendingMessage,
    grantButton: ui.consent.grantButton,
    revokeButton: ui.consent.revokeButton,
    declineButton: ui.consent.declineButton,
    updatedLabel: ui.common.updated,
    emailLabel: ui.common.email,
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

<BaseConsentStatusCard {userEmail} bind:hasConsent {content} />
