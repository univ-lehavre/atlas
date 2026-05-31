<script lang="ts">
  import { onMount } from 'svelte';

  onMount(async () => {
    // Charger Swagger UI depuis le CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.addEventListener('load', () => {
      // @ts-expect-error SwaggerUIBundle est chargé depuis le CDN
      globalThis.SwaggerUIBundle({
        dom_id: '#swagger-ui',
        url: '/api/v1/openapi.json',
        deepLinking: true,
        presets: [
          // @ts-expect-error SwaggerUIBundle est chargé depuis le CDN
          globalThis.SwaggerUIBundle.presets.apis,
          // @ts-expect-error SwaggerUIStandalonePreset est chargé depuis le CDN
          globalThis.SwaggerUIStandalonePreset,
        ],
        layout: 'StandaloneLayout',
      });
    });
    document.head.append(script);

    const standaloneScript = document.createElement('script');
    standaloneScript.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js';
    document.head.append(standaloneScript);
  });
</script>

Bon<svelte:head>
  <title>ECRIN API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</svelte:head>

<div id="swagger-ui"></div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  #swagger-ui {
    min-height: 100vh;
  }
</style>
