<script lang="ts">
  import { onMount } from 'svelte';

  import type { Snippet } from 'svelte';

  interface Props {
    ariaLabel?: string;
    step?: number; // pixels; si non fourni, ~80% de la largeur visible
    children?: Snippet;
    snap?: 'none' | 'start' | 'center';
    snapPadding?: string; // ex: '1rem', '24px'
    headingText?: string; // titre à afficher en <h1> quand la tuile-titre disparaît
    headingRatio?: number; // ratio de visibilité sous lequel on affiche le header (0..1)
    showHeading?: boolean; // bindable: reflète l'état d'affichage du header
  }
  let {
    ariaLabel = 'Horizontal scroller',
    step,
    children,
    snap = 'start',
    snapPadding = '1rem',
    headingText,
    headingRatio = 0.85,
    showHeading = $bindable(false),
  }: Props = $props();

  let scroller: HTMLDivElement;
  let items: HTMLDivElement;
  let showLeft = $state(false);
  let showRight = $state(false);

  const updateArrows = () => {
    if (!scroller) return;
    const { scrollLeft, clientWidth, scrollWidth } = scroller;
    showLeft = scrollLeft > 0;
    showRight = scrollLeft + clientWidth < scrollWidth - 1;
  };

  const scrollStep = (dir: number) => {
    if (!scroller) return;
    const px = step ?? Math.max(1, Math.floor(scroller.clientWidth * 0.8));
    scroller.scrollBy({ left: dir * px, behavior: 'smooth' });
  };

  onMount(() => {
    updateArrows();
    const ro = new ResizeObserver(() => updateArrows());
    if (scroller) ro.observe(scroller);
    // Observer pour la tuile-titre (on prend le premier item comme SectionTile)
    let io: IntersectionObserver | undefined;
    if (headingText) {
      const threshold = Array.from({ length: 101 }, (_, i) => i / 100);
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          const ratio = e.intersectionRatio ?? 0;
          showHeading = ratio < headingRatio;
        },
        { root: scroller, threshold }
      );
      const target = items?.firstElementChild as Element | null;
      if (target) io.observe(target);
    }
    return () => {
      ro.disconnect();
      io?.disconnect();
    };
  });
</script>

{#if headingText && showHeading}
  <div class="fw-bolder fs-3 mb-2" style="font-family: Gambetta;">
    {headingText}
  </div>
{/if}

<div class="position-relative hs-root">
  <div
    class={`overflow-auto ${snap !== 'none' ? 'snap-x' : ''}`}
    style={`scroll-padding-inline: ${snapPadding}`}
    aria-label={ariaLabel}
    bind:this={scroller}
    onscroll={updateArrows}
  >
    <div
      class={`d-flex flex-column flex-sm-row flex-sm-nowrap pe-3 py-1 ${snap !== 'none' ? 'snap-items' : ''}`}
      style={(snap !== 'none' ? `--snap-align: ${snap}; ` : '') + `gap: var(--card-gap, 1rem);`}
      bind:this={items}
    >
      {@render children?.()}
    </div>
  </div>

  {#if showLeft || showRight}
    <div
      class="position-absolute top-50 end-0 translate-middle-y pe-2 d-flex flex-column align-items-end hs-arrows d-none d-sm-flex"
      style="z-index: 2;"
    >
      {#if showLeft}
        <button
          class="btn btn-light btn-sm shadow mb-2"
          aria-label="Scroll left"
          onclick={() => scrollStep(-1)}
        >
          <i class="bi bi-chevron-left"></i>
        </button>
      {/if}
      {#if showRight}
        <button
          class="btn btn-light btn-sm shadow"
          aria-label="Scroll right"
          onclick={() => scrollStep(1)}
        >
          <i class="bi bi-chevron-right"></i>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Les enfants attendus: items avec .flex-shrink-0 (cartes de 18rem) */
  .snap-x {
    scroll-snap-type: x mandatory;
  }
  .snap-items > * {
    scroll-snap-align: var(--snap-align, start);
  }
  /* Responsive: sous sm, empilement vertical et largeur fluide des cartes */
  @media (max-width: 575.98px) {
    .hs-root {
      --card-width: 100%;
      --card-gap: 0.75rem;
    }
    .hs-root .snap-x {
      scroll-snap-type: none;
    }
  }
</style>
