<script lang="ts">
  import { Card, Icon } from '$lib/ui';

  /**
   * DashboardLinkCard - Card with title, description and navigation link
   *
   * Used for dashboard sections that link to other pages (Repository, API docs, etc.)
   *
   * @example
   * ```svelte
   * <DashboardLinkCard
   *   title="Repository"
   *   description="Explore code statistics and analytics."
   *   icon="lucide:bar-chart-2"
   *   href="/repository"
   *   linkText="View stats"
   * />
   * ```
   */
  interface Props {
    /** Card title */
    title: string;
    /** Card description */
    description: string;
    /** Icon name (Iconify format) */
    icon: string;
    /** Target URL */
    href: string;
    /** Link button text */
    linkText?: string;
    /** Link icon */
    linkIcon?: string;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    description,
    icon,
    href,
    linkText = 'View',
    linkIcon = 'lucide:arrow-right',
    class: className = '',
  }: Props = $props();
</script>

<Card class="dashboard-link-card {className}">
  <div class="card-header">
    <div class="title-group">
      <Icon {icon} width="20" height="20" class="title-icon" />
      <h2 class="card-title">{title}</h2>
    </div>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- generic component accepts any href -->
    <a {href} class="card-link">
      <Icon icon={linkIcon} width="14" height="14" />
      {linkText}
    </a>
  </div>
  <p class="card-description">{description}</p>
</Card>

<style>
  :global(.dashboard-link-card) {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  :global(.title-icon) {
    color: var(--color-primary-600);
  }

  :global(.dark) :global(.title-icon) {
    color: var(--color-primary-400);
  }

  .card-title {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-secondary-900);
  }

  :global(.dark) .card-title {
    color: var(--color-secondary-100);
  }

  .card-description {
    margin: 0;
    color: var(--color-secondary-600);
  }

  :global(.dark) .card-description {
    color: var(--color-secondary-400);
  }

  .card-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2xs);
    font-size: var(--text-sm);
    color: var(--color-primary-600);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .card-link:hover {
    text-decoration: underline;
  }

  :global(.dark) .card-link {
    color: var(--color-primary-400);
  }
</style>
