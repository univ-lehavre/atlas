<script lang="ts">
  import type { PageData } from './$types';
  import {
    Alert,
    ButtonGroup,
    Card,
    DataTable,
    Grid,
    InfoCard,
    KeyValue,
    LinkButton,
    PageHeader,
    PageLayout,
    StatCard,
  } from '$lib/components';
  import { useI18n } from '$lib/content';

  const i18n = useI18n();
  const repository = $derived(i18n.repository);

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  /**
   * Format a date to French locale string
   */
  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Calculate net changes (additions - deletions)
   */
  const netChanges = $derived.by(() => {
    if (!data.stats) return 0;
    return data.stats.totalAdditions - data.stats.totalDeletions;
  });

  /**
   * Format net changes with sign
   */
  const formatNet = (value: number): string => {
    return value > 0 ? `+${value}` : String(value);
  };

  /**
   * Activity table columns definition
   */
  type HourlyStatRow = {
    period: string;
    commits: number;
    additions: number;
    deletions: number;
    authors: string[];
  };

  const activityColumns = $derived([
    { key: 'period', label: repository.columns.period },
    { key: 'commits', label: repository.columns.commits },
    { key: 'additions', label: repository.columns.additions },
    { key: 'deletions', label: repository.columns.deletions },
    { key: 'authors', label: repository.columns.authors },
  ]);

  /**
   * Reversed activity data (most recent first)
   */
  const activityData = $derived.by((): HourlyStatRow[] => {
    if (!data.stats?.hourlyStats) return [];
    return data.stats.hourlyStats.slice(-20).reverse();
  });
</script>

<svelte:head>
  <title>{repository.meta.title}</title>
</svelte:head>

<PageLayout maxWidth="xl">
  <PageHeader title={repository.header.title} class="mb-8" />

  {#if data.error}
    <Alert variant="error">
      {data.error}
    </Alert>
  {:else if data.stats}
    <!-- GitHub Links -->
    {#if data.githubUrls?.repository}
      <Card class="mb-6">
        <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          {repository.sections.githubLinks}
        </h2>
        <ButtonGroup>
          {#if data.githubUrls.repository}
            <LinkButton href={data.githubUrls.repository} variant="dark" icon="mdi:github" external>
              {repository.labels.repository}
            </LinkButton>
          {/if}
          {#if data.githubUrls.issues}
            <LinkButton href={data.githubUrls.issues} variant="success" external>
              {repository.labels.issues} ({data.stats.github.issues.open}
              {repository.labels.open})
            </LinkButton>
          {/if}
          {#if data.githubUrls.newIssue}
            <LinkButton href={data.githubUrls.newIssue} variant="primary" external>
              {repository.labels.newIssue}
            </LinkButton>
          {/if}
          {#if data.githubUrls.pullRequests}
            <LinkButton href={data.githubUrls.pullRequests} variant="accent" external>
              {repository.labels.pullRequests} ({data.stats.github.pullRequests.open}
              {repository.labels.open})
            </LinkButton>
          {/if}
          {#if data.githubUrls.discussions}
            <LinkButton href={data.githubUrls.discussions} variant="secondary" external>
              {repository.labels.discussions}
            </LinkButton>
          {/if}
        </ButtonGroup>
      </Card>
    {/if}

    <!-- Overview Stats -->
    <Grid cols={4} gap="md" class="mb-6">
      <StatCard label={repository.labels.commits} value={data.stats.totalCommits} />
      <StatCard
        label={repository.labels.additions}
        value={data.stats.totalAdditions}
        variant="success"
        prefix="+"
      />
      <StatCard
        label={repository.labels.deletions}
        value={data.stats.totalDeletions}
        variant="error"
        prefix="-"
      />
      <StatCard label={repository.labels.net} value={formatNet(netChanges)} />
    </Grid>

    <!-- Date Range -->
    <Card class="mb-6">
      <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
        {repository.sections.history}
      </h2>
      <Grid cols={2} gap="md">
        <KeyValue
          label={repository.labels.firstCommit}
          value={formatDate(data.stats.firstCommitDate)}
          direction="vertical"
        />
        <KeyValue
          label={repository.labels.lastCommit}
          value={formatDate(data.stats.lastCommitDate)}
          direction="vertical"
        />
      </Grid>
    </Card>

    <!-- Code Stats -->
    <Grid cols={2} gap="lg" class="mb-6">
      <InfoCard title={repository.sections.sourceCode} icon="lucide:code">
        <div class="space-y-3">
          <KeyValue label={repository.labels.files} value={data.stats.currentCode.files} />
          <KeyValue
            label={repository.labels.exportedConstants}
            value={data.stats.currentCode.constants}
          />
          <KeyValue
            label={repository.labels.exportedFunctions}
            value={data.stats.currentCode.functions}
          />
          <KeyValue label={repository.labels.exportedTypes} value={data.stats.currentCode.types} />
        </div>
      </InfoCard>

      <InfoCard title={repository.sections.tests} icon="lucide:test-tube">
        <div class="space-y-3">
          <KeyValue label={repository.labels.testFiles} value={data.stats.currentTests.files} />
          <KeyValue
            label={repository.labels.describeBlocks}
            value={data.stats.currentTests.describes}
          />
          <KeyValue label={repository.labels.testCases} value={data.stats.currentTests.tests} />
        </div>
      </InfoCard>
    </Grid>

    <!-- GitHub Stats -->
    <Grid cols={2} gap="lg" class="mb-6">
      <InfoCard title={repository.sections.githubIssues} icon="lucide:circle-dot">
        <div class="space-y-3">
          <KeyValue
            label={repository.labels.opened}
            value={data.stats.github.issues.open}
            variant="success"
          />
          <KeyValue
            label={repository.labels.closed}
            value={data.stats.github.issues.closed}
            variant="muted"
          />
        </div>
      </InfoCard>

      <InfoCard title={repository.sections.githubPRs} icon="lucide:git-pull-request">
        <div class="space-y-3">
          <KeyValue
            label={repository.labels.opened}
            value={data.stats.github.pullRequests.open}
            variant="accent"
          />
          <KeyValue
            label={repository.labels.closed}
            value={data.stats.github.pullRequests.closed}
            variant="muted"
          />
        </div>
      </InfoCard>
    </Grid>

    <!-- Activity Timeline -->
    {#if activityData.length > 0}
      <Card>
        <h2 class="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          {repository.sections.recentActivity} ({data.stats.hourlyStats.length}
          {repository.labels.periods})
        </h2>
        <DataTable
          data={activityData}
          columns={activityColumns}
          caption={repository.labels.activityCaption}
        >
          {#snippet cell(item, column)}
            {#if column.key === 'additions'}
              <span class="text-success-600 dark:text-success-500">+{item.additions}</span>
            {:else if column.key === 'deletions'}
              <span class="text-error-600 dark:text-error-500">-{item.deletions}</span>
            {:else if column.key === 'authors'}
              <span class="text-secondary-500 dark:text-secondary-400">
                {item.authors.join(', ')}
              </span>
            {:else}
              {item[column.key as keyof HourlyStatRow]}
            {/if}
          {/snippet}
        </DataTable>
      </Card>
    {/if}
  {/if}
</PageLayout>
