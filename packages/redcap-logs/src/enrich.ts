import type {
  LogActionCategory,
  LogUserType,
  RedcapLogEntry,
} from "./types.js";
import type { RawLog } from "./api.js";

const ANON_USERNAMES = new Set(["survey", "[survey respondent]", ""]);
const HEX32_RE = /^[\da-f]{32}$/i;
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "");

const classifyUserType = (username: string): LogUserType =>
  ANON_USERNAMES.has(username.toLowerCase())
    ? "enquêté"
    : HEX32_RE.test(username)
      ? "enquêté"
      : "loggé";

const classifyAction = (action: string): LogActionCategory => {
  const a = normalize(action);
  return /\blogin\b|\blogout\b|connexion|deconnexion|authentif|password|mot de passe|2fa|mfa/.test(
    a,
  )
    ? "Authentification"
    : /\bapi\b|web service/.test(a)
      ? "API"
      : /user|utilisateur|role|rights?|permission|privilege|droit/.test(a)
        ? "Utilisateurs"
        : /project|projet|design|conception|settings?|parametr|instrument/.test(
              a,
            )
          ? "Projet"
          : /survey|enquete|participant|reponse|questionnaire|alerte|invitation/.test(
                a,
              )
            ? "Questionnaires"
            : /download|upload|document|fichier|file repository|signature/.test(
                  a,
                )
              ? "Fichiers"
              : /record|enregistrement|save|create|delete|import|export|mettre a jour|mise a jour|update|creer|supprimer|verrouiller|deverrouiller|lock|unlock/.test(
                    a,
                  )
                ? "Enregistrements"
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
