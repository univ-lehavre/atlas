import type { NpmDailyPoint, NpmPackageMeta } from "./types.js";

const REGISTRY = "https://registry.npmjs.org";
const DOWNLOADS = "https://api.npmjs.org/downloads";
const DOWNLOAD_BATCH_SIZE = 20;
const MAX_DOWNLOAD_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 700;
const INTER_BATCH_DELAY_MS = 250;

const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

const formatDate = (d: Date): string => d.toISOString().slice(0, 10);

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const parseRetryAfterMs = (value: string | null): number | null => {
  if (value === null) return null;
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.floor(asSeconds * 1000);
  }
  const at = Date.parse(value);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - Date.now());
};

const isRetryableDownloadStatus = (status: number): boolean =>
  status === 429 ||
  status === 500 ||
  status === 502 ||
  status === 503 ||
  status === 504;

const extractPublishDates = (
  time: Record<string, string> | undefined,
): string[] =>
  Object.entries(time ?? {})
    .filter(
      ([version, publishedAt]) =>
        version !== "created" && version !== "modified" && publishedAt !== "",
    )
    .map(([, publishedAt]) => publishedAt)
    .toSorted();

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
  const encodedName = encodeURIComponent(name);
  const latestUrl = `${REGISTRY}/${encodedName}/latest`;
  const res = await fetch(latestUrl);
  if (!res.ok)
    throw new Error(`npm metadata ${String(res.status)} for ${name}`);
  const body = (await res.json()) as {
    name: string;
    version: string;
    _time?: string;
  };

  const full = await fetch(`${REGISTRY}/${encodedName}`);
  if (!full.ok) {
    const date = body._time ?? "";
    return {
      name: body.name,
      version: body.version,
      date,
      publishDates: date === "" ? [] : [date],
    };
  }

  const fullBody = (await full.json()) as {
    name?: string;
    time?: Record<string, string>;
  };
  const date = fullBody.time?.[body.version] ?? body._time ?? "";
  return {
    name: fullBody.name ?? body.name,
    version: body.version,
    date,
    publishDates: extractPublishDates(fullBody.time),
  };
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

const mergeBulkResponses = (
  a: NpmBulkResponse,
  b: NpmBulkResponse,
): NpmBulkResponse => ({ ...a, ...b });

const fetchDownloadsBatch = async (
  names: string[],
  start: Date,
  end: Date,
): Promise<NpmBulkResponse> => {
  const range = `${formatDate(start)}:${formatDate(end)}`;
  const pkgParam = names.map(encodeURIComponent).join(",");
  const url = `${DOWNLOADS}/range/${range}/${pkgParam}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt <= MAX_DOWNLOAD_RETRIES; attempt += 1) {
    res = await fetch(url);
    if (res.ok) break;

    if (
      !isRetryableDownloadStatus(res.status) ||
      attempt === MAX_DOWNLOAD_RETRIES
    ) {
      throw new Error(`npm downloads ${String(res.status)}`);
    }

    const headerDelay = parseRetryAfterMs(res.headers.get("retry-after"));
    const fallbackDelay = BASE_RETRY_DELAY_MS * 2 ** attempt;
    await sleep(headerDelay ?? fallbackDelay);
  }

  if (res?.ok !== true) throw new Error("npm downloads fetch failed");
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

const fetchDownloadsBatchResilient = async (
  names: string[],
  start: Date,
  end: Date,
): Promise<NpmBulkResponse> => {
  try {
    return await fetchDownloadsBatch(names, start, end);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (!error.message.startsWith("npm downloads 400")) throw error;

    // npm may reject a whole bulk request when one package name is problematic.
    // Isolate failures by bisecting batches; skip only the offending single package.
    if (names.length <= 1) return {};

    const mid = Math.floor(names.length / 2);
    const left = names.slice(0, mid);
    const right = names.slice(mid);

    const [leftData, rightData] = await Promise.all([
      fetchDownloadsBatchResilient(left, start, end),
      fetchDownloadsBatchResilient(right, start, end),
    ]);

    return mergeBulkResponses(leftData, rightData);
  }
};

const fetchDownloadsBatchBestEffort = async (
  batch: string[],
  start: Date,
  end: Date,
): Promise<NpmBulkResponse> => {
  try {
    return await fetchDownloadsBatchResilient(batch, start, end);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.startsWith("npm downloads 429") ||
      batch.length <= 1
    ) {
      return {};
    }
  }

  const result: NpmBulkResponse = {};
  for (const pkgName of batch) {
    try {
      const singleResult = await fetchDownloadsBatchResilient(
        [pkgName],
        start,
        end,
      );
      const data = singleResult[pkgName];
      if (data !== undefined) {
        result[pkgName] = data;
      }
    } catch {
      // Ignore individual package failure and continue with others.
    }
    await sleep(INTER_BATCH_DELAY_MS);
  }
  return result;
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
    const batchResult = await fetchDownloadsBatchBestEffort(batch, start, end);
    for (const [name, data] of Object.entries(batchResult)) {
      result[name] = data.downloads;
    }
    done += batch.length;
    onBatchDone(done, names.length);
    await sleep(INTER_BATCH_DELAY_MS);
  }

  return result;
};
