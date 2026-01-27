<script lang="ts">
  import { Icon } from '$lib/ui';

  /**
   * Navigation link component with icon and active state.
   * Supports both internal and external links.
   *
   * Note: This component accepts any href string (internal or external).
   * Route resolution is handled by the caller when needed.
   */
  interface Props {
    /** Link destination */
    href: string;
    /** Link label text */
    label: string;
    /** Lucide icon name */
    icon?: string;
    /** Whether the link is currently active */
    isCurrent?: boolean;
    /** Whether this is an external link */
    external?: boolean;
    /** Visual variant */
    variant?: 'default' | 'mobile';
    /** Click handler (useful for closing mobile menu) */
    onclick?: () => void;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    href,
    label,
    icon,
    isCurrent = false,
    external = false,
    variant = 'default',
    onclick,
    class: className = '',
  }: Props = $props();

  const baseClasses = $derived(
    variant === 'mobile'
      ? 'py-2 border-b border-secondary-100 dark:border-secondary-700 flex items-center gap-3'
      : 'text-sm inline-flex items-center gap-1.5'
  );

  const stateClasses = $derived(
    isCurrent
      ? 'text-secondary-400 dark:text-secondary-500 cursor-default pointer-events-none'
      : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400'
  );

  const iconSize = $derived(variant === 'mobile' ? '20' : '16');
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- generic navigation component accepts any href -->
<a
  {href}
  target={external ? '_blank' : undefined}
  rel={external ? 'noopener noreferrer' : undefined}
  title={external ? 'Opens in new tab' : undefined}
  class="{baseClasses} {stateClasses} {className}"
  aria-current={isCurrent ? 'page' : undefined}
  {onclick}
>
  {#if icon}
    <Icon {icon} width={iconSize} height={iconSize} />
  {/if}
  {label}
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
