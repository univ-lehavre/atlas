export interface CodeStats {
  files: number;
  functions: number;
  types: number;
  interfaces: number;
  constants: number;
  tsdocComments: number;
}
export interface TestStats {
  files: number;
  describes: number;
  tests: number;
}
export interface TimelineEntry {
  period: string;
  commits: number;
  additions: number;
  deletions: number;
  filesChanged: number;
}
export interface PackageStats {
  name: string;
  path: string;
  version: string | null;
  private: boolean;
  code: CodeStats;
  tests: TestStats;
  latestCommit: string | null;
  commitCount: number;
  prCount: number;
  releaseCount: number;
  linesAdded: number;
  linesDeleted: number;
}
export interface RepoStats {
  generatedAt: string;
  repository: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    firstCommit: string | null;
    lastCommit: string | null;
  };
  packages: PackageStats[];
  timeline: {
    daily: TimelineEntry[];
    weekly: TimelineEntry[];
    monthly: TimelineEntry[];
  };
  current: {
    code: CodeStats;
    tests: TestStats;
  };
}
