<script lang="ts">
  import { isEmail } from '$lib/validators';
  import { enhance } from '$app/forms';
  import { Icon } from '$lib/ui';

  /**
   * Signup - Modal d'inscription par magic link
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via the content prop.
   *
   * For a pre-configured version with i18n, use $lib/components/Signup.
   *
   * @example
   * ```svelte
   * <Signup {form} bind:open content={signupContent} />
   * ```
   */
  interface SignupContent {
    /** Modal title */
    title: string;
    /** Close button label */
    closeLabel: string;
    /** Modal description */
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
    /** Close alert label */
    closeAlert: string;
    /** Success message */
    success: string;
    /** Footer text */
    footer: string;
  }

  interface Props {
    form: {
      error?: boolean;
      message?: string;
      cause?: string;
      success?: boolean;
    } | null;
    open?: boolean;
    onclose?: () => void;
    /** Content for the modal (required) */
    content: SignupContent;
  }

  let { form, open = $bindable(false), onclose, content }: Props = $props();

  let email = $state('');
  let signuping = $state(false);
  let dismissed = $state(false);

  const isDisabled = $derived(!isEmail(email) || signuping);

  const closeModal = (): void => {
    open = false;
    dismissed = false;
    onclose?.();
  };

  const dismissAlert = (): void => {
    dismissed = true;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-secondary-900/50 z-40"
    onclick={closeModal}
    onkeydown={(e) => e.key === 'Enter' && closeModal()}
    role="button"
    tabindex="-1"
    aria-label={content.closeLabel}
  ></div>

  <!-- Modal Container -->
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="signup-modal-title"
  >
    <div class="flex min-h-full items-center justify-center p-4">
      <!-- Modal Content -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="relative rounded-lg shadow-xl overflow-hidden bg-white dark:bg-secondary-800"
        style="width: min(28rem, calc(100vw - 2rem))"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700"
        >
          <h2
            id="signup-modal-title"
            class="text-lg font-semibold text-secondary-900 dark:text-white"
          >
            {content.title}
          </h2>
          <button
            type="button"
            class="transition-colors p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
            onclick={closeModal}
            aria-label={content.closeLabel}
          >
            <Icon icon="lucide:x" width="20" height="20" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-4">
          <p class="text-sm mb-4 text-secondary-600 dark:text-secondary-400">
            {content.description}
          </p>

          <form
            method="post"
            action="?/signup"
            class="space-y-4"
            use:enhance={() => {
              signuping = true;
              dismissed = false;
              return async ({ update }) => {
                await update();
                signuping = false;
              };
            }}
          >
            <div>
              <label for="email" class="label">{content.emailLabel}</label>
              <input
                id="email"
                name="email"
                type="email"
                class="input"
                placeholder={content.emailPlaceholder}
                aria-describedby="email-help"
                bind:value={email}
              />
              <p id="email-help" class="text-xs mt-1 text-secondary-500 dark:text-secondary-400">
                {content.emailHint}
              </p>
            </div>

            <button type="submit" class="w-full btn-primary" disabled={isDisabled}>
              {#if signuping}
                <span class="inline-flex items-center gap-2">
                  <span
                    class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  ></span>
                  {content.submitting}
                </span>
              {:else}
                {content.submitButton}
              {/if}
            </button>
          </form>

          <!-- Alerts -->
          {#if !dismissed}
            {#if form?.error}
              <div class="alert-error mt-4 flex items-start justify-between" role="alert">
                <span>
                  <strong>{content.errorPrefix}</strong>
                  {form.message ?? content.errorDefault}
                  {#if form.cause}
                    : {form.cause}
                  {/if}
                </span>
                <button
                  type="button"
                  class="text-error-600 hover:text-error-700 ml-2 flex-shrink-0"
                  onclick={dismissAlert}
                  aria-label={content.closeAlert}
                >
                  <Icon icon="lucide:x" width="16" height="16" />
                </button>
              </div>
            {/if}

            {#if form?.success}
              <div class="alert-success mt-4 flex items-start justify-between" role="alert">
                <span>
                  {content.success}
                </span>
                <button
                  type="button"
                  class="text-success-600 hover:text-success-700 ml-2 flex-shrink-0"
                  onclick={dismissAlert}
                  aria-label={content.closeAlert}
                >
                  <Icon icon="lucide:x" width="16" height="16" />
                </button>
              </div>
            {/if}
          {/if}
        </div>

        <!-- Footer -->
        <div
          class="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900"
        >
          <p class="text-xs text-center text-secondary-500 dark:text-secondary-400">
            {content.footer}
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}
