<script lang="ts">
  import type { QuestionnaireEntryList } from "./types/instrument";

  interface Props {
    heading?: string;
    intro?: string;
    entries: QuestionnaireEntryList;
  }

  let {
    heading = "Your contribution",
    intro = "Fill in your questionnaires to take your place on the community map.",
    entries,
  }: Props = $props();
</script>

<section class="bg-light py-5" aria-label={heading}>
  <div class="container">
    <header class="text-center mb-4">
      <h2 class="h4 mb-1 text-primary-emphasis">{heading}</h2>
      <p class="text-body-secondary m-0 small">{intro}</p>
    </header>
    <ul class="row row-cols-1 row-cols-md-2 g-3 list-unstyled m-0 invite-grid">
      {#each entries as entry (entry.id)}
        <li class="col">
          {#if entry.disabled}
            <!-- `bg-body-secondary` plutôt que `opacity-75` pour signifier l'état
                 « à venir » : l'opacité réduisait le contraste du texte sous le
                 seuil WCAG AA (axe `color-contrast`) ; un fond grisé garde le
                 texte lisible tout en distinguant la carte désactivée. -->
            <div class="card h-100 shadow-sm bg-body-secondary">
              <div class="card-body">
                <h3 class="card-title h6 fw-bold">{entry.label}</h3>
                <p class="card-text small text-body-secondary">
                  {entry.description}
                </p>
                <p class="card-text small fst-italic text-body-secondary m-0">
                  Coming soon
                </p>
              </div>
            </div>
          {:else}
            <a
              class="card h-100 shadow-sm text-decoration-none text-reset invite-link"
              href={entry.href}
            >
              <div class="card-body">
                <h3 class="card-title h6 fw-bold">{entry.label}</h3>
                <p class="card-text small text-body-secondary">
                  {entry.description}
                </p>
                <p
                  class="card-text small fw-semibold text-primary-emphasis m-0"
                >
                  Fill in →
                </p>
              </div>
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .invite-grid {
    max-width: 60rem;
    margin-left: auto;
    margin-right: auto;
  }
  .invite-link {
    transition:
      transform 150ms ease-in-out,
      box-shadow 150ms ease-in-out;
  }
  .invite-link:hover,
  .invite-link:focus-visible {
    transform: translateY(-1px);
  }
</style>
