<script lang="ts">
  import ProjectsCarousel from "./ProjectsCarousel.svelte";
  import QuestionnairesInvite from "./QuestionnairesInvite.svelte";
  import type { ProjectSnapshotList } from "./types/project-snapshot";
  import type { QuestionnaireEntryList } from "./types/instrument";

  interface Props {
    greetingName?: string | undefined;
    projects: ProjectSnapshotList;
    questionnaires: QuestionnaireEntryList;
  }

  let { greetingName, projects, questionnaires }: Props = $props();
</script>

<section class="container py-5 text-center welcome">
  <h1 class="display-5 mb-2 text-primary-emphasis">
    Welcome{#if greetingName}
      <span class="text-primary">, {greetingName}</span>
    {/if}
  </h1>
  <p class="lead text-body-secondary m-0 mx-auto">
    Three community projects caught our eye today — be inspired before sharing
    your own.
  </p>
</section>

<ProjectsCarousel {projects} />
<QuestionnairesInvite entries={questionnaires} />

<style>
  .welcome {
    max-width: 48rem;
  }
  .welcome .lead {
    max-width: 36rem;
  }
</style>
