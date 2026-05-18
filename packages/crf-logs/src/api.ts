import type { ProjectToken } from "./types.js";

export interface RawLog {
  readonly project_id: number;
  readonly timestamp: string;
  readonly username: string;
  readonly action: string;
}

interface RawEntry {
  readonly timestamp: string;
  readonly username: string;
  readonly action: string;
}

const parseJson = (text: string): Promise<unknown> =>
  Promise.resolve(text)
    .then((t) => JSON.parse(t) as unknown)
    .catch(() => null);

const toRawLogs = (
  data: unknown,
  project_id: number,
  text: string,
): RawLog[] => {
  const id = String(project_id);
  return data === null
    ? (console.error(
        `[redcap] project ${id}: invalid JSON — ${text.slice(0, 200)}`,
      ),
      [])
    : Array.isArray(data)
      ? (data as RawEntry[]).map((entry) => ({ project_id, ...entry }))
      : (console.error(
          `[redcap] project ${id}: unexpected response — ${JSON.stringify(data).slice(0, 200)}`,
        ),
        []);
};

export const fetchProjectLogs = async (
  apiUrl: string,
  { project_id, token }: ProjectToken,
): Promise<RawLog[]> => {
  const id = String(project_id);
  const body = new URLSearchParams({
    token,
    content: "log",
    format: "json",
    returnFormat: "json",
  });

  const response = await fetch(apiUrl, { method: "POST", body });

  return response.ok
    ? response
        .text()
        .then((text) =>
          parseJson(text).then((data) => toRawLogs(data, project_id, text)),
        )
    : (console.error(
        `[redcap] project ${id}: HTTP ${String(response.status)} ${response.statusText}`,
      ),
      Promise.resolve([]));
};
