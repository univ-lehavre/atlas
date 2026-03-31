<script lang="ts">
  import { Icon } from '$lib/ui';

  /**
   * ExternalLinkCard - Clickable card for external links
   *
   * Displays an external link as a styled card with icon, title, and description.
   * Includes visual indicators for external navigation.
   *
   * @example
   * ```svelte
   * <ExternalLinkCard
   *   href="https://github.com/user/repo"
   *   icon="mdi:github"
   *   title="GitHub"
   *   description="Source code repository"
   * />
   * ```
   */
  interface Props {
    /** Target URL */
    href: string;
    /** Icon name (Iconify format) */
    icon: string;
    /** Link title */
    title: string;
    /** Link description */
    description: string;
    /** Additional CSS classes */
    class?: string;
  }

  let { href, icon, title, description, class: className = '' }: Props = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- external links don't need resolve -->
<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  title="Opens in new tab"
  class="external-link-card {className}"
>
  <Icon {icon} width="20" height="20" class="link-icon" />
  <div class="link-content">
    <p class="link-title">{title}</p>
    <p class="link-description">{description}</p>
  </div>
  <Icon icon="lucide:external-link" width="14" height="14" class="external-indicator" />
</a>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
  .external-link-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-secondary-200);
    background-color: transparent;
    text-decoration: none;
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);
  }

  .external-link-card:hover {
    border-color: var(--color-primary-300);
    background-color: var(--color-primary-50);
  }

  :global(.dark) .external-link-card {
    border-color: var(--color-secondary-700);
  }

  :global(.dark) .external-link-card:hover {
    border-color: var(--color-primary-600);
    background-color: oklch(from var(--color-primary-500) 20% 0.05 h);
  }

  :global(.link-icon) {
    flex-shrink: 0;
    color: var(--color-primary-600);
  }

  :global(.dark) :global(.link-icon) {
    color: var(--color-primary-400);
  }

  .link-content {
    flex: 1;
    min-width: 0;
  }

  .link-title {
    margin: 0;
    font-weight: 500;
    color: var(--color-secondary-900);
  }

  :global(.dark) .link-title {
    color: var(--color-secondary-100);
  }

  .link-description {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-secondary-500);
  }

  :global(.dark) .link-description {
    color: var(--color-secondary-400);
  }

  :global(.external-indicator) {
    flex-shrink: 0;
    color: var(--color-secondary-400);
  }

  :global(.dark) :global(.external-indicator) {
    color: var(--color-secondary-500);
  }
</style>
