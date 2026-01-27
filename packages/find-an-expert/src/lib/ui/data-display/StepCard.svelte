<script lang="ts">
  /**
   * Step card component for displaying numbered process steps.
   * Features a circular number badge, title, and description.
   */
  interface Props {
    /** Step number or label to display in the badge */
    number: string | number;
    /** Step title */
    title: string;
    /** Step description */
    description: string;
    /** Additional CSS classes */
    class?: string;
  }

  let { number, title, description, class: className = '' }: Props = $props();
</script>

<div class="text-center {className}">
  <div
    class="w-16 h-16 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
  >
    {number}
  </div>
  <h3 class="text-xl font-semibold mb-3 text-secondary-900 dark:text-white">
    {title}
  </h3>
  <p class="text-secondary-600 dark:text-secondary-400">{description}</p>
</div>
