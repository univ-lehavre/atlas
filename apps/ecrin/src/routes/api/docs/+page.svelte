<script lang="ts">
  import { onMount } from 'svelte';

  onMount(async () => {
    // Charger Swagger UI depuis le CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      // @ts-expect-error SwaggerUIBundle est chargé depuis le CDN
      window.SwaggerUIBundle({
        dom_id: '#swagger-ui',
        url: '/api/v1/openapi.json',
        deepLinking: true,
        presets: [
          // @ts-expect-error SwaggerUIBundle est chargé depuis le CDN
          window.SwaggerUIBundle.presets.apis,
          // @ts-expect-error SwaggerUIStandalonePreset est chargé depuis le CDN
          window.SwaggerUIStandalonePreset,
        ],
        layout: 'StandaloneLayout',
      });
    };
    document.head.appendChild(script);

    const standaloneScript = document.createElement('script');
    standaloneScript.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js';
    document.head.appendChild(standaloneScript);
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
