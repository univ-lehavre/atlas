<script lang="ts">
  import { isEmail } from '$lib/validators';
  import { enhance } from '$app/forms';
  import { Icon, Alert } from '$lib/ui';

  /**
   * LoginForm - Formulaire de connexion standalone
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/LoginForm.
   *
   * @example
   * ```svelte
   * <LoginForm {form} content={loginFormContent} />
   * ```
   */
  interface LoginFormContent {
    /** Form title */
    title: string;
    /** Form description */
    description: string;
    /** Email field label */
    emailLabel: string;
    /** Email field placeholder */
    emailPlaceholder: string;
    /** Email field hint text */
    emailHint: string;
    /** Submit button text */
    submitButton: string;
    /** Submit button text when submitting */
    submitting: string;
    /** Error message prefix */
    errorPrefix: string;
    /** Default error message */
    errorDefault: string;
    /** Success title */
    successTitle: string;
    /** Success message */
    successMessage: string;
    /** Footer text */
    footer: string;
    /** Terms link text */
    termsLink: string;
    /** Close alert aria-label */
    closeAlertLabel: string;
  }

  interface Props {
    /** Form state from SvelteKit action */
    form: {
      error?: boolean;
      message?: string;
      cause?: string;
      success?: boolean;
    } | null;
    /** Content for the form (required) */
    content: LoginFormContent;
    /** Additional CSS classes */
    class?: string;
  }

  let { form, content, class: className = '' }: Props = $props();

  let email = $state('');
  let signuping = $state(false);

  const isDisabled = $derived(!isEmail(email) || signuping);
</script>

<div class="login-form {className}">
  <div class="login-form-header">
    <div class="login-form-icon">
      <Icon icon="lucide:mail" width="32" height="32" />
    </div>
    <h1 class="login-form-title">{content.title}</h1>
    <p class="login-form-description">
      {content.description}
    </p>
  </div>

  <form
    method="post"
    action="?/signup"
    class="login-form-body"
    use:enhance={() => {
      signuping = true;
      return async ({ update }) => {
        await update();
        signuping = false;
      };
    }}
  >
    <div class="login-form-field">
      <label for="email" class="label">{content.emailLabel}</label>
      <input
        id="email"
        name="email"
        type="email"
        class="input"
        placeholder={content.emailPlaceholder}
        aria-describedby="email-help"
        bind:value={email}
        disabled={signuping}
      />
      <p id="email-help" class="login-form-hint">
        {content.emailHint}
      </p>
    </div>

    <button type="submit" class="w-full btn-primary" disabled={isDisabled}>
      {#if signuping}
        <span class="inline-flex items-center gap-2">
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          {content.submitting}
        </span>
      {:else}
        <Icon icon="lucide:send" width="16" height="16" />
        {content.submitButton}
      {/if}
    </button>

    {#if form?.error}
      <Alert variant="error" dismissible closeLabel={content.closeAlertLabel}>
        <strong>{content.errorPrefix}</strong>
        {form.message ?? content.errorDefault}
        {#if form.cause}
          — {form.cause}
        {/if}
      </Alert>
    {/if}

    {#if form?.success}
      <Alert variant="success" dismissible closeLabel={content.closeAlertLabel}>
        <strong>{content.successTitle}</strong>
        {content.successMessage}
      </Alert>
    {/if}
  </form>

  <div class="login-form-footer">
    <p>
      {content.footer}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- generic UI component, href is internal static -->
      <a href="/terms" class="login-form-link">{content.termsLink}</a>.
    </p>
  </div>
</div>

<style>
  .login-form {
    width: 100%;
    max-width: 24rem;
    margin-inline: auto;
  }

  .login-form-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);
  }

  .login-form-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    margin-inline: auto;
    margin-bottom: var(--spacing-md);
    border-radius: 9999px;
    background-color: var(--color-primary-100);
    color: var(--color-primary-600);
  }

  :global(.dark) .login-form-icon {
    background-color: var(--color-primary-900);
    color: var(--color-primary-400);
  }

  .login-form-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-secondary-900);
    margin-bottom: var(--spacing-sm);
  }

  :global(.dark) .login-form-title {
    color: var(--color-secondary-100);
  }

  .login-form-description {
    font-size: var(--text-sm);
    color: var(--color-secondary-600);
  }

  :global(.dark) .login-form-description {
    color: var(--color-secondary-400);
  }

  .login-form-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .login-form-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .login-form-hint {
    font-size: var(--text-xs);
    color: var(--color-secondary-500);
  }

  :global(.dark) .login-form-hint {
    color: var(--color-secondary-400);
  }

  .login-form-footer {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--color-secondary-200);
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-secondary-500);
  }

  :global(.dark) .login-form-footer {
    border-color: var(--color-secondary-700);
    color: var(--color-secondary-400);
  }

  .login-form-link {
    color: var(--color-primary-600);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .login-form-link:hover {
    color: var(--color-primary-700);
  }

  :global(.dark) .login-form-link {
    color: var(--color-primary-400);
  }

  :global(.dark) .login-form-link:hover {
    color: var(--color-primary-300);
  }
</style>
