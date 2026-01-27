/**
 * Repository page content - English.
 */

import { commonLabels, pageTitle } from '$lib/content/locales/en/brand';
import type { RepositoryContent } from '$lib/content/types';

/**
 * English repository content.
 */
export const en: RepositoryContent = {
  meta: {
    title: pageTitle('Repository Statistics'),
  },
  header: {
    title: 'Repository Statistics',
  },
  columns: {
    period: 'Period',
    commits: 'Commits',
    additions: 'Additions',
    deletions: 'Deletions',
    authors: 'Authors',
  },
  sections: {
    githubLinks: 'GitHub Links',
    history: 'History',
    recentActivity: 'Recent Activity',
    sourceCode: 'TypeScript Source Code',
    tests: 'Tests',
    githubIssues: 'GitHub Issues',
    githubPRs: 'GitHub Pull Requests',
  },
  labels: {
    repository: 'Repository',
    issues: 'Issues',
    newIssue: 'New Issue',
    pullRequests: 'Pull Requests',
    discussions: 'Discussions',
    open: 'open',
    commits: 'Commits',
    additions: 'Additions',
    deletions: 'Deletions',
    net: commonLabels.net,
    firstCommit: 'First commit',
    lastCommit: 'Last commit',
    files: 'Files',
    exportedConstants: 'Exported constants',
    exportedFunctions: 'Exported functions',
    exportedTypes: 'Exported types/interfaces',
    testFiles: 'Test files',
    describeBlocks: 'Describe blocks',
    testCases: 'Test cases (it/test)',
    opened: 'Open',
    closed: 'Closed',
    periods: 'periods',
    activityCaption: 'Repository activity',
  },
};
