<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '$lib/ui';

  /**
   * Section - Container de section avec composition flexible via snippets
   *
   * @example Simple
   * ```svelte
   * <Section title="Statistiques">
   *   <p>Contenu de la section</p>
   * </Section>
   * ```
   *
   * @example Avec actions et footer
   * ```svelte
   * <Section title="Articles" icon="lucide:book">
   *   <ArticleList />
   *   {#snippet headerActions()}
   *     <button class="btn-primary">Ajouter</button>
   *   {/snippet}
   *   {#snippet footer()}
   *     <Pagination />
   *   {/snippet}
   * </Section>
   * ```
   */
  interface Props {
    /** Section title */
    title: string;
    /** Optional description below title */
    description?: string;
    /** Lucide icon name (e.g., 'lucide:settings') */
    icon?: string;
    /** Background variant */
    variant?: 'default' | 'surface' | 'card' | 'transparent';
    /** Vertical spacing */
    spacing?: 'sm' | 'md' | 'lg';
    /** Main content */
    children: Snippet;
    /** Optional actions in header (buttons, links) */
    headerActions?: Snippet;
    /** Optional footer content */
    footer?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    description,
    icon,
    variant = 'default',
    spacing = 'md',
    children,
    headerActions,
    footer,
    class: className = '',
  }: Props = $props();
</script>

<section class="section {className}" data-variant={variant} data-spacing={spacing}>
  <div class="container-app">
    <header class="section-header">
      <div class="section-title-group">
        {#if icon}
          <Icon {icon} width="24" height="24" class="section-icon" />
        {/if}
        <div>
          <h2 class="section-title">{title}</h2>
          {#if description}
            <p class="section-description">{description}</p>
          {/if}
        </div>
      </div>
      {#if headerActions}
        <div class="section-actions">
          {@render headerActions()}
        </div>
      {/if}
    </header>

    <div class="section-content">
      {@render children()}
    </div>

    {#if footer}
      <footer class="section-footer">
        {@render footer()}
      </footer>
    {/if}
  </div>
</section>

<style>
  .section {
    --section-bg: var(--color-secondary-50);
    --section-py: var(--spacing-xl);

    background-color: var(--section-bg);
    padding-block: var(--section-py);
    transition:
      background-color var(--transition-normal),
      padding var(--transition-normal);
  }

  /* Variants */
  .section[data-variant='surface'] {
    --section-bg: white;
  }

  .section[data-variant='card'] {
    --section-bg: white;
    margin-inline: var(--spacing-md);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-secondary-200);
  }

  .section[data-variant='transparent'] {
    --section-bg: transparent;
  }

  /* Spacing */
  .section[data-spacing='sm'] {
    --section-py: var(--spacing-lg);
  }

  .section[data-spacing='lg'] {
    --section-py: var(--spacing-2xl);
  }

  /* Dark mode */
  :global(.dark) .section {
    --section-bg: var(--color-secondary-900);
  }

  :global(.dark) .section[data-variant='surface'] {
    --section-bg: var(--color-secondary-800);
  }

  :global(.dark) .section[data-variant='card'] {
    --section-bg: var(--color-secondary-800);
    border-color: var(--color-secondary-700);
  }

  /* Header */
  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .section-title-group {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .section-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: var(--color-primary-600);
  }

  :global(.dark) .section-icon {
    color: var(--color-primary-400);
  }

  .section-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    line-height: 1.25;
    color: var(--color-secondary-900);
  }

  :global(.dark) .section-title {
    color: var(--color-secondary-100);
  }

  .section-description {
    margin-top: var(--spacing-xs);
    font-size: var(--text-base);
    color: var(--color-secondary-600);
  }

  :global(.dark) .section-description {
    color: var(--color-secondary-400);
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  /* Footer */
  .section-footer {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--color-secondary-200);
  }

  :global(.dark) .section-footer {
    border-color: var(--color-secondary-700);
  }
</style>
