import type { NpmDailyPoint, NpmPackageMeta } from "./types.js";

const REGISTRY = "https://registry.npmjs.org";
const DOWNLOADS = "https://api.npmjs.org/downloads";
const DOWNLOAD_BATCH_SIZE = 50;

const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

const formatDate = (d: Date): string => d.toISOString().slice(0, 10);

// ── Package list ──────────────────────────────────────────────────────────────

const fetchOrgPackageNames = async (): Promise<string[]> => {
  const names: string[] = [];
  let cursor: string | null = null;
  do {
    const url =
      `${REGISTRY}/-/org/univ-lehavre/package` +
      (cursor !== null ? `?startkey=${encodeURIComponent(cursor)}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`npm org API ${String(res.status)}`);
    const page = (await res.json()) as Record<string, string>;
    const keys = Object.keys(page);
    if (keys.length === 0) break;
    names.push(...keys);
    cursor = keys.length === 250 ? (keys.at(-1) ?? null) : null;
  } while (cursor !== null);
  return names;
};

const fetchPackageMeta = async (name: string): Promise<NpmPackageMeta> => {
  const url = `${REGISTRY}/${encodeURIComponent(name)}/latest`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`npm metadata ${String(res.status)} for ${name}`);
  const body = (await res.json()) as {
    name: string;
    version: string;
    _time?: string;
  };
  if (body._time !== undefined) {
    return { name: body.name, version: body.version, date: body._time };
  }
  const full = await fetch(`${REGISTRY}/${encodeURIComponent(name)}`);
  if (!full.ok) return { name: body.name, version: body.version, date: "" };
  const fullBody = (await full.json()) as { time?: Record<string, string> };
  const date = fullBody.time?.[body.version] ?? "";
  return { name: body.name, version: body.version, date };
};

export const fetchNpmPackages = async (): Promise<NpmPackageMeta[]> => {
  const names = await fetchOrgPackageNames();
  return Promise.all(names.map(fetchPackageMeta));
};

// ── Downloads ─────────────────────────────────────────────────────────────────

interface NpmDownloadEntry {
  package: string;
  start: string;
  end: string;
  downloads: NpmDailyPoint[];
}

type NpmBulkResponse = Record<string, NpmDownloadEntry>;

const fetchDownloadsBatch = async (
  names: string[],
  start: Date,
  end: Date,
): Promise<NpmBulkResponse> => {
  const range = `${formatDate(start)}:${formatDate(end)}`;
  const pkgParam = names.map(encodeURIComponent).join(",");
  const url = `${DOWNLOADS}/range/${range}/${pkgParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`npm downloads ${String(res.status)}`);
  const raw = (await res.json()) as NpmBulkResponse | NpmDownloadEntry;
  if (
    "downloads" in raw &&
    Array.isArray((raw as NpmDownloadEntry).downloads)
  ) {
    const entry = raw as NpmDownloadEntry;
    const key = names[0];
    return key !== undefined ? { [key]: entry } : {};
  }
  return raw as NpmBulkResponse;
};

export type OnBatchDone = (done: number, total: number) => void;

export const fetchAllDownloads = async (
  packages: NpmPackageMeta[],
  start: Date,
  end: Date,
  onBatchDone: OnBatchDone,
): Promise<Record<string, NpmDailyPoint[]>> => {
  const names = packages.map((p) => p.name);
  const batches = chunk(names, DOWNLOAD_BATCH_SIZE);
  const result: Record<string, NpmDailyPoint[]> = {};
  let done = 0;

  for (const batch of batches) {
    const batchResult = await fetchDownloadsBatch(batch, start, end);
    for (const [name, data] of Object.entries(batchResult)) {
      result[name] = data.downloads;
    }
    done += batch.length;
    onBatchDone(done, names.length);
  }

  return result;
};
