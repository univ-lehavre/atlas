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
  isCacheStale,
  computeStats,
  resolveWorkspaceRoot,
  resolveToken,
  collectAtlasStatsWithFallback,
  buildAtlasCliReport,
} from "@univ-lehavre/atlas-stats";
import type { AtlasStatsCache, Period } from "@univ-lehavre/atlas-stats";

interface CliOptions {
  readonly token: string | null;
  readonly period: Period | null;
  readonly force: boolean;
  readonly json: boolean;
  readonly help: boolean;
}

const PERIOD_VALUES: Period[] = ["day", "week", "month", "quarter"];
const PACKAGE_SCOPE = "@univ-lehavre/";

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

const collectWithUi = async (
  token: string,
  fallbackCache: AtlasStatsCache | null,
): Promise<AtlasStatsCache> => {
  const s = spinner();
  let lastProgress = "Collecte en cours…";
  s.start(lastProgress);

  try {
    const cache = await collectAtlasStatsWithFallback(token, fallbackCache, {
      onProgress: (message) => {
        lastProgress = message;
        s.message(message);
      },
      onWarning: (message) => {
        log.warn(message);
      },
      onFallback: (message) => {
        log.warn(message);
      },
    });
    s.stop(lastProgress);
    return cache;
  } catch (error) {
    s.stop("Collecte interrompue");
    throw error;
  }
};

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

  const workspaceRoot = resolveWorkspaceRoot();

  if (options.json) {
    const resolvedToken = await resolveToken(options.token, workspaceRoot);
    const token =
      resolvedToken ??
      fail("GITHUB_TOKEN introuvable. Utilise --token ou configure .env");

    const cache = await readCache();
    const fresh =
      options.force || cache === null || isCacheStale(cache)
        ? await collectAtlasStatsWithFallback(token, cache, {
            onWarning: (message) => {
              console.error(message);
            },
            onFallback: (message) => {
              console.error(message);
            },
          })
        : cache;

    const period: Period = options.period ?? "week";
    console.log(JSON.stringify(computeStats(fresh, period), null, 2));
    return;
  }

  intro("Atlas Stats");

  let token = await resolveToken(options.token, workspaceRoot);

  if (token === null) {
    const answer = await text({
      message: "GitHub token (ou GITHUB_TOKEN dans .env)",
      placeholder: "ghp_…",
      validate: (v) =>
        typeof v !== "string" || v.trim() === "" ? "Token requis" : undefined,
    });
    if (isCancel(answer)) {
      cancel("Annulé.");
      process.exit(0);
    }
    token = answer.trim();
  }

  const cache = await readCache();
  const cacheUsable = cache !== null && !isCacheStale(cache);

  let freshCache: AtlasStatsCache | null = cache;

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
      freshCache = await collectWithUi(token, cache);
    }
  } else {
    freshCache = await collectWithUi(token, cache);
  }

  if (freshCache === null) {
    cancel("Cache introuvable après collecte.");
    process.exit(1);
  }

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

  const report = await buildAtlasCliReport(freshCache, period, workspaceRoot);
  for (const warning of report.warnings) {
    log.warn(warning);
  }

  log.info(
    [
      `Releases GitHub (${period}) : ${String(report.summary.githubReleasesForPeriod)}`,
      `Releases GitHub (API total) : ${String(report.summary.githubReleasesApiTotal)}`,
      `Releases GitHub (mappées)   : ${String(report.summary.githubReleasesMappedTotal)}`,
      `Releases npm (total)        : ${report.summary.npmReleasesTotalLabel}`,
      `Paquets (${period})         : ${String(report.summary.packagesTotal)} total, ${String(report.summary.packagesActive)} actif(s)`,
      `Downloads : ${fmtNumber(report.summary.downloadsTotal)}`,
    ].join("\n"),
  );

  const COL_NAME = 32;
  const COL_VER = 10;
  const COL_NPM = 6;
  const COL_GH = 9;
  const COL_NPM_RELEASES = 10;
  const COL_GH_RELEASES = 9;
  const COL_MONO = 10;
  const COL_DATE = 18;
  const COL_DL = 12;

  const header =
    pad("Paquet", COL_NAME) +
    pad("Version", COL_VER) +
    pad("npm", COL_NPM) +
    pad("GitHub", COL_GH) +
    pad("Rel npm", COL_NPM_RELEASES) +
    pad("Rel GH", COL_GH_RELEASES) +
    pad("Monorepo", COL_MONO) +
    pad("Dernière pub.", COL_DATE) +
    "Téléchargements".padStart(COL_DL);

  const totalWidth =
    COL_NAME +
    COL_VER +
    COL_NPM +
    COL_GH +
    COL_NPM_RELEASES +
    COL_GH_RELEASES +
    COL_MONO +
    COL_DATE +
    COL_DL;
  const separator = "─".repeat(totalWidth);

  const rows = report.rows.map(
    (row) =>
      pad(row.packageName.replace(PACKAGE_SCOPE, ""), COL_NAME) +
      pad(row.version, COL_VER) +
      pad(row.npmPresent ? "oui" : "non", COL_NPM) +
      pad(row.ghPresent ? "oui" : "non", COL_GH) +
      pad(
        row.npmReleaseCount === null ? "?" : String(row.npmReleaseCount),
        COL_NPM_RELEASES,
      ) +
      pad(String(row.ghReleaseCount), COL_GH_RELEASES) +
      pad(row.monorepoPresent ? "oui" : "non", COL_MONO) +
      pad(fmtDate(row.lastPublishedAt), COL_DATE) +
      fmtNumber(row.totalDownloads).padStart(COL_DL),
  );

  const tableRows: string[] = [];
  tableRows.push(...rows.slice(0, report.splitIndex));
  if (report.splitIndex > 0 && report.splitIndex < rows.length) {
    const label = " ABSENTS DU MONOREPO ";
    const left = Math.max(0, Math.floor((totalWidth - label.length) / 2));
    const right = Math.max(0, totalWidth - label.length - left);
    tableRows.push("─".repeat(left) + label + "─".repeat(right));
  }
  tableRows.push(...rows.slice(report.splitIndex));
  tableRows.push(separator);
  tableRows.push(
    pad("TOTAL", COL_NAME) +
      pad("—", COL_VER) +
      pad("—", COL_NPM) +
      pad("—", COL_GH) +
      pad(report.totals.npmReleasesLabel, COL_NPM_RELEASES) +
      pad(String(report.totals.ghReleasesTotal), COL_GH_RELEASES) +
      pad("—", COL_MONO) +
      pad("—", COL_DATE) +
      fmtNumber(report.totals.downloadsTotal).padStart(COL_DL),
  );

  log.message([header, separator, ...tableRows].join("\n"));

  outro("Terminé");
};
