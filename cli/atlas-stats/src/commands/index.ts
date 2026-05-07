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
import { parseArgs, requireValue } from "../config/args.js";
import { formatHelp } from "../output/help.js";
import { formatSummary, formatTable } from "../output/report.js";

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
    console.log(formatHelp());
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();

  if (options.json) {
    const resolvedToken = await resolveToken(options.token, workspaceRoot);
    const token = requireValue(
      resolvedToken,
      "GITHUB_TOKEN introuvable. Utilise --token ou configure .env",
    );

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

  log.info(formatSummary(report, period));
  log.message(formatTable(report));

  outro("Terminé");
};
