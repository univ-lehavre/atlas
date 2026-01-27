<script lang="ts">
  import { InfoCard, ExternalLinkCard } from '$lib/ui';

  /**
   * ExternalLinksCard - Card containing a list of external links
   *
   * Wraps multiple ExternalLinkCard components in an InfoCard.
   *
   * @example
   * ```svelte
   * <ExternalLinksCard
   *   links={[
   *     { href: 'https://example.com', icon: 'lucide:globe', title: 'Website', description: 'Main site' }
   *   ]}
   * />
   * ```
   */
  interface ExternalLink {
    href: string;
    icon: string;
    title: string;
    description: string;
  }

  interface Props {
    /** Array of external links */
    links: ExternalLink[];
    /** Card title */
    title?: string;
    /** Additional CSS classes */
    class?: string;
  }

  let { links, title = 'External Links', class: className = '' }: Props = $props();
</script>

<InfoCard {title} icon="lucide:external-link" class={className}>
  <div class="links-list">
    {#each links as link (link.href)}
      <ExternalLinkCard
        href={link.href}
        icon={link.icon}
        title={link.title}
        description={link.description}
      />
    {/each}
  </div>
</InfoCard>

<style>
  .links-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
</style>
