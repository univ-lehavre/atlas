<script lang="ts">
  /**
   * Tag card component for displaying short labels in a grid.
   * Useful for topic tags, categories, or feature highlights.
   */
  interface Props {
    /** Tag label text */
    label: string;
    /** Card size variant */
    size?: 'sm' | 'md';
    /** Additional CSS classes */
    class?: string;
  }

  let { label, size = 'md', class: className = '' }: Props = $props();

  const sizeClasses = {
    sm: 'py-3 text-xs',
    md: 'py-4 text-sm',
  };
</script>

<div class="card text-center {sizeClasses[size]} {className}">
  <h3 class="font-semibold text-primary-700 dark:text-primary-400">
    {label}
  </h3>
</div>
