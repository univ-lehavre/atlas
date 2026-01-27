<script lang="ts">
  import { Alert, Icon } from '$lib/ui';

  /**
   * ComingSoonSection - Section displaying upcoming features
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/ComingSoonSection.
   *
   * @example
   * ```svelte
   * <ComingSoonSection
   *   title="Coming Soon"
   *   description="These features are on the way"
   *   features={['Feature 1', 'Feature 2']}
   * />
   * ```
   */
  interface Props {
    /** Section title */
    title: string;
    /** Section description */
    description: string;
    /** List of upcoming features */
    features: string[];
    /** Additional CSS classes */
    class?: string;
  }

  let { title, description, features, class: className = '' }: Props = $props();
</script>

<Alert variant="info" icon="lucide:sparkles" class="coming-soon-section {className}">
  <div class="section-content">
    <h2 class="section-title">{title}</h2>
    <p class="section-description">{description}</p>
    <ul class="feature-list">
      {#each features as feature (feature)}
        <li class="feature-item">
          <Icon icon="lucide:check" width="16" height="16" class="check-icon" />
          <span>{feature}</span>
        </li>
      {/each}
    </ul>
  </div>
</Alert>

<style>
  :global(.coming-soon-section) {
    margin-top: var(--spacing-xl);
  }

  .section-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .section-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .section-description {
    margin: 0;
    opacity: 0.9;
  }

  .feature-list {
    list-style: none;
    margin: var(--spacing-sm) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  :global(.check-icon) {
    flex-shrink: 0;
    color: var(--color-primary-500);
  }
</style>
