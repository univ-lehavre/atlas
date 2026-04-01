<script lang="ts">
  /**
   * Partner logo component with link and hover effect.
   * Displays a clickable logo that links to an external website.
   */
  interface Props {
    /** External URL to link to */
    href: string;
    /** Image source path */
    src: string;
    /** Alt text for the image */
    alt: string;
    /** Max height class (default: max-h-24 md:max-h-32) */
    maxHeight?: string;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    href,
    src,
    alt,
    maxHeight = 'max-h-24 md:max-h-32',
    class: className = '',
  }: Props = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- external link with target="_blank" -->
<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  class="hover:opacity-80 transition-opacity {className}"
>
  <img {src} {alt} class="{maxHeight} w-auto object-contain" />
</a>
