// Appwrite admin helper for level-5 smoke cleanup. Reads
// `apps/amarre/.env.local` (provisioned by
// `pnpm -F @univ-lehavre/atlas-amarre-sandbox bootstrap`) to find the
// project + key. Same env-source as the dev server, so we hit the
// exact same Appwrite the test just signed up against.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface AppwriteEnv {
  endpoint: string;
  projectId: string;
  apiKey: string;
}

const readEnv = (): AppwriteEnv | null => {
  const path = resolve(
    new URL(".", import.meta.url).pathname,
    "../../../../../apps/amarre/.env.local",
  );
  if (!existsSync(path)) return null;
  const map: Record<string, string> = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?([^"\n]+)"?$/);
    if (m) map[m[1]!] = m[2]!;
  }
  const endpoint =
    map["PUBLIC_APPWRITE_ENDPOINT"] ?? "http://localhost:8090/v1";
  const projectId = map["PUBLIC_APPWRITE_PROJECT"];
  const apiKey = map["APPWRITE_KEY"];
  if (!projectId || !apiKey) return null;
  return { endpoint, projectId, apiKey };
};

export const deleteAppwriteUser = async (userId: string): Promise<void> => {
  const env = readEnv();
  if (!env) return;
  await fetch(`${env.endpoint}/users/${userId}`, {
    method: "DELETE",
    headers: {
      "X-Appwrite-Project": env.projectId,
      "X-Appwrite-Key": env.apiKey,
    },
  }).catch(() => undefined);
};
