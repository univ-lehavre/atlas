<script lang="ts">
  import type { ProjectSnapshot } from "./types/project-snapshot";

  interface Props {
    project: ProjectSnapshot;
  }

  let { project }: Props = $props();

  let accentHue = $derived(
    Array.from(project.id).reduce(
      (acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360,
      0,
    ),
  );
</script>

<article
  class="card h-100 shadow-sm project-card"
  style="--accent-hue: {accentHue};"
>
  <div class="ratio ratio-16x9 position-relative card-cover">
    {#if project.coverUrl}
      <img
        class="object-fit-cover"
        src={project.coverUrl}
        alt=""
        loading="lazy"
      />
    {:else}
      <div class="cover-gradient" aria-hidden="true"></div>
    {/if}
    <time
      class="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75 text-uppercase"
      datetime={project.date}
    >
      {new Date(project.date).getFullYear()}
    </time>
  </div>

  <div class="card-body d-flex flex-column gap-2">
    <h3 class="card-title h6 m-0 ps-2 border-start border-3 title-accent">
      {project.title}
    </h3>
    <p class="card-subtitle fst-italic text-body small m-0">{project.lead}</p>
    <p class="card-text text-secondary small m-0">{project.abstract}</p>
    <ul
      class="list-unstyled d-flex flex-wrap gap-1 m-0 mt-1"
      aria-label="Disciplines"
    >
      {#each project.tags as tag (tag)}
        <li>
          <span class="badge bg-light text-secondary text-uppercase fw-normal">
            {tag}
          </span>
        </li>
      {/each}
    </ul>
    <a
      class="mt-auto pt-2 text-primary-emphasis fw-semibold text-decoration-none"
      href={project.href}
    >
      Read the full report →
    </a>
  </div>
</article>

<style>
  .project-card {
    transition:
      transform 200ms ease-in-out,
      box-shadow 200ms ease-in-out;
  }
  .project-card:hover {
    transform: translateY(-2px);
  }
  .title-accent {
    border-color: hsl(var(--accent-hue), 60%, 45%) !important;
  }
  .cover-gradient {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      hsl(var(--accent-hue), 60%, 35%) 0%,
      hsl(calc(var(--accent-hue) + 40), 55%, 50%) 100%
    );
  }
</style>
