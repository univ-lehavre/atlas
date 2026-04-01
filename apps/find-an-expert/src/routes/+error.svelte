<script lang="ts">
  import { page } from '$app/stores';
  import { ErrorState, ButtonGroup, LinkButton, Button } from '$lib/components';
  import { useI18n } from '$lib/content';

  const i18n = useI18n();
  const errors = $derived(i18n.errors);

  const errorInfo = $derived.by(() => {
    if ($page.status === 404) {
      return {
        title: errors.notFound.title,
        message: errors.notFound.message,
        variant: 'default' as const,
      };
    }
    return {
      title: errors.generic.title,
      message: $page.error?.message ?? errors.generic.message,
      variant: 'error' as const,
    };
  });
</script>

<svelte:head>
  <title>{$page.status} {errors.titleSuffix}</title>
  <meta name="description" content={errorInfo.title} />
</svelte:head>

<div class="container-app">
  <ErrorState
    code={$page.status}
    title={errorInfo.title}
    message={errorInfo.message}
    variant={errorInfo.variant}
  >
    {#snippet actions()}
      <ButtonGroup justify="center">
        <LinkButton href="/" variant="primary" icon="lucide:home"
          >{errors.buttons.backToHome}</LinkButton
        >
        <Button variant="outline" icon="lucide:arrow-left" onclick={() => history.back()}>
          {errors.buttons.goBack}
        </Button>
      </ButtonGroup>
    {/snippet}
  </ErrorState>
</div>
