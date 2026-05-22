<script lang="ts">
  import type { ProjectSnapshot } from "./types/project-snapshot";

  interface Props {
    project: ProjectSnapshot;
  }

  let { project }: Props = $props();

  // Deterministic colour stripe derived from the project id, mirroring
  // the way Quarto themes vary the title accent between reports.
  let accentHue = $derived(
    Array.from(project.id).reduce(
      (acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360,
      0,
    ),
  );
</script>

<article class="card" style="--accent-hue: {accentHue};">
  <header>
    {#if project.coverUrl}
      <img class="cover" src={project.coverUrl} alt="" loading="lazy" />
    {:else}
      <div class="cover cover-gradient" aria-hidden="true"></div>
    {/if}
    <time class="date" datetime={project.date}>
      {new Date(project.date).getFullYear()}
    </time>
  </header>

  <div class="body">
    <h3 class="title">{project.title}</h3>
    <p class="lead">{project.lead}</p>
    <p class="abstract">{project.abstract}</p>
    <ul class="tags" aria-label="Disciplines">
      {#each project.tags as tag (tag)}
        <li>{tag}</li>
      {/each}
    </ul>
    <a class="cta" href={project.href}>Lire l'analyse →</a>
  </div>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition:
      transform 200ms ease-in-out,
      box-shadow 200ms ease-in-out;
    height: 100%;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(10, 37, 64, 0.12);
  }
  header {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }
  .cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cover-gradient {
    background: linear-gradient(
      135deg,
      hsl(var(--accent-hue), 60%, 35%) 0%,
      hsl(calc(var(--accent-hue) + 40), 55%, 50%) 100%
    );
  }
  .date {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    letter-spacing: 0.04em;
  }
  .body {
    padding: 1rem 1.25rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }
  .title {
    margin: 0;
    font-size: 1.125rem;
    color: #0a2540;
    line-height: 1.3;
    border-left: 3px solid hsl(var(--accent-hue), 60%, 45%);
    padding-left: 0.625rem;
  }
  .lead {
    margin: 0;
    font-size: 0.9375rem;
    color: #1f2937;
    font-style: italic;
  }
  .abstract {
    margin: 0;
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.5;
  }
  .tags {
    list-style: none;
    padding: 0;
    margin: 0.25rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .tags li {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: #f3f4f6;
    color: #4b5563;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }
  .cta {
    margin-top: auto;
    padding-top: 0.5rem;
    color: #0a2540;
    font-weight: 600;
    font-size: 0.9375rem;
    text-decoration: none;
  }
  .cta:hover,
  .cta:focus-visible {
    color: #1e3a8a;
    text-decoration: underline;
  }
</style>
