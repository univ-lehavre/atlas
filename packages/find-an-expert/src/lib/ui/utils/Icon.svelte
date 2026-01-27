<script lang="ts">
  import IconComponent from '@iconify/svelte';

  interface Props {
    icon: string;
    class?: string;
    style?: string;
    width?: string | number;
    height?: string | number;
  }

  let { icon, class: className = '', style, width = '1em', height = '1em' }: Props = $props();
</script>

<IconComponent {icon} {width} {height} class={className} {style} />
