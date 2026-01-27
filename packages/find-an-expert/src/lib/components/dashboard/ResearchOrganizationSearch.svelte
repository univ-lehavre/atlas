<script lang="ts">
  import { ResearchOrganizationSearch as BaseResearchOrganizationSearch } from '$lib/ui';
  import { useI18n } from '$lib/content';
  import type { TInstitution } from '$lib/server/openalex';

  /**
   * ResearchOrganizationSearch - Pre-configured organization search with i18n labels.
   *
   * Wraps $lib/ui/ResearchOrganizationSearch and injects content from i18n.
   *
   * @example
   * ```svelte
   * <ResearchOrganizationSearch bind:selectedOrganizations hasConsent={true} />
   * ```
   */
  interface Props {
    /** Selected organizations (bindable) */
    selectedOrganizations?: TInstitution[];
    /** Maximum number of organizations that can be selected */
    maxOrganizations?: number;
    /** Whether user has granted consent for OpenAlex API usage */
    hasConsent?: boolean;
  }

  let {
    selectedOrganizations = $bindable([]),
    maxOrganizations,
    hasConsent = false,
  }: Props = $props();

  const i18n = useI18n();
  const ui = $derived(i18n.ui);

  const content = $derived({
    title: ui.researchOrganization.title,
    consentRequired: ui.researchOrganization.consentRequired,
    consentMessage: ui.researchOrganization.consentMessage,
    searchPlaceholder: ui.researchOrganization.searchPlaceholder,
    maxReached: ui.researchOrganization.maxReached,
    works: ui.researchOrganization.works,
    citations: ui.researchOrganization.citations,
    noResults: ui.researchOrganization.noResults,
    selectedTitle: ui.researchOrganization.selectedTitle,
    maxLabel: ui.researchOrganization.maxLabel,
    noSelection: ui.researchOrganization.noSelection,
    removeLabel: ui.researchOrganization.removeLabel,
  });
</script>

<BaseResearchOrganizationSearch
  bind:selectedOrganizations
  {maxOrganizations}
  {hasConsent}
  {content}
/>
