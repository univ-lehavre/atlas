<script lang="ts">
  import { ProfileCard as BaseProfileCard } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * ProfileCard - Pre-configured profile card with i18n labels.
   *
   * Wraps $lib/ui/ProfileCard and injects content from i18n.
   *
   * @example
   * ```svelte
   * <ProfileCard email="user@example.com" isComplete={true} />
   * ```
   */
  interface Props {
    /** User email address */
    email?: string;
    /** Whether the profile is complete */
    isComplete?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let { email, isComplete = false, class: className = '' }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    title: ui.profile.title,
    emailLabel: ui.common.email,
    notLoggedInMessage: ui.common.notLoggedIn,
    completeLabel: ui.profile.complete,
    incompleteLabel: ui.profile.incomplete,
  });
</script>

<BaseProfileCard {email} {isComplete} {content} class={className} />
