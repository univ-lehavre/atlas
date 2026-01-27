<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * PageHeader - En-tête de page avec composition flexible
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/PageHeader.
   *
   * @example Simple
   * ```svelte
   * <PageHeader title="Dashboard" description="Vue d'ensemble" breadcrumbsLabel="Fil d'Ariane" />
   * ```
   *
   * @example Avec actions et filtres
   * ```svelte
   * <PageHeader
   *   title="Organisations"
   *   icon="lucide:building-2"
   *   variant="hero"
   *   breadcrumbsLabel="Navigation"
   * >
   *   {#snippet actions()}
   *     <button class="btn-primary">Ajouter</button>
   *   {/snippet}
   * </PageHeader>
   * ```
   */

  interface BreadcrumbItem {
    label: string;
    href?: string;
  }

  interface Props {
    /** Page title */
    title: string;
    /** Optional description */
    description?: string;
    /** Lucide icon name */
    icon?: string;
    /** Breadcrumb navigation */
    breadcrumbs?: BreadcrumbItem[];
    /** Breadcrumbs aria-label (required if breadcrumbs provided) */
    breadcrumbsLabel?: string;
    /** Visual variant */
    variant?: 'default' | 'surface' | 'hero';
    /** Action buttons area */
    actions?: Snippet;
    /** Filters/search area */
    filters?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    description,
    icon,
    breadcrumbs,
    breadcrumbsLabel = '',
    variant = 'default',
    actions,
    filters,
    class: className = '',
  }: Props = $props();
</script>

<header class="page-header {className}" data-variant={variant}>
  <div class="container-app">
    {#if breadcrumbs && breadcrumbs.length > 0}
      <nav class="breadcrumbs" aria-label={breadcrumbsLabel}>
        {#each breadcrumbs as item, idx (item.href ?? item.label)}
          {#if idx > 0}
            <Icon icon="lucide:chevron-right" width="16" height="16" class="breadcrumb-separator" />
          {/if}
          {#if item.href}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- generic breadcrumb component accepts any href -->
            <a href={item.href} class="breadcrumb-link">{item.label}</a>
          {:else}
            <span class="breadcrumb-current" aria-current="page">{item.label}</span>
          {/if}
        {/each}
      </nav>
    {/if}

    <div class="header-main">
      <div class="title-group">
        {#if icon}
          <Icon {icon} width="32" height="32" class="title-icon" />
        {/if}
        <div>
          <h1 class="title">{title}</h1>
          {#if description}
            <p class="description">{description}</p>
          {/if}
        </div>
      </div>

      {#if actions}
        <div class="actions">
          {@render actions()}
        </div>
      {/if}
    </div>

    {#if filters}
      <div class="filters">
        {@render filters()}
      </div>
    {/if}
  </div>
</header>

<style>
  .page-header {
    --header-bg: var(--color-secondary-50);
    --header-text: var(--color-secondary-900);
    --header-text-muted: var(--color-secondary-600);

    background-color: var(--header-bg);
    border-bottom: 1px solid var(--color-secondary-200);
    padding-block: var(--spacing-lg);
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  /* Variants */
  .page-header[data-variant='surface'] {
    --header-bg: white;
  }

  .page-header[data-variant='hero'] {
    --header-bg: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-600));
    --header-text: white;
    --header-text-muted: rgba(255, 255, 255, 0.8);
    border-bottom: none;
    padding-block: var(--spacing-xl);
  }

  /* Dark mode */
  :global(.dark) .page-header {
    --header-bg: var(--color-secondary-900);
    --header-text: var(--color-secondary-100);
    --header-text-muted: var(--color-secondary-400);
    border-color: var(--color-secondary-700);
  }

  :global(.dark) .page-header[data-variant='surface'] {
    --header-bg: var(--color-secondary-800);
  }

  /* Breadcrumbs */
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
    font-size: var(--text-sm);
  }

  .breadcrumb-link {
    color: var(--header-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .breadcrumb-link:hover {
    color: var(--header-text);
    text-decoration: underline;
  }

  .breadcrumb-current {
    color: var(--header-text);
    font-weight: 500;
  }

  .page-header[data-variant='hero'] .breadcrumb-link,
  .page-header[data-variant='hero'] .breadcrumb-current {
    color: var(--header-text-muted);
  }

  .page-header[data-variant='hero'] .breadcrumb-link:hover {
    color: var(--header-text);
  }

  :global(.breadcrumb-separator) {
    color: var(--header-text-muted);
    opacity: 0.5;
  }

  /* Header main */
  .header-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .title-group {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  :global(.title-icon) {
    flex-shrink: 0;
    color: var(--color-primary-600);
  }

  .page-header[data-variant='hero'] :global(.title-icon) {
    color: white;
  }

  :global(.dark) :global(.title-icon) {
    color: var(--color-primary-400);
  }

  .title {
    font-size: var(--text-3xl);
    font-weight: 700;
    line-height: 1.2;
    color: var(--header-text);
    margin: 0;
  }

  .description {
    margin-top: var(--spacing-xs);
    font-size: var(--text-lg);
    color: var(--header-text-muted);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  /* Filters */
  .filters {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--color-secondary-200);
  }

  :global(.dark) .filters {
    border-color: var(--color-secondary-700);
  }

  .page-header[data-variant='hero'] .filters {
    border-color: rgba(255, 255, 255, 0.2);
  }
</style>
