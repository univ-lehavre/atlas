<script lang="ts">
  import { Icon } from '$lib/ui';
  import { localeState, setLocale, locales, type Locale } from '$lib/stores';

  /**
   * LanguageSelector - Sélecteur de langue
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/LanguageSelector.
   *
   * @example
   * ```svelte
   * <LanguageSelector
   *   selectorLabel="Select language"
   *   closeMenuLabel="Close"
   *   changeLanguageLabel="Change language"
   * />
   * ```
   */
  interface Props {
    /** Compact mode (only shows flag) */
    compact?: boolean;
    /** Selector button aria-label */
    selectorLabel: string;
    /** Close menu aria-label */
    closeMenuLabel: string;
    /** Change language listbox aria-label */
    changeLanguageLabel: string;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    compact = false,
    selectorLabel,
    closeMenuLabel,
    changeLanguageLabel,
    class: className = '',
  }: Props = $props();

  let open = $state(false);

  const currentLocale = $derived(locales[localeState.current]);
  const localeEntries = $derived(
    Object.entries(locales) as [Locale, { name: string; flag: string }][]
  );

  const toggle = (): void => {
    open = !open;
  };

  const close = (): void => {
    open = false;
  };

  const selectLocale = (locale: Locale): void => {
    setLocale(locale);
    close();
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      close();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative {className}">
  <button
    type="button"
    class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
    onclick={toggle}
    aria-label={selectorLabel}
    aria-expanded={open}
    aria-haspopup="listbox"
  >
    <span class="text-lg" role="img" aria-label={currentLocale.name}>{currentLocale.flag}</span>
    {#if !compact}
      <span class="text-sm font-medium hidden sm:inline">{currentLocale.name}</span>
    {/if}
    <Icon
      icon="lucide:chevron-down"
      width="14"
      height="14"
      class="transition-transform {open ? 'rotate-180' : ''}"
    />
  </button>

  {#if open}
    <button type="button" class="fixed inset-0 z-10" onclick={close} aria-label={closeMenuLabel}
    ></button>

    <div
      class="absolute right-0 mt-2 py-1 w-40 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-lg shadow-lg z-20"
      role="listbox"
      aria-label={changeLanguageLabel}
    >
      {#each localeEntries as [locale, info] (locale)}
        <button
          type="button"
          class="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors
						{locale === localeState.current
            ? 'text-primary-600 dark:text-primary-400 font-medium'
            : 'text-secondary-700 dark:text-secondary-300'}"
          onclick={() => selectLocale(locale)}
          role="option"
          aria-selected={locale === localeState.current}
        >
          <span class="text-lg" role="img" aria-label={info.name}>{info.flag}</span>
          <span>{info.name}</span>
          {#if locale === localeState.current}
            <Icon icon="lucide:check" width="16" height="16" class="ml-auto" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
