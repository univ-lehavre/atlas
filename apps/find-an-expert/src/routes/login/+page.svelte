<script lang="ts">
  import {
    LoginForm,
    CenteredLayout,
    LoadingState,
    ErrorState,
    ButtonGroup,
    LinkButton,
  } from '$lib/components';
  import { useI18n } from '$lib/content';
  import type { AuthContent } from '$lib/content/types';

  const i18n = useI18n();
  const auth = $derived(i18n.auth);

  interface Props {
    data: {
      isMagicLinkCallback: boolean;
      error?: boolean;
      code?: string;
    };
    form: {
      error?: boolean;
      code?: string;
      success?: boolean;
    } | null;
  }

  let { data, form }: Props = $props();

  /**
   * Translate error code to localized message.
   */
  const translateErrorCode = (
    code: string | undefined,
    errorCodes: AuthContent['errorCodes']
  ): string => {
    if (!code) return auth.login.error.message;
    return errorCodes[code as keyof AuthContent['errorCodes']] ?? errorCodes.unexpected_error;
  };

  const errorMessage = $derived(translateErrorCode(data.code, auth.errorCodes));
</script>

<svelte:head>
  <title>{auth.login.title}</title>
  <meta name="description" content={auth.login.description} />
</svelte:head>

<CenteredLayout>
  {#if data.isMagicLinkCallback}
    {#if data.error}
      <ErrorState
        title={auth.login.error.title}
        message={errorMessage}
        icon="lucide:link-2-off"
        variant="error"
        size="md"
      >
        {#snippet actions()}
          <ButtonGroup justify="center">
            <LinkButton href="/login" variant="primary" icon="lucide:refresh-cw">
              {auth.login.buttons.retry}
            </LinkButton>
            <LinkButton href="/" variant="secondary" icon="lucide:home"
              >{auth.login.buttons.home}</LinkButton
            >
          </ButtonGroup>
        {/snippet}
      </ErrorState>
    {:else}
      <LoadingState title={auth.login.loading.title} message={auth.login.loading.message} />
    {/if}
  {:else}
    <LoginForm {form} />
  {/if}
</CenteredLayout>
