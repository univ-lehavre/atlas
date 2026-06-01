<script lang="ts">
  import Signup from "./Signup.svelte";
  import HorizontalScroller from "./HorizontalScroller.svelte";
  import SectionTile from "./SectionTile.svelte";
  import CardItem from "./CardItem.svelte";

  interface Props {
    userId: string | undefined;
    email: string | null | undefined;
    form: unknown;
    /** Resolved URL of the "download my data" endpoint in the consumer app. */
    downloadUrl: string;
    /** Background variant — owned by the parent page so alternation
     *  stays correct even when conditional sections are missing. */
    variant?: "light" | "dark";
  }
  let { userId, email, form, downloadUrl, variant = "dark" }: Props = $props();
  let showHeading = $state(false);
</script>

<Signup {form} />

<div id="administrate">
  <HorizontalScroller
    ariaLabel="Administrate cards"
    headingText="Administrate"
    bind:showHeading
    {variant}
  >
    <SectionTile title={showHeading ? "" : "Administrer"} />

    <div class="flex-shrink-0">
      <CardItem>
        {#snippet title()}
          Mon compte
        {/snippet}
        {#snippet description()}
          {#if email}
            Je suis connecté avec le compte <i>{email}</i>
          {:else}
            Je ne suis pas authentifié.
          {/if}
        {/snippet}
        {#snippet actions()}
          <button
            type="button"
            class="list-group-item list-group-item-action list-group-item-primary {userId
              ? 'disabled'
              : ''}"
            data-bs-toggle="modal"
            data-bs-target="#SignUp"
          >
            <div class="d-flex flex-row">
              <i class="bi bi-box-arrow-in-right me-2"></i>
              <div
                class="list-group list-group-flush fw-light"
                style="font-family: var(--atlas-ui-font-heading, Gambetta);"
              >
                S'authentifier
              </div>
            </div>
          </button>
          <form method="post" action="?/logout">
            <button
              type="submit"
              class="list-group-item list-group-item-action {userId
                ? 'list-group-item-secondary'
                : ''} {userId ? '' : 'disabled'}"
            >
              <div class="d-flex flex-row">
                <i class="bi bi-box-arrow-right me-2"></i>
                <div
                  class="list-group list-group-flush fw-light"
                  style="font-family: var(--atlas-ui-font-heading, Gambetta);"
                >
                  Se déconnecter
                </div>
              </div>
            </button>
          </form>
        {/snippet}
      </CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem>
        {#snippet title()}
          Mes données
        {/snippet}
        {#snippet description()}
          {#if !userId}
            <p>
              Je dois m'authentifier avant de pouvoir accéder à mes données.
            </p>
          {/if}
        {/snippet}
        {#snippet actions()}
          <a
            href={downloadUrl}
            class="list-group-item list-group-item-action {userId
              ? 'list-group-item-secondary'
              : ''} {userId ? '' : 'disabled'}"
            target="_parent"
            role="button"
          >
            <div class="d-flex flex-row">
              <i class="bi bi-arrow-down me-2"></i>
              <div
                class="list-group list-group-flush fw-light"
                style="font-family: var(--atlas-ui-font-heading, Gambetta);"
              >
                Télécharger
              </div>
            </div>
          </a>
        {/snippet}
      </CardItem>
    </div>
  </HorizontalScroller>
</div>
