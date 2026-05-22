<script lang="ts">
  import QuartoProjectCard from "./QuartoProjectCard.svelte";
  import type { ProjectSnapshotList } from "./types/project-snapshot";

  interface Props {
    heading?: string;
    intro?: string;
    /** Pre-shuffled list. Only the first 3 are shown — one per
     *  Bootstrap carousel slide. The carousel auto-rotates every
     *  `intervalMs` (defaults to 6s) via `data-bs-ride`. */
    projects: ProjectSnapshotList;
    /** Auto-rotation interval, in ms. Pass 0 to disable. */
    intervalMs?: number;
    /** DOM id of the carousel root — useful when several carousels
     *  cohabit on the same page (kept distinct for `data-bs-target`). */
    id?: string;
  }

  let {
    heading = "Three projects in focus",
    intro = "A glimpse of the work the community is currently shaping.",
    projects,
    intervalMs = 6000,
    id = "projects-carousel",
  }: Props = $props();

  let visible = $derived(projects.slice(0, 3));
</script>

<section class="carousel-section py-5" aria-label={heading}>
  <div class="container">
    {#if heading}
      <header class="text-center mb-3">
        <h2 class="h4 mb-1 text-white">{heading}</h2>
        {#if intro}
          <p class="text-white-50 m-0 small">{intro}</p>
        {/if}
      </header>
    {/if}

    <div
      {id}
      class="carousel slide carousel-fade mx-auto carousel-wrap"
      data-bs-ride={intervalMs > 0 ? "carousel" : undefined}
      data-bs-interval={intervalMs > 0 ? intervalMs : undefined}
    >
      {#if visible.length > 1}
        <div class="carousel-indicators">
          {#each visible as project, i (project.id)}
            <button
              type="button"
              data-bs-target="#{id}"
              data-bs-slide-to={i}
              class={i === 0 ? "active" : ""}
              aria-current={i === 0 ? "true" : undefined}
              aria-label="Project {i + 1}"
            ></button>
          {/each}
        </div>
      {/if}

      <div class="carousel-inner">
        {#each visible as project, i (project.id)}
          <div class={`carousel-item${i === 0 ? " active" : ""}`}>
            <div class="d-flex justify-content-center px-5">
              <div class="carousel-card">
                <QuartoProjectCard {project} />
              </div>
            </div>
          </div>
        {/each}
      </div>

      {#if visible.length > 1}
        <button
          type="button"
          class="carousel-control-prev"
          data-bs-target="#{id}"
          data-bs-slide="prev"
        >
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button
          type="button"
          class="carousel-control-next"
          data-bs-target="#{id}"
          data-bs-slide="next"
        >
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      {/if}
    </div>
  </div>
</section>

<style>
  /* Fond marine sombre — rythme visuel entre la bande welcome (blanc)
     au-dessus et l'invite questionnaires (bg-light) en-dessous. */
  .carousel-section {
    background: #0a2540;
  }

  /* Le carousel Bootstrap occupe 100% par défaut ; on borne sa largeur
     pour rester cohérent avec la grille AnonymousHome (60rem max), et
     on contraint la card centrée à 24rem pour éviter qu'elle s'étire.
     Padding-bottom : espace pour les indicators sans déborder dans la
     section invitation. */
  .carousel-wrap {
    max-width: 60rem;
    padding-bottom: 2rem;
  }
  .carousel-card {
    width: 100%;
    max-width: 24rem;
  }

  /* Indicators : juste sous la card, pastilles claires sur fond marine. */
  .carousel-indicators {
    bottom: 0;
    margin: 0;
  }
  .carousel-indicators :global(button) {
    background-color: rgba(255, 255, 255, 0.8);
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: none;
  }

  /* Flèches Bootstrap : déjà blanches par défaut, on retire le filter
     d'inversion du précédent rendu (fond clair → fond sombre). */
  .carousel-control-prev,
  .carousel-control-next {
    width: 3rem;
    align-self: center;
    height: 100%;
  }
</style>
