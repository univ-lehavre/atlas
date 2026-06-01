<script lang="ts">
  // Story-only showcase. Wraps a couple of token-consuming components in
  // a `ThemeProvider` so reviewers can see how a partial theme cascades.
  // Not exported from the package barrel — it exists purely for the
  // Storybook "Theming" entry.
  import CardItem from "../lib/CardItem.svelte";
  import SectionTile from "../lib/SectionTile.svelte";
  import ThemeProvider from "./ThemeProvider.svelte";
  import type { AtlasUiTheme } from "./index";

  interface Props {
    theme?: Partial<AtlasUiTheme>;
  }

  let { theme = {} }: Props = $props();
</script>

<ThemeProvider {theme}>
  <div class="d-flex flex-column gap-3 p-3">
    <SectionTile title="Section themable" />

    <CardItem>
      {#snippet title()}
        Titre de carte
      {/snippet}
      {#snippet description()}
        La police du titre et la largeur suivent les tokens
        <code>--atlas-ui-font-heading</code> et
        <code>--atlas-ui-card-width</code>.
      {/snippet}
    </CardItem>

    <button type="button" class="discover-tile p-3 border-0 text-start">
      Tuile « découvrir » — couleurs de marque themables
    </button>
  </div>
</ThemeProvider>

<style>
  /* Mirrors AnonymousHome's `.discover-tile` so the brand-colour tokens
     are visible in isolation. */
  .discover-tile {
    background: var(--atlas-ui-color-primary, #0a2540);
    color: var(--atlas-ui-color-on-primary, white);
    border-radius: var(--atlas-ui-radius, 0.75rem);
    transition: background 150ms ease-in-out;
  }
  .discover-tile:hover,
  .discover-tile:focus-visible {
    background: var(--atlas-ui-color-primary-hover, #1e3a8a);
    color: var(--atlas-ui-color-on-primary, white);
  }
</style>
