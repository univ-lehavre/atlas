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

export const fetchProjectLogs = async (
  apiUrl: string,
  { project_id, token }: ProjectToken,
): Promise<RawLog[]> => {
  const body = new URLSearchParams({
    token,
    content: "log",
    format: "json",
    returnFormat: "json",
  });

  const response = await fetch(apiUrl, { method: "POST", body });

  const data = response.ok
    ? ((await response.json()) as RawEntry[] | { error: string })
    : null;

  return data !== null && Array.isArray(data)
    ? data.map((entry) => ({ project_id, ...entry }))
    : [];
};
