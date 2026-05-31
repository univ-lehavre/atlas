<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import type { AnonymousResearcherList } from "./types/anonymous-researcher";

  interface Props {
    /** Destination of the central "Meet the community" tile when no
     *  `onSignupClick` callback is provided. Always rendered as the
     *  `href` so the tile remains a real link for non-JS visitors. */
    signupUrl: string;
    /** Pool of researchers eligible for public display. The component
     *  shows 8 at a time in a 3×3 grid (centre slot is the "Discover
     *  more" tile) ; if the pool has more than 8 entries, one slot is
     *  swapped every `rotationIntervalMs` milliseconds to give the
     *  page a sense of life. Consumers are responsible for filtering
     *  the pool against the consent matrix before passing it in. */
    researchers: AnonymousResearcherList;
    /** How often (ms) to swap one portrait when the pool exceeds 8.
     *  Pass 0 (or keep the pool ≤ 8) to disable rotation. */
    rotationIntervalMs?: number;
    /** Optional click handler on the central tile. When provided, the
     *  tile renders as a `<button>` and the navigation never happens
     *  (typically used to open a signup modal). Without it, the tile
     *  falls back to a real `<a href={signupUrl}>` so visitors with
     *  JS disabled still reach the signup page. */
    onSignupClick?: () => void;
  }

  let {
    signupUrl,
    researchers,
    rotationIntervalMs = 5000,
    onSignupClick,
  }: Props = $props();

  let visibleIds = $state<string[]>(researchers.slice(0, 8).map((r) => r.id));

  let byId = $derived(new Map(researchers.map((r) => [r.id, r])));
  let visible = $derived(
    visibleIds
      .map((id) => byId.get(id))
      .filter((r): r is (typeof researchers)[number] => r !== undefined),
  );

  onMount(() => {
    if (rotationIntervalMs <= 0 || researchers.length <= 8) return;
    const timer = setInterval(() => {
      const offPool = researchers
        .map((r) => r.id)
        .filter((id) => !visibleIds.includes(id));
      if (offPool.length === 0) return;
      const slotIdx = Math.floor(Math.random() * visibleIds.length);
      const nextId = offPool[Math.floor(Math.random() * offPool.length)];
      if (nextId === undefined) return;
      visibleIds = visibleIds.map((id, i) => (i === slotIdx ? nextId : id));
    }, rotationIntervalMs);
    return () => {
      clearInterval(timer);
    };
  });
</script>

<section class="container py-4" aria-label="Community preview">
  <div class="row row-cols-2 row-cols-md-3 g-3 mx-auto trombi-grid">
    {#each visible as researcher, i (i)}
      {#if i === 4}
        <div class="col">
          <div class="ratio ratio-1x1">
            {#if onSignupClick}
              <button
                type="button"
                class="btn discover-tile w-100 h-100 d-flex flex-column justify-content-center align-items-center"
                onclick={onSignupClick}
              >
                <span class="fw-bold fs-4">Meet the community</span>
                <span class="small mt-1 opacity-75">
                  Researchers shaping coastal studies
                </span>
              </button>
            {:else}
              <a
                class="btn discover-tile w-100 h-100 d-flex flex-column justify-content-center align-items-center"
                href={signupUrl}
              >
                <span class="fw-bold fs-4">Meet the community</span>
                <span class="small mt-1 opacity-75">
                  Researchers shaping coastal studies
                </span>
              </a>
            {/if}
          </div>
        </div>
      {/if}
      <div class="col">
        {#key researcher.id}
          <figure
            class="ratio ratio-1x1 portrait-tile mb-0 rounded-3 overflow-hidden position-relative"
            in:fade={{ duration: 400 }}
          >
            <img
              src={researcher.photoUrl}
              alt="Portrait of {researcher.fullName}"
              class="w-100 h-100 object-fit-cover"
              loading="lazy"
              decoding="async"
            />
            <figcaption
              class="portrait-caption position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end p-3 text-white"
            >
              <strong>{researcher.fullName}</strong>
              <span class="small lh-sm">{researcher.bio}</span>
            </figcaption>
          </figure>
        {/key}
      </div>
    {/each}
    {#if visible.length <= 4}
      <div class="col">
        <div class="ratio ratio-1x1">
          {#if onSignupClick}
            <button
              type="button"
              class="btn discover-tile w-100 h-100 d-flex flex-column justify-content-center align-items-center"
              onclick={onSignupClick}
            >
              <span class="fw-bold fs-4">Meet the community</span>
              <span class="small mt-1 opacity-75">
                Researchers shaping coastal studies
              </span>
            </button>
          {:else}
            <a
              class="btn discover-tile w-100 h-100 d-flex flex-column justify-content-center align-items-center"
              href={signupUrl}
            >
              <span class="fw-bold fs-4">Meet the community</span>
              <span class="small mt-1 opacity-75">
                Researchers shaping coastal studies
              </span>
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  /* Bootstrap fournit la grille (`row row-cols-*`), le ratio carré
     (`ratio ratio-1x1`) et le bouton/lien (`btn`). Le code custom ci-
     dessous couvre uniquement ce que Bootstrap ne propose pas natif :
     l'effet hover sur l'overlay portrait, le fond marine du tile
     central et la transition. */

  .trombi-grid {
    max-width: 60rem;
  }

  .portrait-tile :global(img) {
    /* Force le cover sur les anciennes versions Bootstrap qui ne
       diffusent pas `object-fit-cover` (utility 5.2+) — defensive. */
    object-fit: cover;
  }

  .portrait-caption {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 30%,
      rgba(0, 0, 0, 0.85) 100%
    );
    opacity: 0;
    transition: opacity 200ms ease-in-out;
  }
  .portrait-tile:hover .portrait-caption,
  .portrait-tile:focus-within .portrait-caption {
    opacity: 1;
  }

  .discover-tile {
    background: #0a2540;
    color: white;
    border: none;
    border-radius: 0.75rem;
    transition: background 150ms ease-in-out;
  }
  .discover-tile:hover,
  .discover-tile:focus-visible {
    background: #1e3a8a;
    color: white;
  }
</style>
