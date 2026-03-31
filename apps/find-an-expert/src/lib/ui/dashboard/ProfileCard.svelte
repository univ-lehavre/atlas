<script lang="ts">
  import { InfoCard, KeyValue, Badge } from '$lib/ui';

  /**
   * ProfileCard - User profile summary card
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/ProfileCard.
   *
   * @example
   * ```svelte
   * <ProfileCard email="user@example.com" isComplete={false} content={profileContent} />
   * ```
   */
  interface ProfileContent {
    /** Card title */
    title: string;
    /** Email label */
    emailLabel: string;
    /** Not logged in message */
    notLoggedInMessage: string;
    /** Complete status label */
    completeLabel: string;
    /** Incomplete status label */
    incompleteLabel: string;
  }

  interface Props {
    /** User email address */
    email?: string;
    /** Whether the profile is complete */
    isComplete?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Content for the card (required) */
    content: ProfileContent;
  }

  let { email, isComplete = false, class: className = '', content }: Props = $props();
</script>

<InfoCard title={content.title} icon="lucide:user" class={className}>
  <div class="profile-content">
    <KeyValue
      label={content.emailLabel}
      value={email ?? content.notLoggedInMessage}
      direction="vertical"
    />
    <div class="profile-status">
      <Badge variant={isComplete ? 'success' : 'warning'}>
        {isComplete ? content.completeLabel : content.incompleteLabel}
      </Badge>
    </div>
  </div>
</InfoCard>

<style>
  .profile-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .profile-status {
    margin-top: var(--spacing-sm);
  }
</style>
