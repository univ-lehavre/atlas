import type {
  LogActionCategory,
  LogUserType,
  RedcapLogEntry,
} from "./types.js";
import type { RawLog } from "./api.js";

const ANON_USERNAMES = new Set(["survey", "[survey respondent]", ""]);
const HEX32_RE = /^[\da-f]{32}$/i;

const classifyUserType = (username: string): LogUserType =>
  ANON_USERNAMES.has(username.toLowerCase())
    ? "anonyme"
    : HEX32_RE.test(username)
      ? "lien_personnel"
      : "loggé";

const classifyAction = (action: string): LogActionCategory => {
  const a = action.toLowerCase();
  return /login|logout/.test(a)
    ? "Authentification"
    : /\bapi\b/.test(a)
      ? "API"
      : /user|role|rights/.test(a)
        ? "Utilisateurs"
        : /survey|participant/.test(a)
          ? "Survey"
          : /project|design|settings/.test(a)
            ? "Projet"
            : /record|save|create|delete|import|export/.test(a)
              ? "Données"
              : "Autre";
};

const toEntry = (raw: RawLog): RedcapLogEntry | null => {
  const ts = new Date(raw.timestamp);
  const username = raw.username.toLowerCase().trim();
  return Number.isNaN(ts.getTime())
    ? null
    : {
        project_id: raw.project_id,
        timestamp: ts,
        username,
        action: raw.action,
        user_type: classifyUserType(username),
        action_category: classifyAction(raw.action),
      };
};

const dedupeKey = (e: RedcapLogEntry): string =>
  `${String(e.project_id)}|${String(e.timestamp.getTime())}|${e.username}|${e.action}`;

export const enrichLogs = (raw: readonly RawLog[]): RedcapLogEntry[] => {
  const entries = raw.flatMap((r) => {
    const entry = toEntry(r);
    return entry === null ? [] : [entry];
  });
  // Last write wins for duplicate keys — order is stable so duplicates are collapsed
  const byKey = new Map(entries.map((e) => [dedupeKey(e), e]));
  return [...byKey.values()];
};

export const parseTokensCsv = (
  csv: string,
): { project_id: number; token: string }[] =>
  csv
    .trim()
    .split("\n")
    .slice(1)
    .flatMap((line) => {
      const parts = line.trim().split(",");
      const id = parts[0];
      const token = parts[1];
      const project_id = Number.parseInt(id ?? "", 10);
      return id === undefined || token === undefined || Number.isNaN(project_id)
        ? []
        : [{ project_id, token: token.trim() }];
    });
