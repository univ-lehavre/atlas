import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  intro,
  outro,
  spinner,
  text,
  select,
  confirm,
  log,
  cancel,
  isCancel,
} from "@clack/prompts";
import {
  readCache,
  writeCache,
  isCacheStale,
  fetchReleases,
  fetchNpmPackages,
  fetchAllDownloads,
  computeStats,
} from "@univ-lehavre/atlas-stats";
import type { Period } from "@univ-lehavre/atlas-stats";

// ── Arg parsing ───────────────────────────────────────────────────────────────

interface CliOptions {
  readonly token: string | null;
  readonly period: Period | null;
  readonly force: boolean;
  readonly json: boolean;
  readonly help: boolean;
}

const PERIOD_VALUES: Period[] = ["day", "week", "month", "quarter"];
const WORKSPACE_MARKER = "pnpm-workspace.yaml";
const ENV_FILES = ["apps/atlas-dashboard/.env", ".env"];

const isPeriod = (v: string): v is Period =>
  (PERIOD_VALUES as string[]).includes(v);

const fail = (message: string): never => {
  throw new Error(message);
};

const parseArgs = (argv: readonly string[]): CliOptions => {
  let token: string | null = null;
  let period: Period | null = null;
  let force = false;
  let json = false;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--token") {
      token = (argv[i + 1] ?? fail("Argument manquant pour --token")).trim();
      i += 1;
    } else if (arg === "--period") {
      const v = (argv[i + 1] ?? fail("Argument manquant pour --period")).trim();
      if (!isPeriod(v))
        fail(`Période invalide: ${v}. Valeurs: day, week, month, quarter`);
      period = v as Period;
      i += 1;
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      fail(`Option inconnue: ${arg}`);
    }
  }

  return { token, period, force, json, help };
};

// ── Token resolution ──────────────────────────────────────────────────────────

const resolveWorkspaceRoot = (): string => {
  let cursor = process.cwd();
  for (;;) {
    if (existsSync(path.join(cursor, WORKSPACE_MARKER))) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) return process.cwd();
    cursor = parent;
  }
};

const parseEnvLine = (line: string): [string, string] | null => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  const idx = trimmed.indexOf("=");
  if (idx < 1) return null;
  const key = trimmed.slice(0, idx).trim();
  const raw = trimmed.slice(idx + 1).trim();
  return [key, raw.replace(/^"|"$|^'|'$/g, "")];
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

const resolveToken = async (
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

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtNumber = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)} k`
      : String(n);

const fmtDate = (iso: string): string => {
  if (iso === "") return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${String(days)} j`;
  return `il y a ${String(Math.floor(days / 30))} mois`;
};

const pad = (s: string, n: number): string => s.padEnd(n, " ");

// ── Collect ───────────────────────────────────────────────────────────────────

const collectData = async (token: string): Promise<void> => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 89);

  const s = spinner();

  s.start("Récupération des releases GitHub…");
  const releases = await fetchReleases(token);
  s.message(`${String(releases.length)} releases récupérées — paquets npm…`);

  const packages = await fetchNpmPackages();
  s.message(
    `${String(packages.length)} paquets npm trouvés — téléchargements…`,
  );

  const downloads = await fetchAllDownloads(
    packages,
    start,
    end,
    (done, total) => {
      s.message(`Téléchargements ${String(done)}/${String(total)}…`);
    },
  );

  s.stop(
    `Collecte terminée — ${String(packages.length)} paquets, ${String(releases.length)} releases`,
  );

  await writeCache({ savedAt: Date.now(), releases, packages, downloads });
};

// ── Main ──────────────────────────────────────────────────────────────────────

export const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(
      [
        "atlas-stats — statistiques GitHub et npm du dépôt Atlas",
        "",
        "Usage:",
        "  atlas-stats [options]",
        "",
        "Options:",
        "  --token <token>              GitHub token (env: GITHUB_TOKEN)",
        "  --period <day|week|month|quarter>  Période à afficher",
        "  --force                      Ignorer le cache existant",
        "  --json                       Sortie JSON brute",
        "  -h, --help                   Aide",
        "",
        "Exemples:",
        "  atlas-stats",
        "  atlas-stats --period week --json",
        "  atlas-stats --force --token ghp_...",
      ].join("\n"),
    );
    return;
  }

  // ── JSON mode (non-interactive) ─────────────────────────────────────────────
  if (options.json) {
    const workspaceRoot = resolveWorkspaceRoot();
    const resolvedToken = await resolveToken(options.token, workspaceRoot);
    const token =
      resolvedToken ??
      fail("GITHUB_TOKEN introuvable. Utilise --token ou configure .env");

    const cache = await readCache();
    if (options.force || cache === null || isCacheStale(cache)) {
      await collectData(token);
    }

    const fresh =
      (await readCache()) ?? fail("Cache introuvable après collecte");
    const period: Period = options.period ?? "week";
    console.log(JSON.stringify(computeStats(fresh, period), null, 2));
    return;
  }

  // ── Interactive mode ────────────────────────────────────────────────────────
  intro("Atlas Stats");

  const workspaceRoot = resolveWorkspaceRoot();
  let token = await resolveToken(options.token, workspaceRoot);

  if (token === null) {
    const answer = await text({
      message: "GitHub token (ou GITHUB_TOKEN dans .env)",
      placeholder: "ghp_…",
      validate: (v) => (v.trim() === "" ? "Token requis" : undefined),
    });
    if (isCancel(answer)) {
      cancel("Annulé.");
      process.exit(0);
    }
    token = answer.trim();
  }

  // Check cache
  const cache = await readCache();
  const cacheUsable = cache !== null && !isCacheStale(cache);

  if (cacheUsable && !options.force) {
    const age = Math.round((Date.now() - cache.savedAt) / 60_000);
    const useCache = await confirm({
      message: `Cache disponible (il y a ${String(age)} min). Utiliser le cache ?`,
      initialValue: true,
    });
    if (isCancel(useCache)) {
      cancel("Annulé.");
      process.exit(0);
    }
    if (!useCache) {
      await collectData(token);
    }
  } else {
    await collectData(token);
  }

  // Period selection
  let period: Period;
  if (options.period !== null) {
    period = options.period;
  } else {
    const answer = await select<Period>({
      message: "Période à afficher",
      options: [
        { value: "day", label: "Jour (1 j)" },
        { value: "week", label: "Semaine (7 j)" },
        { value: "month", label: "Mois (30 j)" },
        { value: "quarter", label: "Trimestre (90 j)" },
      ],
      initialValue: "week",
    });
    if (isCancel(answer)) {
      cancel("Annulé.");
      process.exit(0);
    }
    period = answer;
  }

  const fresh = await readCache();
  if (fresh === null) {
    cancel("Cache introuvable après collecte.");
    process.exit(1);
  }

  const stats = computeStats(fresh, period);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const { kpi } = stats;
  log.info(
    [
      `Releases  : ${String(kpi.releases)}`,
      `Paquets   : ${String(kpi.packagesTotal)} total, ${String(kpi.packagesActive)} actif(s)`,
      `Downloads : ${fmtNumber(kpi.downloadsTotal)}`,
    ].join("\n"),
  );

  // ── Package table ──────────────────────────────────────────────────────────
  const COL_NAME = 38;
  const COL_VER = 10;
  const COL_DATE = 18;
  const COL_DL = 12;

  const header =
    pad("Paquet", COL_NAME) +
    pad("Version", COL_VER) +
    pad("Dernière pub.", COL_DATE) +
    "Téléchargements".padStart(COL_DL);

  const separator = "─".repeat(COL_NAME + COL_VER + COL_DATE + COL_DL);

  const rows = stats.packages.map(
    (pkg) =>
      pad(pkg.name.replace("@univ-lehavre/", ""), COL_NAME) +
      pad(pkg.version, COL_VER) +
      pad(fmtDate(pkg.lastPublishedAt), COL_DATE) +
      fmtNumber(pkg.totalDownloads).padStart(COL_DL),
  );

  log.message([header, separator, ...rows].join("\n"));

  outro("Terminé");
};
