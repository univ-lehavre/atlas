<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cardLayout } from '$lib/stores/layout';

  interface Props {
    title?: string;
    description?: string;
    imageSrc?: string | null;
    imageAlt?: string;
    width?: string; // e.g. '18rem'
    horizontalWidth?: string; // largeur en layout horizontal
    bodyExtra?: Snippet; // contenu additionnel dans .card-body après la description
    footer?: Snippet; // contenu après le body (ex: list-group)
    actions?: Snippet; // icônes/boutons alignés dans le body, après la description
    layout?: 'vertical' | 'horizontal'; // disposition de la carte
  }

  let {
    title = undefined,
    description = undefined,
    imageSrc = null,
    imageAlt = '',
    width = '18rem',
    bodyExtra = undefined,
    footer = undefined,
    actions = undefined,
    layout = undefined,
  }: Props = $props();
</script>

{#if (layout ?? $cardLayout) === 'vertical'}
  <div class="card" style={`width: var(--card-width, ${width})`}>
    {#if imageSrc}
      <img src={imageSrc} class="card-img-top" alt={imageAlt} />
    {/if}

    <div class="card-body">
      {#if title}
        <div class="card-title fw-bolder fs-4" style="font-family: Gambetta;">
          {title}
        </div>
      {/if}
      {#if description}
        <p class="card-text fw-light" style="font-family: Gambetta;">
          {description}
        </p>
      {/if}
      {#if actions}
        <div class="d-flex align-items-center gap-2 mt-2">
          {@render actions?.()}
        </div>
      {/if}
      {@render bodyExtra?.()}
    </div>

    {@render footer?.()}
  </div>
{:else}
  <!-- Disposition horizontale: image | body + footer | actions -->
  <div
    class="card card-horizontal"
    style={`width: var(--card-horizontal-width, ${imageSrc ? '24rem' : '18rem'})`}
  >
    <div class="d-flex columns">
      {#if imageSrc}
        <div class="image-wrapper">
          <img src={imageSrc} alt={imageAlt} />
        </div>
      {/if}
      <div class="flex-grow-1 d-flex flex-column content-col">
        <div class="card-body flex-grow-0">
          {#if title}
            <div class="card-title fw-bolder fs-4" style="font-family: Gambetta;">
              {title}
            </div>
          {/if}
          {#if description}
            <p class="card-text fw-light" style="font-family: Gambetta;">
              {description}
            </p>
          {/if}
          {#if actions}
            <div class="d-flex align-items-center gap-2 mt-2">
              {@render actions?.()}
            </div>
          {/if}
          {@render bodyExtra?.()}
        </div>
        {@render footer?.()}
      </div>
    </div>
  </div>
{/if}

<style>
  .card-horizontal .image-wrapper {
    flex: 0 0 var(--card-image-width, 6rem);
    align-self: stretch;
    padding: 0;
  }
  .card-horizontal .image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .card-horizontal .card-body {
    padding: 0.75rem;
  }
  .card-horizontal .card-title {
    margin-bottom: 0.25rem;
  }
  .card-horizontal .card-text {
    margin-bottom: 0.5rem;
  }
  .card-horizontal .columns {
    gap: var(--card-columns-gap, 0.75rem);
    align-items: stretch; /* permet aux colonnes (dont image) d'occuper toute la hauteur */
  }
  .card-horizontal .content-col {
    min-width: 0;
    flex: 0 1 auto; /* ne pas étendre la carte, s'adapte au contenu */
  }
  /* align-self non nécessaire, on force l'étirement via align-items: stretch */
  @media (max-width: 768px) {
    .card-horizontal .image-wrapper {
      flex: 0 0 var(--card-image-width-sm, 6rem);
    }
  }
</style>
