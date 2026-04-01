<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PageHeader as BasePageHeader } from '$lib/ui';
  import { useI18n } from '$lib/content';

  /**
   * PageHeader - Pre-configured page header with i18n labels.
   *
   * Wraps $lib/ui/PageHeader and injects accessibility labels from i18n.
   *
   * @example
   * ```svelte
   * <PageHeader title="Dashboard" description="Vue d'ensemble" />
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
    variant = 'default',
    actions,
    filters,
    class: className = '',
  }: Props = $props();

  const i18n = useI18n();
  const a11y = $derived(i18n.accessibility);
</script>

<BasePageHeader
  {title}
  {description}
  {icon}
  {breadcrumbs}
  breadcrumbsLabel={a11y.breadcrumbs}
  {variant}
  {actions}
  {filters}
  class={className}
/>
