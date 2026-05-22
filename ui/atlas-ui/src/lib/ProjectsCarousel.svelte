<script lang="ts">
  import QuartoProjectCard from "./QuartoProjectCard.svelte";
  import type { ProjectSnapshotList } from "./types/project-snapshot";

  interface Props {
    /** Heading rendered above the cards. Pass an empty string to hide. */
    heading?: string;
    /** Optional intro paragraph under the heading. */
    intro?: string;
    /** Pre-shuffled list of projects from the consumer. The component
     *  renders the first 3 ; the consumer (server-side load) is in
     *  charge of randomising the slice across visits. */
    projects: ProjectSnapshotList;
  }

  let {
    heading = "Trois projets en cours",
    intro = "Découvrez quelques travaux portés par la communauté.",
    projects,
  }: Props = $props();

  let visible = $derived(projects.slice(0, 3));
</script>

<section class="carousel" aria-label={heading}>
  {#if heading}
    <header class="head">
      <h2>{heading}</h2>
      {#if intro}
        <p>{intro}</p>
      {/if}
    </header>
  {/if}
  <div class="grid">
    {#each visible as project (project.id)}
      <QuartoProjectCard {project} />
    {/each}
  </div>
</section>

<style>
  .carousel {
    padding: 1.5rem;
  }
  .head {
    max-width: 60rem;
    margin: 0 auto 1.25rem;
    text-align: center;
  }
  .head h2 {
    margin: 0 0 0.25rem;
    font-size: 1.5rem;
    color: #0a2540;
  }
  .head p {
    margin: 0;
    color: #4b5563;
    font-size: 0.9375rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    max-width: 60rem;
    margin: 0 auto;
  }
  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
