<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/rapidoc@9/dist/rapidoc-min.js';
    script.type = 'module';
    document.body.appendChild(script);
  });
</script>

<rapi-doc
  spec-url="/api/openapi.json"
  theme="dark"
  bg-color="#1e1e1e"
  text-color="#f0f0f0"
  primary-color="#4a9eff"
  nav-bg-color="#252525"
  nav-text-color="#f0f0f0"
  nav-hover-bg-color="#3a3a3a"
  nav-hover-text-color="#ffffff"
  nav-accent-color="#4a9eff"
  render-style="read"
  schema-style="table"
  show-header="true"
  show-info="true"
  allow-authentication="true"
  allow-server-selection="true"
  allow-api-list-style-selection="false"
  allow-try="true"
  persist-auth="true"
  use-path-in-nav-bar="false"
  layout="row"
  sort-tags="false"
  sort-endpoints-by="path"
  heading-text="ECRIN API Documentation"
  goto-path=""
  fill-request-fields-with-example="true"
  response-area-height="400px"
  style="height: 100vh; width: 100%;"
  fetch-credentials="include"
></rapi-doc>
