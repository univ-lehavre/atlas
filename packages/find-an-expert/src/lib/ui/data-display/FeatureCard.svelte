<script lang="ts">
  /**
   * Feature card component for displaying a title and description.
   * Useful for feature highlights, topic cards, or capability lists.
   */
  interface Props {
    /** Feature title */
    title: string;
    /** Feature description */
    description: string;
    /** Additional CSS classes */
    class?: string;
  }

  let { title, description, class: className = '' }: Props = $props();
</script>

<div class="card text-center {className}">
  <h3 class="text-lg font-semibold mb-2 text-primary-700 dark:text-primary-400">
    {title}
  </h3>
  <p class="text-secondary-600 dark:text-secondary-400 text-sm">
    {description}
  </p>
</div>
