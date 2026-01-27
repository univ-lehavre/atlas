<script lang="ts">
  import { useI18n } from '$lib/content';
  import {
    Hero,
    LandingSection,
    Grid,
    StepCard,
    ChallengeCard,
    CTASection,
    PartnerSection,
    TagCard,
    FeatureCard,
  } from '$lib/components';

  interface Props {
    data: {
      user: { email: string } | null;
    };
  }

  let { data }: Props = $props();

  const i18n = useI18n();
  const content = $derived(i18n.home);
  const partners = $derived(i18n.partners);

  const scrollToHowItWorks = (): void => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };
</script>

<svelte:head>
  <title>{content.meta.title}</title>
  <meta name="description" content={content.meta.description} />
</svelte:head>

<!-- Hero Section -->
<Hero title={content.hero.title} subtitle={content.hero.subtitle}>
  {#snippet actions()}
    {#if data.user}
      <a href="/dashboard" class="btn-primary btn-lg bg-white text-primary-700 hover:bg-primary-50">
        {content.hero.ctaLoggedIn}
      </a>
    {:else}
      <a
        href="/repository"
        class="btn-primary btn-lg bg-white text-primary-700 hover:bg-primary-50"
      >
        {content.hero.ctaLoggedOut}
      </a>
    {/if}
    <button
      type="button"
      class="btn-outline btn-lg border-white text-white hover:bg-white/10"
      onclick={scrollToHowItWorks}
    >
      {content.hero.learnMore}
    </button>
  {/snippet}
</Hero>

<!-- How it Works Section -->
<LandingSection
  id="how-it-works"
  title={content.howItWorks.title}
  description={content.howItWorks.subtitle}
  variant="default"
  class="scroll-mt-16"
>
  <Grid cols={3}>
    {#each content.howItWorks.steps as step (step.number)}
      <StepCard number={step.number} title={step.title} description={step.description} />
    {/each}
  </Grid>
</LandingSection>

<!-- State of the Art Section -->
<LandingSection
  title={content.challenges.title}
  description={content.challenges.subtitle}
  variant="surface"
>
  <Grid cols={3}>
    {#each content.challenges.items as challenge (challenge.title)}
      <ChallengeCard
        title={challenge.title}
        problem={challenge.problem}
        solution={challenge.solution}
      />
    {/each}
  </Grid>
</LandingSection>

<!-- Partners Section -->
<CTASection title={partners.header.title} subtitle={partners.header.subtitle} variant="gradient" />

<!-- Université Le Havre Normandie Section -->
<PartnerSection
  href="https://www.univ-lehavre.fr/"
  logoSrc="/logos/ulhn.svg"
  logoAlt={partners.ulhn.title}
  title={partners.ulhn.title}
  variant="default"
>
  <p>
    {partners.ulhn.description}
  </p>
</PartnerSection>

<!-- CPTMP Section -->
<PartnerSection
  href="https://www.cptmp.fr/"
  logoSrc="/logos/cptmp.png"
  logoAlt={partners.footer.cptmpAlt}
  title={partners.cptmp.title}
  variant="surface"
  logoPosition="right"
>
  <p>
    {partners.cptmp.description}
  </p>
  {#snippet extra()}
    <Grid cols={3}>
      <FeatureCard
        title={partners.cptmp.features.smartCity.title}
        description={partners.cptmp.features.smartCity.description}
      />
      <FeatureCard
        title={partners.cptmp.features.maritime.title}
        description={partners.cptmp.features.maritime.description}
      />
      <FeatureCard
        title={partners.cptmp.features.energy.title}
        description={partners.cptmp.features.energy.description}
      />
    </Grid>
  {/snippet}
</PartnerSection>

<!-- EUNICoast Section -->
<PartnerSection
  href="https://eunicoast.eu/"
  logoSrc="/logos/eunicoast.png"
  logoAlt={partners.eunicoast.title}
  title={partners.eunicoast.title}
  variant="default"
>
  <p>
    {partners.eunicoast.description}
  </p>
  {#snippet extra()}
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      {#each partners.eunicoast.tags as tag (tag)}
        <TagCard label={tag} size="sm" />
      {/each}
    </div>
  {/snippet}
</PartnerSection>

<!-- CTA Section -->
<CTASection title={content.cta.title} subtitle={content.cta.subtitle}>
  {#snippet actions()}
    {#if data.user}
      <a href="/dashboard" class="btn-primary btn-lg">{content.cta.buttonLoggedIn}</a>
    {:else}
      <a href="/repository" class="btn-primary btn-lg">{content.cta.buttonLoggedOut}</a>
    {/if}
  {/snippet}
</CTASection>
