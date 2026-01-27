<script lang="ts">
  import { LoginForm as BaseLoginForm } from '$lib/ui';
  import { useI18n } from '$lib/content';
  import type { AuthContent } from '$lib/content/types';

  /**
   * LoginForm - Pre-configured login form with i18n labels.
   *
   * Wraps $lib/ui/LoginForm and injects content from i18n.
   * Translates error codes to localized messages.
   *
   * @example
   * ```svelte
   * <LoginForm {form} />
   * ```
   */
  interface Props {
    /** Form state from SvelteKit action */
    form: {
      error?: boolean;
      code?: string;
      success?: boolean;
    } | null;
    /** Additional CSS classes */
    class?: string;
  }

  let { form, class: className = '' }: Props = $props();

  const i18n = useI18n();
  const auth = $derived(i18n.auth);
  const a11y = $derived(i18n.accessibility);

  /**
   * Translate error code to localized message.
   */
  const translateErrorCode = (
    code: string | undefined,
    errorCodes: AuthContent['errorCodes']
  ): string | undefined => {
    if (!code) return undefined;
    return errorCodes[code as keyof AuthContent['errorCodes']] ?? errorCodes.unexpected_error;
  };

  /**
   * Form with translated error message.
   */
  const translatedForm = $derived(
    form
      ? {
          ...form,
          message: translateErrorCode(form.code, auth.errorCodes),
        }
      : null
  );

  const content = $derived({
    title: auth.form.title,
    description: auth.form.description,
    emailLabel: auth.form.emailLabel,
    emailPlaceholder: auth.form.emailPlaceholder,
    emailHint: auth.form.emailHint,
    submitButton: auth.form.submitButton,
    submitting: auth.form.submitting,
    errorPrefix: auth.form.error.prefix,
    errorDefault: auth.form.error.default,
    successTitle: auth.form.success.title,
    successMessage: auth.form.success.message,
    footer: auth.form.footer,
    termsLink: auth.form.termsLink,
    closeAlertLabel: a11y.closeAlert,
  });
</script>

<BaseLoginForm form={translatedForm} {content} class={className} />
