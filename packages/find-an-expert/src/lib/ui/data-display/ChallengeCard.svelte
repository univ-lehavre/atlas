<script lang="ts">
  /**
   * Challenge card component for displaying problem/solution pairs.
   * Useful for "Why we built this" or feature comparison sections.
   */
  interface Props {
    /** Challenge or feature title */
    title: string;
    /** Problem description */
    problem: string;
    /** Solution description */
    solution: string;
    /** Additional CSS classes */
    class?: string;
  }

  let { title, problem, solution, class: className = '' }: Props = $props();
</script>

<div class="card hover:shadow-lg transition-shadow {className}">
  <h3 class="text-lg font-semibold mb-3 text-secondary-900 dark:text-white">
    {title}
  </h3>
  <p class="text-secondary-600 dark:text-secondary-400 text-sm mb-4">{problem}</p>
  <p class="text-primary-700 dark:text-primary-400 text-sm font-medium">
    {solution}
  </p>
</div>
