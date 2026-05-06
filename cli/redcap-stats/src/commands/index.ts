import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseTokensCsv } from "@univ-lehavre/atlas-redcap-logs";
import { parseArgs } from "../config/args.js";
import { printHuman, summarizeStatus, type ProjectResult } from "../output/report.js";

const MAX_BODY_PREVIEW = 300;
const ENV_FILES = ["apps/redcap-dashboard/.env", ".env"];
const WORKSPACE_MARKER = "pnpm-workspace.yaml";

const fail = (message: string): never => {
  throw new Error(message);
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
