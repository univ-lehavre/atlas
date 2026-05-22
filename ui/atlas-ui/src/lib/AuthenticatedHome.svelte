<script lang="ts">
  import ProjectsCarousel from "./ProjectsCarousel.svelte";
  import QuestionnairesInvite from "./QuestionnairesInvite.svelte";
  import type { ProjectSnapshotList } from "./types/project-snapshot";
  import type { QuestionnaireEntryList } from "./types/instrument";

  interface Props {
    /** Display name surfaced in the welcome heading — typically the
     *  user's first name once REDCap profile/state is wired ; for now
     *  consumers pass either the email local-part or the raw userId. */
    greetingName?: string;
    /** Projets passés en mode "shuffled, 3 visibles". Consumer-side
     *  load is in charge of randomising the slice across visits. */
    projects: ProjectSnapshotList;
    /** Liste des questionnaires à proposer — typically 4 priority
     *  instruments (researcher_profile, research_questions, publications,
     *  project_proposal). */
    questionnaires: QuestionnaireEntryList;
  }

  let { greetingName, projects, questionnaires }: Props = $props();
</script>

<section class="welcome">
  <h1>
    Bonjour{#if greetingName}
      <span>, {greetingName}</span>
    {/if}
  </h1>
  <p>
    Trois projets de la communauté ont retenu notre attention aujourd'hui —
    laissez-vous inspirer avant de raconter le vôtre.
  </p>
</section>

<ProjectsCarousel {projects} />
<QuestionnairesInvite entries={questionnaires} />

<style>
  .welcome {
    max-width: 48rem;
    margin: 3rem auto 1rem;
    padding: 0 1.5rem;
    text-align: center;
  }
  .welcome h1 {
    margin: 0 0 0.5rem;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    color: #0a2540;
  }
  .welcome h1 span {
    color: #1e3a8a;
  }
  .welcome p {
    margin: 0;
    color: #4b5563;
    font-size: 1.0625rem;
    line-height: 1.5;
  }
</style>
