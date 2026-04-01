/**
 * Repository page content - French.
 */

import { commonLabels, pageTitle } from '$lib/content/core/brand';
import type { RepositoryContent } from '$lib/content/types';

/**
 * French repository content.
 */
export const fr: RepositoryContent = {
  meta: {
    title: pageTitle('Statistiques du dépôt'),
  },
  header: {
    title: 'Statistiques du dépôt',
  },
  columns: {
    period: 'Période',
    commits: 'Commits',
    additions: 'Additions',
    deletions: 'Deletions',
    authors: 'Auteurs',
  },
  sections: {
    githubLinks: 'Liens GitHub',
    history: 'Historique',
    recentActivity: 'Activité récente',
    sourceCode: 'Code Source TypeScript',
    tests: 'Tests',
    githubIssues: 'Issues GitHub',
    githubPRs: 'Pull Requests GitHub',
  },
  labels: {
    repository: 'Dépôt',
    issues: 'Issues',
    newIssue: 'Nouvelle Issue',
    pullRequests: 'Pull Requests',
    discussions: 'Discussions',
    open: 'ouvertes',
    commits: 'Commits',
    additions: 'Additions',
    deletions: 'Deletions',
    net: commonLabels.net,
    firstCommit: 'Premier commit',
    lastCommit: 'Dernier commit',
    files: 'Fichiers',
    exportedConstants: 'Constantes exportées',
    exportedFunctions: 'Fonctions exportées',
    exportedTypes: 'Types/Interfaces exportés',
    testFiles: 'Fichiers de test',
    describeBlocks: 'Blocs describe',
    testCases: 'Tests (it/test)',
    opened: 'Ouvertes',
    closed: 'Fermées',
    periods: 'périodes',
    activityCaption: 'Activité du dépôt',
  },
};
