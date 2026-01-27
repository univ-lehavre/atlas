<script lang="ts">
  import { ArticlesCountCard as BaseArticlesCountCard } from '$lib/ui';
  import { useI18n } from '$lib/content';
  import type { TInstitution } from '$lib/server/openalex';

  /**
   * ArticlesCountCard - Pre-configured articles count card with i18n labels.
   *
   * Wraps $lib/ui/ArticlesCountCard and injects content from i18n.
   *
   * @example
   * ```svelte
   * <ArticlesCountCard {selectedOrganizations} {hasConsent} />
   * ```
   */
  interface Props {
    /** Selected organizations to count articles for */
    selectedOrganizations: TInstitution[];
    /** Whether user has granted consent for OpenAlex API usage */
    hasConsent?: boolean;
  }

  let { selectedOrganizations, hasConsent = false }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    title: ui.researchOutput.title,
    consentMessage: ui.researchOutput.consentMessage,
    selectOrganizations: ui.researchOutput.selectOrganizations,
    loading: ui.researchOutput.loading,
    articlesByYear: ui.researchOutput.articlesByYear,
    beforeLabel: ui.researchOutput.before,
    affiliatedAuthors: ui.researchOutput.affiliatedAuthors,
    totalLabel: ui.researchOutput.total,
    consentRequired: ui.researchOrganization.consentRequired,
  });
</script>

<BaseArticlesCountCard {selectedOrganizations} {hasConsent} {content} />
