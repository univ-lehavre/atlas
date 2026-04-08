export type {
  Period,
  GithubRelease,
  NpmPackageMeta,
  NpmDailyPoint,
  AtlasStatsCache,
  PackageRow,
  DashboardStats,
} from '@univ-lehavre/atlas-stats';

// SseEvent is dashboard-specific (used only by the SSE server route)
export type SseEvent =
  | { type: 'start'; steps: number }
  | { type: 'progress'; step: number; steps: number; label: string }
  | { type: 'cached'; cachedAt: number }
  | { type: 'done'; cachedAt: number }
  | { type: 'error'; message: string };
