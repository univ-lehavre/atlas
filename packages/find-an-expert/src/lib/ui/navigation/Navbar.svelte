<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { Icon, NavLink, IconLink, Drawer } from '$lib/ui';

  /**
   * Navbar - Barre de navigation responsive
   *
   * Pure UI component with no i18n dependency.
   * All text content must be provided via props.
   *
   * For a pre-configured version with i18n, use $lib/components/Navbar.
   *
   * @example
   * ```svelte
   * <Navbar
   *   brandName="MyApp"
   *   navLinks={[{ href: '/', label: 'Home', icon: 'lucide:home' }]}
   *   toggleMenuLabel="Toggle menu"
   *   mobileMenuTitle="Menu"
   *   mobileMenuCloseLabel="Close menu"
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
    /** Toggle menu button aria-label */
    toggleMenuLabel: string;
    /** Mobile drawer title */
    mobileMenuTitle: string;
    /** Mobile drawer close button aria-label */
    mobileMenuCloseLabel: string;
    /** User actions slot (login/logout buttons) */
    actions?: Snippet;
    /** Header slot for mobile drawer (theme toggle, language selector, etc.) */
    mobileHeader?: Snippet;
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
    toggleMenuLabel,
    mobileMenuTitle,
    mobileMenuCloseLabel,
    actions,
    mobileHeader,
    class: className = '',
  }: Props = $props();

  let mobileMenuOpen = $state(false);

  const toggleMobileMenu = (): void => {
    mobileMenuOpen = !mobileMenuOpen;
  };

  const closeMobileMenu = (): void => {
    mobileMenuOpen = false;
  };

  const isCurrentPage = (href: string): boolean => {
    return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
  };

  const checkIsCurrent = (link: NavLinkItem): boolean => {
    if (link.external) return false;
    if (link.href === '/') return $page.url.pathname === '/';
    return isCurrentPage(link.href);
  };

  const allMobileLinks = $derived([...navLinks, ...mobileExtraLinks]);
</script>

<nav
  class="
		bg-white dark:bg-secondary-800
		border-b border-secondary-200 dark:border-secondary-700
		sticky top-0 z-50
		transition-colors duration-200
		{className}
	"
>
  <div class="container-app py-4 flex items-center justify-between">
    <!-- Logo -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- navbar logo link uses root path -->
    <a href="/" class="flex items-center gap-2">
      {#if logo}
        <span class="h-8 w-8 [&>svg]:h-full [&>svg]:w-full">
          {@render logo()}
        </span>
      {:else if logoHtml}
        <!-- eslint-disable svelte/no-at-html-tags -- logoHtml is trusted SVG content from build-time import -->
        <span class="h-8 w-8 [&>svg]:h-full [&>svg]:w-full">
          {@html logoHtml}
        </span>
        <!-- eslint-enable svelte/no-at-html-tags -->
      {:else if logoSrc}
        <img src={logoSrc} alt={brandName} class="h-8 w-8" />
      {/if}
      {#if brandName}
        <span class="text-xl font-bold text-primary-700 dark:text-primary-400">
          {brandName}
        </span>
      {/if}
    </a>

    <!-- Desktop Navigation -->
    <div class="hidden md:flex items-center gap-4">
      {#each navLinks as link (link.href)}
        <NavLink
          href={link.href}
          label={link.label}
          icon={link.icon}
          isCurrent={checkIsCurrent(link)}
          external={link.external}
        />
      {/each}

      {#each iconLinks as link (link.href)}
        <IconLink
          href={link.href}
          icon={link.icon}
          label={link.label}
          description={link.description}
          external={link.external}
        />
      {/each}

      {#if actions}
        {@render actions()}
      {/if}
    </div>

    <!-- Mobile Menu Button -->
    <div class="md:hidden flex items-center gap-2">
      <button
        type="button"
        class="p-2 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400"
        onclick={toggleMobileMenu}
        aria-label={toggleMenuLabel}
      >
        <Icon icon={mobileMenuOpen ? 'lucide:x' : 'lucide:menu'} width="24" height="24" />
      </button>
    </div>
  </div>
</nav>

<!-- Mobile Drawer -->
<Drawer
  bind:open={mobileMenuOpen}
  onclose={closeMobileMenu}
  title={mobileMenuTitle}
  closeLabel={mobileMenuCloseLabel}
>
  {#snippet header()}
    {#if mobileHeader}
      {@render mobileHeader()}
    {/if}
  {/snippet}

  {#each allMobileLinks as link (link.href)}
    <NavLink
      href={link.href}
      label={link.label}
      icon={link.icon}
      isCurrent={checkIsCurrent(link)}
      external={link.external}
      variant="mobile"
      onclick={closeMobileMenu}
    />
  {/each}

  {#if actions}
    <div class="pt-4 border-t border-secondary-200 dark:border-secondary-700">
      {@render actions()}
    </div>
  {/if}
</Drawer>
