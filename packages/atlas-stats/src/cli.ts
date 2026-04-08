import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { computeStats } from "./compute.js";
import { fetchReleases } from "./github.js";
import { fetchAllDownloads, fetchNpmPackages } from "./npm.js";
import { writeCache } from "./cache.js";
import type {
  AtlasStatsCache,
  GithubRelease,
  NpmDailyPoint,
  NpmPackageMeta,
  Period,
} from "./types.js";

const WORKSPACE_MARKER = "pnpm-workspace.yaml";
const ENV_FILES = ["apps/atlas-dashboard/.env", ".env"];
const PACKAGE_SCOPE = "@univ-lehavre/";

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.cause instanceof Error && error.cause.message !== "") {
      return `${error.message} (${error.cause.message})`;
    }
    return error.message;
  }
  return String(error);
};

const cacheAgeInMinutes = (savedAt: number): number =>
  Math.round((Date.now() - savedAt) / 60_000);

const parseEnvLine = (line: string): [string, string] | null => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  const idx = trimmed.indexOf("=");
  if (idx < 1) return null;
  const key = trimmed.slice(0, idx).trim();
  const raw = trimmed.slice(idx + 1).trim();
  return [key, raw.replaceAll(/^"|"$|^'|'$/g, "")];
};

const readEnvFileVar = async (
  filePath: string,
  key: string,
): Promise<string | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (entry !== null && entry[0] === key) return entry[1];
    }
    return null;
  } catch {
    return null;
  }
};

const normalizePackageCandidate = (
  candidate: string,
  knownPackages: Set<string>,
): string | null => {
  if (candidate === "") return null;
  if (knownPackages.has(candidate)) return candidate;

  if (!candidate.startsWith("@")) {
    const scoped = `${PACKAGE_SCOPE}${candidate}`;
    if (knownPackages.has(scoped)) return scoped;
  }

  if (candidate.startsWith("univ-lehavre/")) {
    const scoped = `@${candidate}`;
    if (knownPackages.has(scoped)) return scoped;
  }

  return null;
};

const packageFromReleaseTag = (
  tag: string,
  knownPackages: Set<string>,
): string | null => {
  const atIdx = tag.lastIndexOf("@");
  if (atIdx <= 0) return null;
  const candidate = tag.slice(0, atIdx).trim();
  return normalizePackageCandidate(candidate, knownPackages);
};

const buildReleaseCountByPackage = (
  releases: GithubRelease[],
  knownPackages: Set<string>,
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const release of releases) {
    const pkg = packageFromReleaseTag(release.tag_name, knownPackages);
    if (pkg === null) continue;
    counts.set(pkg, (counts.get(pkg) ?? 0) + 1);
  }
  return counts;
};

const readWorkspacePackageNames = async (
  workspaceRoot: string,
): Promise<Set<string>> => {
  const names = new Set<string>();
  const skipDirs = new Set([
    ".git",
    "node_modules",
    "dist",
    ".pnpm-store",
    ".turbo",
    ".next",
    ".svelte-kit",
    "coverage",
  ]);

  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || entry.name !== "package.json") continue;
      try {
        const raw = await readFile(fullPath, "utf8");
        const parsed = JSON.parse(raw) as { name?: string };
        if (typeof parsed.name === "string" && parsed.name.trim() !== "") {
          names.add(parsed.name);
        }
      } catch {
        // Ignore invalid package.json outside this scope.
      }
    }
  };

  await walk(workspaceRoot);
  return names;
};

export const resolveWorkspaceRoot = (): string => {
  let cursor = process.cwd();
  for (;;) {
    if (existsSync(path.join(cursor, WORKSPACE_MARKER))) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) return process.cwd();
    cursor = parent;
  }
};

export const resolveToken = async (
  argToken: string | null,
  workspaceRoot: string,
): Promise<string | null> => {
  if (argToken !== null && argToken !== "") return argToken;
  const envVar = process.env["GITHUB_TOKEN"];
  if (envVar !== undefined && envVar !== "") return envVar;
  for (const file of ENV_FILES) {
    const value = await readEnvFileVar(
      path.resolve(workspaceRoot, file),
      "GITHUB_TOKEN",
    );
    if (value !== null && value !== "") return value;
  }
  return null;
};

export interface CollectAtlasStatsHooks {
  onProgress?: (message: string) => void;
  onWarning?: (message: string) => void;
}

export const collectAtlasStats = async (
  token: string,
  hooks: CollectAtlasStatsHooks = {},
): Promise<AtlasStatsCache> => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 89);

  let githubOk = false;
  let npmPackagesOk = false;

  hooks.onProgress?.("Récupération des releases GitHub…");
  let releases: GithubRelease[] = [];
  try {
    releases = await fetchReleases(token);
    githubOk = true;
  } catch (error) {
    hooks.onWarning?.(
      `Impossible de récupérer les releases GitHub: ${formatErrorMessage(error)}`,
    );
  }
  hooks.onProgress?.(
    `${String(releases.length)} releases récupérées — paquets npm…`,
  );

  let packages: NpmPackageMeta[];
  try {
    packages = await fetchNpmPackages();
    npmPackagesOk = true;
  } catch (error) {
    packages = [];
    hooks.onWarning?.(
      `Impossible de récupérer la liste des paquets npm: ${formatErrorMessage(error)}`,
    );
  }
  hooks.onProgress?.(
    `${String(packages.length)} paquets npm trouvés — téléchargements…`,
  );

  let downloads: Record<string, NpmDailyPoint[]> = {};
  if (packages.length > 0) {
    try {
      downloads = await fetchAllDownloads(
        packages,
        start,
        end,
        (done, total) => {
          hooks.onProgress?.(
            `Téléchargements ${String(done)}/${String(total)}…`,
          );
        },
      );
    } catch (error) {
      hooks.onWarning?.(
        `Impossible de récupérer les téléchargements npm: ${formatErrorMessage(error)}`,
      );
    }
  }

  if (!githubOk && !npmPackagesOk) {
    throw new Error(
      "Aucune source réseau récupérable (GitHub et npm indisponibles)",
    );
  }

  const cache: AtlasStatsCache = {
    savedAt: Date.now(),
    releases,
    packages,
    downloads,
  };
  await writeCache(cache);
  hooks.onProgress?.(
    `Collecte terminée — ${String(packages.length)} paquets, ${String(releases.length)} releases`,
  );
  return cache;
};

export interface CollectAtlasStatsWithFallbackHooks extends CollectAtlasStatsHooks {
  onFallback?: (message: string) => void;
}

export const collectAtlasStatsWithFallback = async (
  token: string,
  fallbackCache: AtlasStatsCache | null,
  hooks: CollectAtlasStatsWithFallbackHooks = {},
): Promise<AtlasStatsCache> => {
  try {
    return await collectAtlasStats(token, hooks);
  } catch (error) {
    if (fallbackCache !== null) {
      hooks.onFallback?.(
        [
          `Collecte réseau échouée: ${formatErrorMessage(error)}`,
          `Utilisation du cache existant (${String(cacheAgeInMinutes(fallbackCache.savedAt))} min, possiblement obsolète).`,
        ].join(" "),
      );
      return fallbackCache;
    }
    throw error;
  }
};

export interface AtlasCliRow {
  packageName: string;
  version: string;
  npmPresent: boolean;
  ghPresent: boolean;
  npmReleaseCount: number | null;
  ghReleaseCount: number;
  monorepoPresent: boolean;
  lastPublishedAt: string;
  totalDownloads: number;
}

export interface AtlasCliReport {
  warnings: string[];
  summary: {
    githubReleasesForPeriod: number;
    githubReleasesApiTotal: number;
    githubReleasesMappedTotal: number;
    npmReleasesTotalLabel: string;
    packagesTotal: number;
    packagesActive: number;
    downloadsTotal: number;
  };
  rows: AtlasCliRow[];
  splitIndex: number;
  totals: {
    npmReleasesLabel: string;
    ghReleasesTotal: number;
    downloadsTotal: number;
  };
}

export const buildAtlasCliReport = async (
  cache: AtlasStatsCache,
  period: Period,
  workspaceRoot: string,
): Promise<AtlasCliReport> => {
  const warnings: string[] = [];
  const stats = computeStats(cache, period);

  let workspacePackageNames = new Set<string>();
  try {
    workspacePackageNames = await readWorkspacePackageNames(workspaceRoot);
  } catch (error) {
    warnings.push(
      `Impossible de lire la liste des paquets du monorepo: ${formatErrorMessage(error)}`,
    );
  }

  const knownPackages = new Set<string>([
    ...stats.packages.map((pkg) => pkg.name),
    ...workspacePackageNames,
  ]);
  const githubReleaseCountByPackage = buildReleaseCountByPackage(
    cache.releases,
    knownPackages,
  );
  const npmReleaseCountByPackage = new Map<string, number | null>(
    cache.packages.map((pkg) => {
      if (pkg.publishDates !== undefined && pkg.publishDates.length > 0) {
        return [pkg.name, pkg.publishDates.length];
      }
      if (pkg.date !== "") return [pkg.name, null];
      return [pkg.name, 0];
    }),
  );

  const rows = [...stats.packages]
    .toSorted((a, b) => {
      const inMonorepoA = workspacePackageNames.has(a.name) ? 1 : 0;
      const inMonorepoB = workspacePackageNames.has(b.name) ? 1 : 0;
      if (inMonorepoA !== inMonorepoB) return inMonorepoB - inMonorepoA;
      return a.name.localeCompare(b.name);
    })
    .map((pkg) => {
      const ghReleaseCount = githubReleaseCountByPackage.get(pkg.name) ?? 0;
      return {
        packageName: pkg.name,
        version: pkg.version,
        npmPresent: true,
        ghPresent: ghReleaseCount > 0,
        npmReleaseCount: npmReleaseCountByPackage.get(pkg.name) ?? null,
        ghReleaseCount,
        monorepoPresent: workspacePackageNames.has(pkg.name),
        lastPublishedAt: pkg.lastPublishedAt,
        totalDownloads: pkg.totalDownloads,
      } satisfies AtlasCliRow;
    });

  const splitIndex = rows.findIndex((row) => !row.monorepoPresent);
  const npmKnownReleasesTotal = rows.reduce(
    (sum, row) => sum + (row.npmReleaseCount ?? 0),
    0,
  );
  const npmUnknownReleasePackages = rows.filter(
    (row) => row.npmReleaseCount === null,
  ).length;
  const npmReleasesTotalLabel =
    npmUnknownReleasePackages > 0
      ? `>=${String(npmKnownReleasesTotal + npmUnknownReleasePackages)}`
      : String(npmKnownReleasesTotal);
  const ghReleasesTotal = rows.reduce(
    (sum, row) => sum + row.ghReleaseCount,
    0,
  );
  const downloadsTotal = rows.reduce((sum, row) => sum + row.totalDownloads, 0);

  return {
    warnings,
    summary: {
      githubReleasesForPeriod: stats.kpi.releases,
      githubReleasesApiTotal: cache.releases.length,
      githubReleasesMappedTotal: ghReleasesTotal,
      npmReleasesTotalLabel,
      packagesTotal: stats.kpi.packagesTotal,
      packagesActive: stats.kpi.packagesActive,
      downloadsTotal: stats.kpi.downloadsTotal,
    },
    rows,
    splitIndex: splitIndex === -1 ? rows.length : splitIndex,
    totals: {
      npmReleasesLabel: npmReleasesTotalLabel,
      ghReleasesTotal,
      downloadsTotal,
    },
  };
};
