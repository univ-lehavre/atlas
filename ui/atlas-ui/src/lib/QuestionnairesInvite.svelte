<script lang="ts">
  import type { QuestionnaireEntryList } from "./types/instrument";

  interface Props {
    /** Heading rendered above the cards. */
    heading?: string;
    /** Intro paragraph under the heading. */
    intro?: string;
    /** Cards to render — typically 4 priority instruments. The component
     *  does not assume any specific count, only that there is at least
     *  one. */
    entries: QuestionnaireEntryList;
  }

  let {
    heading = "Et vos déclarations ?",
    intro = "Renseignez vos questionnaires pour intégrer la cartographie de la communauté.",
    entries,
  }: Props = $props();
</script>

<section class="invite" aria-label={heading}>
  <header class="head">
    <h2>{heading}</h2>
    <p>{intro}</p>
  </header>
  <ul class="grid">
    {#each entries as entry (entry.id)}
      <li class="card" class:disabled={entry.disabled}>
        {#if entry.disabled}
          <span class="label">{entry.label}</span>
          <span class="description">{entry.description}</span>
          <span class="cta-disabled">Bientôt disponible</span>
        {:else}
          <a href={entry.href}>
            <span class="label">{entry.label}</span>
            <span class="description">{entry.description}</span>
            <span class="cta">Compléter →</span>
          </a>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .invite {
    padding: 2.5rem 1.5rem;
    background: #f9fafb;
  }
  .head {
    max-width: 60rem;
    margin: 0 auto 1.5rem;
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
    list-style: none;
    padding: 0;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem;
    max-width: 60rem;
  }
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  .card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition:
      transform 150ms ease-in-out,
      box-shadow 150ms ease-in-out;
  }
  .card:not(.disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(10, 37, 64, 0.1);
  }
  .card a,
  .card > span {
    display: block;
    padding: 1rem 1.25rem;
    color: inherit;
    text-decoration: none;
  }
  .card a {
    color: #0a2540;
  }
  .label {
    display: block;
    font-weight: 700;
    font-size: 1.0625rem;
    margin-bottom: 0.25rem;
  }
  .description {
    display: block;
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.45;
    margin-bottom: 0.5rem;
  }
  .cta {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e3a8a;
  }
  .cta-disabled {
    display: block;
    font-size: 0.8125rem;
    color: #9ca3af;
    font-style: italic;
  }
  .card.disabled {
    opacity: 0.65;
  }
</style>
