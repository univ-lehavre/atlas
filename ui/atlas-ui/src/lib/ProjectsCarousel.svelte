<script lang="ts">
  import QuartoProjectCard from "./QuartoProjectCard.svelte";
  import type { ProjectSnapshotList } from "./types/project-snapshot";

  interface Props {
    heading?: string;
    intro?: string;
    projects: ProjectSnapshotList;
  }

  let {
    heading = "Trois projets en cours",
    intro = "Découvrez quelques travaux portés par la communauté.",
    projects,
  }: Props = $props();

  let visible = $derived(projects.slice(0, 3));
</script>

<section class="container py-4" aria-label={heading}>
  {#if heading}
    <header class="text-center mb-3">
      <h2 class="h4 mb-1 text-primary-emphasis">{heading}</h2>
      {#if intro}
        <p class="text-secondary m-0 small">{intro}</p>
      {/if}
    </header>
  {/if}
  <div class="row row-cols-1 row-cols-md-3 g-3 mx-auto carousel-grid">
    {#each visible as project (project.id)}
      <div class="col">
        <QuartoProjectCard {project} />
      </div>
    {/each}
  </div>
</section>

<style>
  .carousel-grid {
    max-width: 60rem;
  }
</style>
