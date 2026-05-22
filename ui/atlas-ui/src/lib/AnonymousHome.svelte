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

  // The 8 IDs currently on screen. Initial selection takes the first 8
  // entries of the pool — `+page.server.ts` on the consumer side is
  // expected to shuffle the pool before passing it in, so this still
  // yields a different layout per page load.
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
    return () => clearInterval(timer);
  });
</script>

<section class="portraits" aria-label="Aperçu de la communauté">
  <ul class="grid">
    {#each visible as researcher, i (i)}
      {#if i === 4}
        <li class="tile discover">
          {#if onSignupClick}
            <button type="button" onclick={onSignupClick}>
              <span class="discover-label">Meet the community</span>
              <span class="discover-sub"
                >Researchers shaping coastal studies</span
              >
            </button>
          {:else}
            <a href={signupUrl}>
              <span class="discover-label">Meet the community</span>
              <span class="discover-sub"
                >Researchers shaping coastal studies</span
              >
            </a>
          {/if}
        </li>
      {/if}
      <li class="tile portrait">
        {#key researcher.id}
          <figure in:fade={{ duration: 400 }}>
            <img
              src={researcher.photoUrl}
              alt="Portrait de {researcher.fullName}"
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <strong>{researcher.fullName}</strong>
              <span>{researcher.bio}</span>
            </figcaption>
          </figure>
        {/key}
      </li>
    {/each}
    {#if visible.length <= 4}
      <li class="tile discover">
        {#if onSignupClick}
          <button type="button" onclick={onSignupClick}>
            <span class="discover-label">Meet the community</span>
            <span class="discover-sub">Researchers shaping coastal studies</span
            >
          </button>
        {:else}
          <a href={signupUrl}>
            <span class="discover-label">Meet the community</span>
            <span class="discover-sub">Researchers shaping coastal studies</span
            >
          </a>
        {/if}
      </li>
    {/if}
  </ul>
</section>

<style>
  .portraits {
    padding: 2rem 1.5rem;
  }
  .grid {
    list-style: none;
    padding: 0;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    max-width: 60rem;
  }
  .tile {
    aspect-ratio: 1 / 1;
    border-radius: 0.75rem;
    overflow: hidden;
    position: relative;
  }
  .portrait figure {
    margin: 0;
    height: 100%;
    position: absolute;
    inset: 0;
  }
  .portrait img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .portrait figcaption {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 30%,
      rgba(0, 0, 0, 0.85) 100%
    );
    color: white;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
  }
  .portrait:hover figcaption,
  .portrait:focus-within figcaption {
    opacity: 1;
  }
  .portrait figcaption strong {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }
  .portrait figcaption span {
    font-size: 0.875rem;
    line-height: 1.4;
  }
  .discover a,
  .discover button {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: #0a2540;
    color: white;
    text-decoration: none;
    padding: 1rem;
    box-sizing: border-box;
    transition: background 150ms ease-in-out;
    border: none;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    width: 100%;
  }
  .discover a:hover,
  .discover a:focus-visible,
  .discover button:hover,
  .discover button:focus-visible {
    background: #1e3a8a;
  }
  .discover-label,
  .discover-sub {
    display: block;
    max-width: 100%;
  }
  .discover-label {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .discover-sub {
    font-size: 1.0625rem;
    line-height: 1.35;
    margin-top: 0.5rem;
  }
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
