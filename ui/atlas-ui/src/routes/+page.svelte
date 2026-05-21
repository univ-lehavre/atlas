<script lang="ts">
  // Minimal landing page. The real preview lives in Storybook (port 6006).
  // Keeping a SvelteKit app shell so component imports like
  // `$app/forms` and `$app/paths` resolve identically here and downstream
  // in apps/amarre.
</script>

<main class="container py-5">
  <h1 class="display-5">@univ-lehavre/atlas-ui</h1>
  <p class="lead">Composants Svelte partagés du monorepo Atlas.</p>
  <p>
    Pour la galerie des composants : <code
      >pnpm -F @univ-lehavre/atlas-ui storybook</code
    >
  </p>
</main>
