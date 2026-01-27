<script lang="ts">
  import { Signup as BaseSignup } from '$lib/ui';
  import { useI18n } from '$lib/content';
  import type { AuthContent } from '$lib/content/types';

  /**
   * Signup - Pre-configured signup modal with i18n labels.
   *
   * Wraps $lib/ui/Signup and injects content from i18n.
   * Translates error codes to localized messages.
   *
   * @example
   * ```svelte
   * <Signup {form} bind:open />
   * ```
   */
  interface Props {
    form: {
      error?: boolean;
      code?: string;
      success?: boolean;
    } | null;
    open?: boolean;
    onclose?: () => void;
  }

  let { form, open = $bindable(false), onclose }: Props = $props();

  const i18n = useI18n();
  const auth = $derived(i18n.auth);

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
    title: auth.modal.title,
    closeLabel: auth.modal.closeLabel,
    description: auth.modal.description,
    emailLabel: auth.modal.emailLabel,
    emailPlaceholder: auth.modal.emailPlaceholder,
    emailHint: auth.modal.emailHint,
    submitButton: auth.modal.submitButton,
    submitting: auth.modal.submitting,
    errorPrefix: auth.modal.error.prefix,
    errorDefault: auth.modal.error.default,
    closeAlert: auth.modal.closeAlert,
    success: auth.modal.success,
    footer: auth.modal.footer,
  });
</script>

<BaseSignup form={translatedForm} bind:open {onclose} {content} />
