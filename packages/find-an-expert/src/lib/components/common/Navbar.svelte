<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Navbar as BaseNavbar } from '$lib/ui';
  import { useI18n } from '$lib/content';
  import ThemeToggle from './ThemeToggle.svelte';
  import LanguageSelector from './LanguageSelector.svelte';

  /**
   * Navbar - Pre-configured navigation bar with i18n labels.
   *
   * Wraps $lib/ui/Navbar and injects accessibility labels from i18n.
   * Includes ThemeToggle and LanguageSelector by default.
   *
   * @example
   * ```svelte
   * <Navbar
   *   brandName="MyApp"
   *   navLinks={[{ href: '/', label: 'Home', icon: 'lucide:home' }]}
   * />
   * ```
   */
  interface NavLinkItem {
    href: string;
    label: string;
    icon: string;
    external?: boolean;
  }

  interface IconLinkItem {
    href: string;
    icon: string;
    label: string;
    description?: string;
    external?: boolean;
  }

  interface Props {
    /** Logo content as snippet */
    logo?: Snippet;
    /** Logo as raw HTML/SVG string */
    logoHtml?: string;
    /** Logo URL (for img src) */
    logoSrc?: string;
    /** Brand name */
    brandName?: string;
    /** Navigation links */
    navLinks?: NavLinkItem[];
    /** Icon links (displayed as icons with tooltips) */
    iconLinks?: IconLinkItem[];
    /** Additional links for mobile menu only */
    mobileExtraLinks?: NavLinkItem[];
    /** Show theme toggle */
    showThemeToggle?: boolean;
    /** Show language selector */
    showLanguageSelector?: boolean;
    /** User actions slot (login/logout buttons) */
    actions?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    logo,
    logoHtml,
    logoSrc,
    brandName = '',
    navLinks = [],
    iconLinks = [],
    mobileExtraLinks = [],
    showThemeToggle = true,
    showLanguageSelector = true,
    actions: userActions,
    class: className = '',
  }: Props = $props();

  const i18n = useI18n();
  const a11y = $derived(i18n.accessibility);
</script>

<BaseNavbar
  {logo}
  {logoHtml}
  {logoSrc}
  {brandName}
  {navLinks}
  {iconLinks}
  {mobileExtraLinks}
  toggleMenuLabel={a11y.toggleMenu}
  mobileMenuTitle={a11y.toggleMenu}
  mobileMenuCloseLabel={a11y.closeMenu}
  class={className}
>
  {#snippet actions()}
    {#if showLanguageSelector}
      <LanguageSelector />
    {/if}
    {#if showThemeToggle}
      <ThemeToggle />
    {/if}
    {#if userActions}
      {@render userActions()}
    {/if}
  {/snippet}

  {#snippet mobileHeader()}
    {#if showLanguageSelector}
      <LanguageSelector compact />
    {/if}
    {#if showThemeToggle}
      <ThemeToggle />
    {/if}
  {/snippet}
</BaseNavbar>
