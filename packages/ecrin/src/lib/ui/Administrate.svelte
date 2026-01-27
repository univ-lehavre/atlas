<script lang="ts">
  import Signup from './Signup.svelte';
  import HorizontalScroller from '$lib/ui/HorizontalScroller.svelte';
  import SectionTile from '$lib/ui/SectionTile.svelte';
  import CardItem from '$lib/ui/CardItem.svelte';
  let { userId, url, hasPushedAccount, email } = $props();
  let showHeading = $state(false);
</script>

<Signup />

<div id="administrate">
  <HorizontalScroller ariaLabel="Administrate cards" headingText="Administrate" bind:showHeading>
    <SectionTile title={!showHeading ? 'Administrate' : ''} />

    <div class="flex-shrink-0">
      <CardItem title="My account">
        {#snippet bodyExtra()}
          {#if email}
            <div class="fw-light" style="font-family: Gambetta;">
              <p>
                <i>{email}</i> is actually logged in.
              </p>
              {#if hasPushedAccount}
                <p>Account deletion is only permitted after you have deleted your survey data.</p>
              {/if}
            </div>
          {/if}
        {/snippet}
        {#snippet footer()}
          <div class="list-group list-group-flush">
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
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  Sign up
                </div>
              </div>
            </button>
            <form method="post" action="?/logout">
              <button
                type="submit"
                class="list-group-item list-group-item-action list-group-item-warning {userId
                  ? ''
                  : 'disabled'}"
              >
                <div class="d-flex flex-row">
                  <i class="bi bi-box-arrow-right me-2"></i>
                  <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                    Log out
                  </div>
                </div>
              </button>
            </form>
            <form method="post" action="?/deleteAuth">
              <button
                type="submit"
                class="list-group-item list-group-item-action list-group-item-danger {userId &&
                !hasPushedAccount
                  ? ''
                  : 'disabled'}"
              >
                <div class="d-flex flex-row">
                  <i class="bi bi-trash me-2"></i>
                  <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                    Delete
                  </div>
                </div>
              </button>
            </form>
          </div>
        {/snippet}
      </CardItem>
    </div>

    <div class="flex-shrink-0">
      <CardItem title="My survey">
        {#snippet bodyExtra()}
          <div class="fw-light" style="font-family: Gambetta;">
            {#if userId && !url}
              <p>Before I can fill out my survey, I must agree to ECRIN's data policy.</p>
            {/if}
            {#if !userId}
              <p>I must sign up in order to fill out my survey.</p>
            {/if}
          </div>
        {/snippet}
        {#snippet footer()}
          <div class="list-group list-group-flush">
            <form method="post" action="?/subscribe">
              <button
                type="submit"
                class="list-group-item list-group-item-action list-group-item-primary {userId &&
                !url
                  ? ''
                  : 'disabled'}"
              >
                <div class="d-flex flex-row">
                  <i class="bi bi-trash me-2"></i>
                  <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                    Subscribe
                  </div>
                </div>
              </button>
            </form>
            <a
              href="/api/v1/surveys/download"
              class="list-group-item list-group-item-action list-group-item-secondary {userId
                ? ''
                : 'disabled'}"
              target="_parent"
              role="button"
            >
              <div class="d-flex flex-row">
                <i class="bi bi-arrow-down me-2"></i>
                <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                  Download
                </div>
              </div>
            </a>
            <form method="post" action="?/deleteSurvey">
              <button
                type="submit"
                class="list-group-item list-group-item-action list-group-item-danger {userId && url
                  ? ''
                  : 'disabled'}"
              >
                <div class="d-flex flex-row">
                  <i class="bi bi-trash me-2"></i>
                  <div class="list-group list-group-flush fw-light" style="font-family: Gambetta;">
                    Delete
                  </div>
                </div>
              </button>
            </form>
          </div>
        {/snippet}
      </CardItem>
    </div>
  </HorizontalScroller>
</div>
