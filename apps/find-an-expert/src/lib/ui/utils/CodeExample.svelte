<script lang="ts">
  /**
   * Code example component with syntax highlighting via CSS classes.
   * Displays code snippets with colored tokens.
   *
   * @example
   * ```svelte
   * <CodeExample comment="// Background" keyword="class" value="bg-primary-500" />
   * ```
   */
  interface Props {
    /** Comment text (gray) */
    comment?: string;
    /** Keyword text (primary color) */
    keyword?: string;
    /** Value text (success color) */
    value?: string;
    /** Raw code string (if no structured format needed) */
    code?: string;
    /** Additional CSS classes */
    class?: string;
  }

  let { comment, keyword, value, code, class: className = '' }: Props = $props();
</script>

<div class="p-3 rounded bg-secondary-50 dark:bg-secondary-800 text-xs font-mono {className}">
  {#if code}
    <code>{code}</code>
  {:else}
    {#if comment}
      <span class="text-secondary-500">{comment}</span><br />
    {/if}
    {#if keyword}
      <span class="text-primary-600">{keyword}</span>="<span class="text-success-600">{value}</span
      >"
    {/if}
  {/if}
</div>
