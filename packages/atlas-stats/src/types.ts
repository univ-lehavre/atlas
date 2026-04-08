export type Period = "day" | "week" | "month" | "quarter";

export const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

export interface GithubRelease {
  tag_name: string;
  published_at: string;
}

export interface NpmPackageMeta {
  name: string;
  version: string;
  date: string;
  publishDates?: string[];
}

export interface NpmDailyPoint {
  day: string;
  downloads: number;
}

export interface AtlasStatsCache {
  savedAt: number;
  releases: GithubRelease[];
  packages: NpmPackageMeta[];
  downloads: Record<string, NpmDailyPoint[]>;
}

export interface PackageRow {
  name: string;
  version: string;
  lastPublishedAt: string;
  dailyDownloads: NpmDailyPoint[];
  totalDownloads: number;
}

export interface DashboardStats {
  period: Period;
  cachedAt: number | null;
  kpi: {
    releases: number;
    packagesTotal: number;
    packagesActive: number;
    downloadsTotal: number;
  };
  packages: PackageRow[];
}
