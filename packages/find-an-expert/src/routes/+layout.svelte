<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import logo from '$lib/assets/logo.svg?raw';
  import { Navbar, Footer, Signup, ConnectivityBanner } from '$lib/components';
  import { createThemeStore, initTheme, initLocale } from '$lib/stores';
  import { setI18nContext, useI18n } from '$lib/content';

  const version = __APP_VERSION__;

  const themeStore = createThemeStore();

  // Initialize i18n context for the entire app
  setI18nContext();

  // Get i18n from context
  const i18n = useI18n();

  onMount(() => {
    initTheme();
    initLocale();
  });

  /** Reactive content based on locale - access i18n getters directly */
  const navigation = $derived(i18n.navigation);
  const partnersContent = $derived(i18n.partners);

  interface Props {
    data: {
      user: { email: string } | null;
      connectivityError?: 'appwrite_unavailable' | 'no_internet';
    };
    form: {
      error?: boolean;
      message?: string;
      cause?: string;
      success?: boolean;
      loggedOut?: boolean;
    } | null;
    children: import('svelte').Snippet;
  }

  let { data, form, children }: Props = $props();

  let signupOpen = $state(false);

  const openSignup = (): void => {
    signupOpen = true;
  };

  /** Navigation links for desktop and mobile */
  const navLinks = $derived([
    { href: '/', label: navigation.links.home, icon: 'lucide:home' },
    ...(data.user
      ? [{ href: '/dashboard', label: navigation.links.dashboard, icon: 'lucide:layout-dashboard' }]
      : []),
  ]);

  /** Icon links for desktop navbar */
  const iconLinks = $derived([
    {
      href: 'https://github.com/univ-lehavre/talent-finder',
      icon: 'mdi:github',
      label: navigation.external.github,
      description: navigation.external.githubDescription,
      external: true,
    },
  ]);

  /** Extra links for mobile menu only */
  const mobileExtraLinks = $derived([
    {
      href: 'https://github.com/univ-lehavre/talent-finder',
      label: navigation.external.github,
      icon: 'mdi:github',
      external: true,
    },
  ]);

  /** Partner logos for footer */
  const partners = $derived([
    {
      href: 'https://www.cptmp.fr/',
      src: '/logos/cptmp.png',
      alt: partnersContent.footer.cptmpAlt,
    },
    {
      href: 'https://www.univ-lehavre.fr/',
      src: '/logos/ulhn.svg',
      alt: partnersContent.footer.ulhnAlt,
    },
    {
      href: 'https://eunicoast.eu/',
      src: '/logos/eunicoast.png',
      alt: partnersContent.footer.eunicoastAlt,
    },
  ]);

  /** Google Fonts URL for current font pairing */
  const fontUrl = $derived(themeStore.font.googleFontsUrl);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!-- Load selected font pairing from Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  {#key themeStore.fontName}
    <link href={fontUrl} rel="stylesheet" />
  {/key}
</svelte:head>

<!-- Font families are defined in CSS via [data-font="name"] selectors -->
<div class="min-h-screen flex flex-col">
  <!-- Navigation -->
  <Navbar brandName={navigation.brand} logoHtml={logo} {navLinks} {iconLinks} {mobileExtraLinks}>
    {#snippet actions()}
      {#if data.user}
        <span class="text-sm text-secondary-600 dark:text-secondary-300 hidden md:inline"
          >{data.user.email}</span
        >
        <p class="text-sm text-secondary-600 dark:text-secondary-400 mb-3 md:hidden">
          {data.user.email}
        </p>
        <form method="post" action="/?/logout">
          <button type="submit" class="btn-secondary btn-sm md:btn-sm md:w-auto w-full"
            >{navigation.actions.signOut}</button
          >
        </form>
      {:else}
        <button
          type="button"
          class="btn-primary btn-sm md:btn-sm md:w-auto w-full"
          onclick={openSignup}>{navigation.actions.signIn}</button
        >
      {/if}
    {/snippet}
  </Navbar>

  <!-- Connectivity Error Banner -->
  {#if data.connectivityError}
    <ConnectivityBanner error={data.connectivityError} />
  {/if}

  <!-- Main Content -->
  <main class="flex-grow">
    {@render children()}
  </main>

  <!-- Footer -->
  <Footer {partners} {version} />
</div>

<!-- Signup Modal -->
<Signup {form} bind:open={signupOpen} />
