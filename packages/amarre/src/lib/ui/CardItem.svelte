<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    imageSrc?: string | null;
    imageAlt?: string;
    width?: string;
    title?: Snippet;
    description?: Snippet;
    bodyExtra?: Snippet;
    actions?: Snippet;
    links?: Snippet;
    footer?: Snippet;
  }

  let {
    title = undefined,
    description = undefined,
    imageSrc = null,
    imageAlt = '',
    width = '18rem',
    bodyExtra = undefined,
    actions = undefined,
    links = undefined,
    footer = undefined,
  }: Props = $props();
</script>

<div class="card h-100" style={`width: var(--card-width, ${width})`}>
  {#if imageSrc}
    <img src={imageSrc} class="card-img-top" alt={imageAlt} />
  {/if}

  {#if title || description || bodyExtra}
    <div class="card-body">
      {#if title}
        <div class="card-title fw-bolder fs-4" style="font-family: Gambetta;">
          {@render title?.()}
        </div>
      {/if}
      {#if description}
        <div class="card-text fw-light" style="font-family: Gambetta;">
          {@render description?.()}
        </div>
      {/if}
      {@render bodyExtra?.()}
    </div>
  {/if}

  {#if actions}
    <div class="list-group list-group-flush">
      {@render actions?.()}
    </div>
  {/if}

  {#if links}
    <div class="card-body">
      {@render links?.()}
    </div>
  {/if}

  {#if footer}
    <div class="card-footer">
      {@render footer?.()}
    </div>
  {/if}
</div>
