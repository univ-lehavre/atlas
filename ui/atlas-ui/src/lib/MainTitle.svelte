<script lang="ts">
  interface Props {
    /** Asset URL of the brand logo. Owned by the consumer app. */
    logoSrc: string;
    /** Alt-text + brand name, used for screen-reader accessibility. */
    logoAlt: string;
    /** Home URL the logo links to. The consumer resolves it via
     *  `$app/paths` (`resolve('/')`) ; we accept a string so the
     *  component stays SvelteKit-agnostic. */
    homeUrl: string;
    /** Localised label for the home-link wrapper. Defaults to "Accueil". */
    homeLabel?: string;
  }
  let { logoSrc, logoAlt, homeUrl, homeLabel = "Accueil" }: Props = $props();
</script>

<div class="container-fluid d-flex justify-content-center bg-white py-3">
  <a href={homeUrl} aria-label={homeLabel}>
    <img
      src={logoSrc}
      alt={logoAlt}
      class="img-fluid"
      style="max-height:8rem;"
    />
  </a>
</div>
