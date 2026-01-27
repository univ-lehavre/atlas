<script lang="ts">
  import { Icon, Tooltip } from '$lib/ui';

  /**
   * Icon link component with optional tooltip.
   * Displays a clickable icon that links to a URL.
   *
   * Note: This component accepts any href string (internal or external).
   * Route resolution is handled by the caller when needed.
   */
  interface Props {
    /** Link destination */
    href: string;
    /** Lucide/Iconify icon name */
    icon: string;
    /** Accessible label (shown in tooltip and screen reader) */
    label: string;
    /** Tooltip description (optional) */
    description?: string;
    /** Whether this is an external link */
    external?: boolean;
    /** Icon size */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    class?: string;
  }

  let {
    href,
    icon,
    label,
    description,
    external = false,
    size = 'md',
    class: className = '',
  }: Props = $props();

  const sizeMap = {
    sm: '16',
    md: '20',
    lg: '24',
  };

  const iconSize = $derived(sizeMap[size]);
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- generic link component accepts any href -->
<Tooltip title={label} {description}>
  <a
    {href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    class="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors {className}"
  >
    <Icon {icon} width={iconSize} height={iconSize} />
    <span class="sr-only">{label}</span>
  </a>
</Tooltip>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
