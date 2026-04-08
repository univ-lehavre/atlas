import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseTokensCsv } from "@univ-lehavre/atlas-redcap-logs";

interface CliOptions {
  readonly projectId: number | null;
  readonly all: boolean;
  readonly apiUrl: string | null;
  readonly tokensFile: string;
  readonly content: string;
  readonly timeoutMs: number;
  readonly showBody: boolean;
  readonly json: boolean;
}

interface ProjectResult {
  readonly projectId: number;
  readonly status: number | null;
  readonly statusText: string;
  readonly ok: boolean;
  readonly bodyPreview: string;
  readonly error: string | null;
}

const DEFAULT_TOKENS_FILE = "redcap-token.csv";
const DEFAULT_CONTENT = "log";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_BODY_PREVIEW = 300;
const ENV_FILES = ["apps/redcap-dashboard/.env", ".env"];
const WORKSPACE_MARKER = "pnpm-workspace.yaml";

const usage = (): string =>
  `
atlas-redcap-stats - tester les réponses HTTP REDCap par projet

Usage:
  atlas-redcap-stats --project <id> [options]
  atlas-redcap-stats --all [options]

Options:
  --project <id>      Tester un seul project_id
  --all               Tester tous les projects du CSV
  --api-url <url>     URL REDCap API (sinon REDCAP_API_URL depuis env/.env)
  --tokens-file <p>   Fichier CSV tokens (défaut: ${DEFAULT_TOKENS_FILE})
  --content <name>    Valeur REDCap content (défaut: ${DEFAULT_CONTENT})
  --timeout-ms <n>    Timeout HTTP en ms (défaut: ${String(DEFAULT_TIMEOUT_MS)})
  --show-body         Affiche un extrait de body pour chaque projet
  --json              Sortie JSON
  -h, --help          Aide

Exemples:
  atlas-redcap-stats --project 25
  atlas-redcap-stats --project 25 --show-body
  atlas-redcap-stats --all --json
`.trim();

const fail = (message: string): never => {
  throw new Error(message);
};

const parseNumber = (value: string, label: string): number => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fail(`${label} invalide: ${value}`) : n;
};

const parseArgs = (argv: readonly string[]): CliOptions => {
  let projectId: number | null = null;
  let all = false;
  let apiUrl: string | null = null;
  let tokensFile = DEFAULT_TOKENS_FILE;
  let content = DEFAULT_CONTENT;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let showBody = false;
  let json = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--project") {
      const value = argv[i + 1] ?? fail("Argument manquant pour --project");
      projectId = parseNumber(value, "project_id");
      i += 1;
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--api-url") {
      apiUrl = (argv[i + 1] ?? fail("Argument manquant pour --api-url")).trim();
      i += 1;
    } else if (arg === "--tokens-file") {
      tokensFile = (
        argv[i + 1] ?? fail("Argument manquant pour --tokens-file")
      ).trim();
      i += 1;
    } else if (arg === "--content") {
      content = (
        argv[i + 1] ?? fail("Argument manquant pour --content")
      ).trim();
      i += 1;
    } else if (arg === "--timeout-ms") {
      timeoutMs = parseNumber(
        argv[i + 1] ?? fail("Argument manquant pour --timeout-ms"),
        "timeout",
      );
      i += 1;
    } else if (arg === "--show-body") {
      showBody = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      fail(`Option inconnue: ${arg}`);
    }
  }

  if (projectId === null && !all) {
    fail("Tu dois fournir --project <id> ou --all");
  }

  if (projectId !== null && all) {
    fail("Utilise soit --project, soit --all (pas les deux)");
  }

  return {
    projectId,
    all,
    apiUrl,
    tokensFile,
    content,
    timeoutMs,
    showBody,
    json,
  };
};

const parseEnvLine = (line: string): [string, string] | null => {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  const idx = trimmed.indexOf("=");
  if (idx < 1) return null;
  const key = trimmed.slice(0, idx).trim();
  const raw = trimmed.slice(idx + 1).trim();
  const value = raw.replace(/^"|"$|^'|'$/g, "");
  return [key, value];
};

const readEnvFileVar = async (
  filePath: string,
  key: string,
): Promise<string | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const entry = parseEnvLine(line);
      if (entry !== null && entry[0] === key) {
        return entry[1];
      }
    }
    return null;
  } catch {
    return null;
  }
};

const resolveWorkspaceRoot = (): string => {
  let cursor = process.cwd();
  for (;;) {
    if (existsSync(path.join(cursor, WORKSPACE_MARKER))) {
      return cursor;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) return process.cwd();
    cursor = parent;
  }
};

const resolveExistingPath = (
  inputPath: string,
  workspaceRoot: string,
): string => {
  if (path.isAbsolute(inputPath)) return inputPath;
  const cwdCandidate = path.resolve(process.cwd(), inputPath);
  if (existsSync(cwdCandidate)) return cwdCandidate;
  return path.resolve(workspaceRoot, inputPath);
};

const resolveApiUrl = async (
  argUrl: string | null,
  workspaceRoot: string,
): Promise<string> => {
  if (argUrl !== null && argUrl !== "") return argUrl;

  const envVar = process.env["REDCAP_API_URL"];
  if (envVar !== undefined && envVar !== "") return envVar;

  for (const file of ENV_FILES) {
    const value = await readEnvFileVar(
      path.resolve(workspaceRoot, file),
      "REDCAP_API_URL",
    );
    if (value !== null && value !== "") return value;
  }

  return fail(
    "REDCAP_API_URL introuvable. Utilise --api-url ou configure .env",
  );
};

const normalizeUrl = (url: string): string => {
  const parsed = new URL(url);
  return parsed.toString();
};

const readTokens = async (
  tokensFile: string,
  workspaceRoot: string,
): Promise<readonly { project_id: number; token: string }[]> => {
  const resolved = resolveExistingPath(tokensFile, workspaceRoot);
  const raw = await readFile(resolved, "utf8");
  return parseTokensCsv(raw);
};

const summarizeStatus = (
  results: readonly ProjectResult[],
): Record<string, number> =>
  results.reduce<Record<string, number>>((acc, result) => {
    const key = result.status === null ? "ERR" : String(result.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

const fetchOne = async (
  apiUrl: string,
  content: string,
  timeoutMs: number,
  projectId: number,
  token: string,
): Promise<ProjectResult> => {
  const body = new URLSearchParams({
    token,
    content,
    format: "json",
    returnFormat: "json",
  });

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    return {
      projectId,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      bodyPreview: text.slice(0, MAX_BODY_PREVIEW),
      error: null,
    };
  } catch (error: unknown) {
    return {
      projectId,
      status: null,
      statusText: "",
      ok: false,
      bodyPreview: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const printHuman = (
  results: readonly ProjectResult[],
  showBody: boolean,
): void => {
  for (const result of results) {
    if (result.status === null) {
      console.log(
        `[redcap] project ${String(result.projectId)}: ERROR ${result.error ?? "unknown"}`,
      );
      continue;
    }

    console.log(
      `[redcap] project ${String(result.projectId)}: HTTP ${String(result.status)} ${result.statusText}`,
    );

    if (showBody && result.bodyPreview !== "") {
      console.log(`  body: ${result.bodyPreview.replace(/\s+/g, " ").trim()}`);
    }
  }

  const summary = summarizeStatus(results);
  console.log("");
  console.log(`Résumé: ${JSON.stringify(summary)}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const workspaceRoot = resolveWorkspaceRoot();
  const apiUrl = normalizeUrl(
    await resolveApiUrl(options.apiUrl, workspaceRoot),
  );
  const tokens = await readTokens(options.tokensFile, workspaceRoot);

  const selected =
    options.projectId === null
      ? tokens
      : tokens.filter((row) => row.project_id === options.projectId);

  if (selected.length === 0) {
    fail(
      options.projectId === null
        ? "Aucun token trouvé dans le CSV"
        : `project_id ${String(options.projectId)} introuvable dans ${options.tokensFile}`,
    );
  }

  const results: ProjectResult[] = [];
  for (const row of selected) {
    results.push(
      await fetchOne(
        apiUrl,
        options.content,
        options.timeoutMs,
        row.project_id,
        row.token,
      ),
    );
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          apiUrl,
          tested: results.length,
          summary: summarizeStatus(results),
          results,
        },
        null,
        2,
      ),
    );
  } else {
    printHuman(results, options.showBody);
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
};

export { main };
