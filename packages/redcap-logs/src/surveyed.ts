import type { RedcapLogEntry } from "./types.js";

const RESPONSE_RE =
  /reponse\s+(?:mise\s+a\s+jour|creee?|created|updated)\s+([a-z0-9-]+)/;
const SHORT_RECORD_RE = /\benreg\.\s*([a-z0-9-]+)/;
const FULL_RECORD_RE = /enregistrement\s+([a-z0-9-]+)/;

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "");

const extractRespondentIdFromAction = (action: string): string | null => {
  const normalized = normalize(action);
  const responseId = RESPONSE_RE.exec(normalized)?.[1];
  const shortRecordId = SHORT_RECORD_RE.exec(normalized)?.[1];
  const fullRecordId = FULL_RECORD_RE.exec(normalized)?.[1];
  return responseId ?? shortRecordId ?? fullRecordId ?? null;
};

export const countDistinctSurveyed = (
  entries: readonly RedcapLogEntry[],
): number =>
  new Set(
    entries
      .filter((entry) => entry.user_type === "enquêté")
      .map(
        (entry) =>
          extractRespondentIdFromAction(entry.action) ??
          `user:${entry.username}`,
      ),
  ).size;
