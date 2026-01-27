<script lang="ts">
  import Button from '$lib/ui/Button.svelte';

  interface Props {
    userId: string | undefined;
    url: string | null;
    hasPushedAccount: boolean;
  }
  let { userId, url, hasPushedAccount }: Props = $props();
</script>

{#if userId}
  {#if hasPushedAccount}
    {#if url}
      <div class="mb-2">
        <Button label="Take the survey" icon="clipboard2-data" href={url} newTab />
      </div>
    {/if}
  {:else}
    <div class="mb-2 fw-light" style="font-family: Gambetta;">
      In order to complete our survey, you should first get a survey link. This will push your
      authentication ID and email address to our survey server.
    </div>
    <form method="post" action="?/pushAccount">
      <Button label="Get a survey link" icon="link-45deg" />
    </form>
  {/if}
{:else}
  <Button label="Sign up" icon="box-arrow-in-right" href="/signup" />
{/if}
