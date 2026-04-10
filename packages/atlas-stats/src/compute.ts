import type {
  AtlasStatsCache,
  DashboardStats,
  PackageRow,
  Period,
} from "./types.js";
import { PERIOD_DAYS } from "./types.js";

const startOfPeriod = (period: Period): string => {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - PERIOD_DAYS[period] + 1);
  return d.toISOString().slice(0, 10);
};

export const computeStats = (
  cache: AtlasStatsCache,
  period: Period,
): DashboardStats => {
  const fromISO = startOfPeriod(period);

  const releases = cache.releases.filter(
    (r) => r.published_at >= fromISO,
  ).length;

  let packagesActive = 0;
  let downloadsTotal = 0;
  const packageRows: PackageRow[] = [];

  for (const pkg of cache.packages) {
    const allPoints = cache.downloads[pkg.name] ?? [];
    const filtered = allPoints.filter((d) => d.day >= fromISO);
    const total = filtered.reduce((sum, d) => sum + d.downloads, 0);

    if (pkg.date >= fromISO) packagesActive++;
    downloadsTotal += total;

    packageRows.push({
      name: pkg.name,
      version: pkg.version,
      lastPublishedAt: pkg.date,
      dailyDownloads: filtered,
      totalDownloads: total,
    });
  }

  packageRows.sort((a, b) => b.totalDownloads - a.totalDownloads);

  return {
    period,
    cachedAt: cache.savedAt,
    kpi: {
      releases,
      packagesTotal: cache.packages.length,
      packagesActive,
      downloadsTotal,
    },
    packages: packageRows,
  };
};
