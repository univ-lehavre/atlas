import { z } from 'zod';

/**
 * GitHub issue/PR count statistics.
 */
const GitHubItemStats = z.object({
  open: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
});

export type TGitHubItemStats = z.infer<typeof GitHubItemStats>;

/**
 * GitHub repository statistics (issues and pull requests).
 */
export const GitHubStats = z.object({
  issues: GitHubItemStats,
  pullRequests: GitHubItemStats,
  repoUrl: z.string().nullable(),
});

export type TGitHubStats = z.infer<typeof GitHubStats>;

/**
 * GitHub repository identifier.
 */
export const GitHubRepo = z.object({
  owner: z.string(),
  repo: z.string(),
});

export type TGitHubRepo = z.infer<typeof GitHubRepo>;

/**
 * Creates empty GitHub item statistics.
 */
export const emptyGitHubItemStats = (): TGitHubItemStats => ({
  open: 0,
  closed: 0,
});

/**
 * Creates empty GitHub statistics.
 */
export const emptyGitHubStats = (): TGitHubStats => ({
  issues: emptyGitHubItemStats(),
  pullRequests: emptyGitHubItemStats(),
  repoUrl: null,
});
