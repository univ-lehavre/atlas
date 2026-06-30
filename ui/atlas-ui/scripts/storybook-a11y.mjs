/**
 * Audit a11y des stories (page rendue) — orchestrateur du Storybook test-runner (#296).
 *
 * Le `@storybook/test-runner` a besoin d'un Storybook servi. On démarre le **dev
 * server** (`storybook dev --ci`) plutôt que le build statique : sous Vite 8 /
 * Rolldown, `storybook build` échoue sur les assets `.svelte` internes de
 * Storybook (`$` réservé), tandis que le dev server passe grâce au workaround
 * `load`/`transform` de `.storybook/main.ts`. Le dev server est l'entrée nominale
 * du test-runner de toute façon.
 *
 * Séquence : lancer le dev server en arrière-plan → attendre son `index.json` →
 * lancer `test-storybook --url` → toujours refermer le dev server en sortie.
 * Sortie 0 si aucune violation WCAG AA et parcours clavier OK sur les pages.
 *
 * Usage : node scripts/storybook-a11y.mjs [--port N]
 */

import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const HOST = "127.0.0.1";

const portArgIndex = process.argv.indexOf("--port");
const PORT =
  portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : 6007;
const STORYBOOK_URL = `http://${HOST}:${String(PORT)}`;

// Start Storybook dev in CI mode (no auto-open, no telemetry prompt).
const sb = spawn(
  "pnpm",
  ["exec", "storybook", "dev", "--ci", "--quiet", "--port", String(PORT)],
  {
    cwd: ROOT,
    stdio: "ignore",
    env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: "1" },
  },
);

const stopStorybook = () => {
  if (!sb.killed) sb.kill("SIGTERM");
};
process.on("exit", stopStorybook);
process.on("SIGINT", () => {
  stopStorybook();
  process.exit(130);
});

// Poll the stories index until the dev server is ready (bounded).
const waitForReady = async () => {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`${STORYBOOK_URL}/index.json`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return false;
};

const ready = await waitForReady();
if (!ready) {
  console.error(
    `Storybook dev server not reachable at ${STORYBOOK_URL} after timeout.`,
  );
  stopStorybook();
  process.exit(1);
}

// Warm-up : le dev server Vite transforme les modules de story À LA DEMANDE.
// Sous la charge du test-runner (workers parallèles) la toute première
// transformation peut perdre la course → « Failed to fetch dynamically imported
// module » sur le runner CI. On pré-charge chaque story (son iframe) une fois,
// séquentiellement, pour forcer la transformation AVANT que le test-runner ne
// tourne. Best-effort : un échec de warm-up n'arrête pas le run.
const warmUpStories = async () => {
  try {
    const index = await (await fetch(`${STORYBOOK_URL}/index.json`)).json();
    // Chaque entrée porte son `importPath` (`./src/lib/X.stories.ts`) : le
    // fetcher force Vite à transformer le module maintenant (réponse 200), pas
    // sous la course des workers. Dédupliqués (plusieurs stories par module).
    const modules = [
      ...new Set(
        Object.values(index.entries ?? {})
          .map((entry) => entry.importPath)
          .filter((path) => typeof path === "string"),
      ),
    ];
    for (const importPath of modules) {
      try {
        await fetch(`${STORYBOOK_URL}/${importPath.replace(/^\.\//, "")}`, {
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        // un module lent sera retenté par le test-runner
      }
    }
    console.log(
      `Warm-up: ${String(modules.length)} modules de story compilés.`,
    );
  } catch (error) {
    console.warn("Warm-up ignoré (index indisponible):", error);
  }
};

await warmUpStories();

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "test-storybook",
    "--url",
    STORYBOOK_URL,
    "--maxWorkers",
    "2",
    "--testTimeout",
    "30000",
  ],
  { cwd: ROOT, stdio: "inherit" },
);

stopStorybook();
process.exit(result.status ?? 1);
