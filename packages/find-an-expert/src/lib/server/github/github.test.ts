import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseGitHubUrl,
  buildGitHubUrl,
  buildIssuesUrl,
  buildNewIssueUrl,
  buildPullRequestsUrl,
  buildDiscussionsUrl,
  getGitHubRepoFromPath,
  getGitHubStats,
} from './service';
import { emptyGitHubItemStats, emptyGitHubStats } from './types';

vi.mock('simple-git', () => {
  return {
    default: vi.fn(),
  };
});

describe('github service', () => {
  describe('parseGitHubUrl', () => {
    it('should parse HTTPS URL', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse HTTPS URL without .git', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse SSH URL', () => {
      const result = parseGitHubUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for non-GitHub URL', () => {
      const result = parseGitHubUrl('https://gitlab.com/owner/repo');
      expect(result).toBeNull();
    });

    it('should return null for invalid URL', () => {
      const result = parseGitHubUrl('not-a-url');
      expect(result).toBeNull();
    });
  });

  describe('buildGitHubUrl', () => {
    it('should build repository URL', () => {
      const result = buildGitHubUrl('owner', 'repo');
      expect(result).toBe('https://github.com/owner/repo');
    });
  });

  describe('buildIssuesUrl', () => {
    it('should build issues URL', () => {
      const result = buildIssuesUrl('owner', 'repo');
      expect(result).toBe('https://github.com/owner/repo/issues');
    });
  });

  describe('buildNewIssueUrl', () => {
    it('should build new issue URL', () => {
      const result = buildNewIssueUrl('owner', 'repo');
      expect(result).toBe('https://github.com/owner/repo/issues/new');
    });
  });

  describe('buildPullRequestsUrl', () => {
    it('should build pull requests URL', () => {
      const result = buildPullRequestsUrl('owner', 'repo');
      expect(result).toBe('https://github.com/owner/repo/pulls');
    });
  });

  describe('buildDiscussionsUrl', () => {
    it('should build discussions URL', () => {
      const result = buildDiscussionsUrl('owner', 'repo');
      expect(result).toBe('https://github.com/owner/repo/discussions');
    });
  });
});

describe('github types', () => {
  describe('emptyGitHubItemStats', () => {
    it('should return zeros', () => {
      const result = emptyGitHubItemStats();
      expect(result.open).toBe(0);
      expect(result.closed).toBe(0);
    });
  });

  describe('emptyGitHubStats', () => {
    it('should return empty stats', () => {
      const result = emptyGitHubStats();
      expect(result.issues.open).toBe(0);
      expect(result.issues.closed).toBe(0);
      expect(result.pullRequests.open).toBe(0);
      expect(result.pullRequests.closed).toBe(0);
      expect(result.repoUrl).toBeNull();
    });
  });
});

describe('getGitHubRepoFromPath', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return repo info from origin remote', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockResolvedValue([
        {
          name: 'origin',
          refs: { fetch: 'https://github.com/owner/repo.git' },
        },
      ]),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    const result = await getGitHubRepoFromPath('/path/to/repo');

    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should return null when no origin remote', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockResolvedValue([
        {
          name: 'upstream',
          refs: { fetch: 'https://github.com/other/repo.git' },
        },
      ]),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    const result = await getGitHubRepoFromPath('/path/to/repo');

    expect(result).toBeNull();
  });

  it('should return null when no remotes', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    const result = await getGitHubRepoFromPath('/path/to/repo');

    expect(result).toBeNull();
  });

  it('should return null when git throws error', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockRejectedValue(new Error('Not a git repo')),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    const result = await getGitHubRepoFromPath('/path/to/not-a-repo');

    expect(result).toBeNull();
  });
});

describe('getGitHubStats', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty stats when repo has no GitHub remote', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    const result = await getGitHubStats('/path/to/repo');

    expect(result).toEqual(emptyGitHubStats());
  });

  it('should fetch and return GitHub stats', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockResolvedValue([
        {
          name: 'origin',
          refs: { fetch: 'https://github.com/owner/repo.git' },
        },
      ]),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve([{ id: 1 }]),
    } as Response);

    const result = await getGitHubStats('/path/to/repo');

    expect(result.repoUrl).toBe('https://github.com/owner/repo');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle GitHub API errors gracefully', async () => {
    const simpleGit = await import('simple-git');
    const mockGit = {
      getRemotes: vi.fn().mockResolvedValue([
        {
          name: 'origin',
          refs: { fetch: 'https://github.com/owner/repo.git' },
        },
      ]),
    };
    vi.mocked(simpleGit.default).mockReturnValue(mockGit as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    const result = await getGitHubStats('/path/to/repo');

    expect(result.issues.open).toBe(0);
    expect(result.pullRequests.open).toBe(0);
  });
});
