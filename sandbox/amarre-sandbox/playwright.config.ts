import { defineConfig, devices } from "@playwright/test";

// Level-5 of the amarre test pyramid : one Playwright smoke that drives
// the full stack (Appwrite + Mailpit + REDCap + amarre dev) end-to-end.
// The suite self-skips when the stack isn't reachable (see
// `tests/e2e/fixtures/preflight.ts`), so `pnpm test:e2e` is safe to
// invoke without docker — it just reports "skipped".

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // single user fixture, sequential keeps it deterministic
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  // Reporter par défaut + capture d'un brouillon de drift sur échec (ADR 0080,
  // volet a) : sur `failed`/`timedOut`, le greffon dépose un `.drift.json`
  // gitignoré avec le message d'erreur à chaud, sans changer le verdict du run.
  reporter: [
    [process.env["CI"] ? "list" : "html"],
    ["../../scripts/drifts/playwright-reporter.mjs", { label: "amarre-smoke" }],
  ],
  use: {
    baseURL: process.env["PUBLIC_LOGIN_URL"] ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Spawn amarre dev when it isn't already running. The dev server reads
  // `apps/amarre/.env.local` for Appwrite / REDCap / Mailpit endpoints,
  // so it gets the same config as the sandbox stack.
  webServer: {
    command: "pnpm -F @univ-lehavre/atlas-amarre dev",
    url: process.env["PUBLIC_LOGIN_URL"] ?? "http://localhost:5173",
    timeout: 60_000,
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
  },
});
