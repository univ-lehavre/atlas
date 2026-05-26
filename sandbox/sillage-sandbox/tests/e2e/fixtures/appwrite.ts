// Appwrite admin helper for level-5 smoke cleanup. Reads Appwrite
// credentials from process.env — `playwright.config.ts` calls
// `process.loadEnvFile` on `apps/sillage/.env.local` at startup, so we
// hit the exact same Appwrite the test just signed up against.

interface AppwriteEnv {
  endpoint: string;
  projectId: string;
  apiKey: string;
}

const readEnv = (): AppwriteEnv | null => {
  const endpoint =
    process.env["PUBLIC_APPWRITE_ENDPOINT"] ?? "http://localhost:8090/v1";
  const projectId = process.env["PUBLIC_APPWRITE_PROJECT"];
  const apiKey = process.env["APPWRITE_KEY"];
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
