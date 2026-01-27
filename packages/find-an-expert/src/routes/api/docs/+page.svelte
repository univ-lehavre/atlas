<script lang="ts">
  import { onMount } from 'svelte';
  import 'swagger-ui-dist/swagger-ui.css';
  import { useI18n } from '$lib/content';

  const i18n = useI18n();
  const apiDocs = $derived(i18n.apiDocs);

  interface Props {
    data: {
      spec: object;
    };
  }

  let { data }: Props = $props();

  let swaggerContainer: HTMLDivElement;

  onMount(async () => {
    const { SwaggerUIBundle } = await import('swagger-ui-dist');

    SwaggerUIBundle({
      spec: data.spec,
      domNode: swaggerContainer,
      deepLinking: true,
      layout: 'BaseLayout',
    });
  });
</script>

<svelte:head>
  <title>{apiDocs.meta.title}</title>
</svelte:head>

<div class="min-h-screen bg-white">
  <div bind:this={swaggerContainer}></div>
</div>

<style>
  :global(.swagger-ui .topbar) {
    display: none;
  }

  :global(.swagger-ui) {
    font-family: inherit;
  }
</style>
