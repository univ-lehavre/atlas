<script lang="ts">
  import type { Snippet } from "svelte";
  import { applyTheme, type AtlasUiTheme } from "./index";

  interface Props {
    /** Partial set of token overrides. Omitted tokens fall back to the
     *  package defaults, so the rendering stays unchanged for an empty
     *  theme. */
    theme?: Partial<AtlasUiTheme>;
    /** Content scoped to the theme overrides. */
    children: Snippet;
  }

  let { theme = {}, children }: Props = $props();

  // Inline custom-property declarations are scoped to this wrapper's
  // subtree — purely additive, no global side effect.
  let style = $derived(applyTheme(theme));
</script>

<div class="atlas-ui-theme" {style}>
  {@render children()}
</div>

<style>
  /* The wrapper must not introduce layout of its own — it only carries
     the CSS custom properties for the subtree. */
  .atlas-ui-theme {
    display: contents;
  }
</style>
