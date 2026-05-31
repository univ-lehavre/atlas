#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOTS = [
  "apps",
  "assets",
  "cli",
  "config",
  "packages",
  "sandbox",
  "services",
  "ui",
];
const NO_CLI_SUFFIX_ALLOWED = new Set(["@univ-lehavre/atlas-crf-openapi"]);
// TODO: migrate src/prompt/ to cli/biblio — @clack/prompts belongs in cli/
const CLI_IO_MIGRATION_PENDING = new Set([
  "@univ-lehavre/atlas-citation-validate",
]);

// Paquets internes private : apps/* et sandbox/* doivent être private par
// nature ; ces paquets-ci aussi (helpers internes non publiés sur npm).
// Voir ADR 0011 — paquets internes private.
const PRIVATE_INTERNAL_ALLOWED = new Set([
  "@univ-lehavre/atlas-ui",
  "@univ-lehavre/atlas-test-utils-sveltekit",
]);

// Deps that belong in cli/, never in packages/ dependencies
const CLI_IO_DEPS = new Set([
  "@clack/prompts",
  "yargs",
  "commander",
  "meow",
  "inquirer",
  "prompts",
]);
// Deps that belong in apps/ or packages/peerDependencies, not packages/ dependencies
const SVELTE_DEPS = new Set(["@sveltejs/kit", "svelte"]);
// HTTP routing frameworks — belong in services/, never in packages/ dependencies
const HTTP_ROUTING_DEPS = new Set([
  "hono",
  "express",
  "fastify",
  "koa",
  "polka",
]);
// node: modules that imply terminal I/O — forbidden in packages/ src/
const TERMINAL_NODE_MODULES = [
  "node:readline",
  "node:tty",
  "'readline'",
  "'tty'",
];
// Svelte/Kit imports forbidden in packages/ src/
const SVELTE_SOURCE_IMPORTS = ["svelte", "@sveltejs/kit", "$app/", "$lib/"];
// Server-only imports forbidden in ui/ src/ (no server-side logic)
const SERVER_ONLY_IMPORTS = [
  "@sveltejs/kit/node",
  "server-only",
  "$env/static/private",
  "$env/dynamic/private",
];

const errors = [];

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

const deps = (packageJson, ...fields) =>
  Object.assign({}, ...fields.map((f) => packageJson[f] ?? {}));

// ── Source-file scanner ──────────────────────────────────────────────────────

// Matches runtime imports: `import ... from '...'` — not `import type`, not JSDoc/comments
const RUNTIME_IMPORT_RE =
  /^(?!\s*\/\/|^\s*\*)\s*import\s+(?!type\s).*from\s+['"]([^'"]+)['"]/gm;
// Matches any import (including type) for broader checks
const ANY_IMPORT_RE =
  /^(?!\s*\/\/|^\s*\*)\s*import\s+.*from\s+['"]([^'"]+)['"]/gm;
// Matches dynamic imports: `import('...')` or `await import('...')` —
// Phase 6.5 a ajouté ce pattern aux scans pour capturer les imports
// chargés à la volée (par exemple `await import('bootstrap/...js')`).
const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function* iterSourceFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "coverage"
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* iterSourceFiles(full);
    else if (
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".js") ||
      entry.name.endsWith(".mjs") ||
      entry.name.endsWith(".svelte") ||
      // Phase 6.5 — fichiers Svelte 5 runes (state/derived/effect) co-localisés
      entry.name.endsWith(".svelte.ts") ||
      entry.name.endsWith(".svelte.js")
    )
      yield full;
  }
}

function findForbiddenImports(
  srcDir,
  forbidden,
  { typeImportsAllowed = false } = {},
) {
  const re = typeImportsAllowed ? RUNTIME_IMPORT_RE : ANY_IMPORT_RE;
  const hits = [];
  for (const file of iterSourceFiles(srcDir)) {
    const content = readFileSync(file, "utf8");
    // Static imports (import ... from '...')
    for (const match of content.matchAll(new RegExp(re.source, re.flags))) {
      const mod = match[1];
      if (forbidden.some((f) => mod === f || mod.startsWith(f + "/"))) {
        hits.push({ file: file.replace(process.cwd() + "/", ""), module: mod });
      }
    }
    // Phase 6.5 — dynamic imports : import('...') ou await import('...')
    for (const match of content.matchAll(
      new RegExp(DYNAMIC_IMPORT_RE.source, DYNAMIC_IMPORT_RE.flags),
    )) {
      const mod = match[1];
      if (forbidden.some((f) => mod === f || mod.startsWith(f + "/"))) {
        hits.push({ file: file.replace(process.cwd() + "/", ""), module: mod });
      }
    }
  }
  return hits;
}

// Phase 6.4 — Détecte les imports relatifs cross-workspace
// (ex. `from '../../../apps/foo'`). Retourne `[{ file, module }]`.
function findRelativeCrossWorkspaceImports(srcDir, currentDir) {
  const hits = [];
  const absCurrent = path.resolve(currentDir);
  for (const file of iterSourceFiles(srcDir)) {
    const content = readFileSync(file, "utf8");
    const fileDir = path.dirname(file);
    for (const match of [
      ...content.matchAll(new RegExp(ANY_IMPORT_RE.source, ANY_IMPORT_RE.flags)),
      ...content.matchAll(
        new RegExp(DYNAMIC_IMPORT_RE.source, DYNAMIC_IMPORT_RE.flags),
      ),
    ]) {
      const mod = match[1];
      if (!mod.startsWith(".")) continue;
      const resolved = path.resolve(fileDir, mod);
      // Hit if the resolved path escapes the current workspace.
      if (!resolved.startsWith(absCurrent + path.sep)) {
        hits.push({
          file: file.replace(process.cwd() + "/", ""),
          module: mod,
        });
      }
    }
  }
  return hits;
}

// ── Workspace index ──────────────────────────────────────────────────────────

// workspaceName → { root, dir, packageJson }
const workspaces = new Map();

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const entry of readdirSync(root)) {
    const dir = path.join(root, entry);
    if (!statSync(dir).isDirectory()) continue;
    const packageJsonPath = path.join(dir, "package.json");
    if (!existsSync(packageJsonPath)) continue;
    const packageJson = readJson(packageJsonPath);
    if (packageJson.name)
      workspaces.set(packageJson.name, { root, dir, packageJson });
  }
}

// ── Cycle detection ──────────────────────────────────────────────────────────

function detectCycles() {
  // Build adjacency: workspaceName → Set<workspaceName> (internal deps only)
  const graph = new Map();
  for (const [name, { packageJson }] of workspaces) {
    const allDeps = deps(
      packageJson,
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    );
    graph.set(
      name,
      new Set(Object.keys(allDeps).filter((d) => workspaces.has(d))),
    );
  }

  const visited = new Set();
  const inStack = new Set();
  const cycles = [];

  function dfs(node, stack) {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...stack, node]);
      } else if (inStack.has(neighbor)) {
        const cycleStart = stack.indexOf(neighbor);
        cycles.push([...stack.slice(cycleStart), node, neighbor]);
      }
    }
    inStack.delete(node);
  }

  for (const name of graph.keys()) {
    if (!visited.has(name)) dfs(name, []);
  }

  return cycles;
}

// ── Per-workspace checks ─────────────────────────────────────────────────────

// Collect sandbox names to check no other workspace depends on them
const sandboxNames = new Set(
  [...workspaces.values()]
    .filter(({ root }) => root === "sandbox")
    .map(({ packageJson }) => packageJson.name),
);

for (const [packageName, { root, dir, packageJson }] of workspaces) {
  const hasBin = !!packageJson.bin;
  const runtimeDeps = deps(packageJson, "dependencies");
  const allDeps = deps(
    packageJson,
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  );
  const internalDeps = Object.keys(runtimeDeps).filter((d) =>
    workspaces.has(d),
  );

  // ── Naming conventions ──────────────────────────────────────────────────

  if (typeof packageName !== "string" || packageName.length === 0) {
    errors.push(`${dir}: missing package.json "name"`);
    continue;
  }

  if (root === "apps") {
    const entry = path.basename(dir);
    const appToken = entry.startsWith("atlas-") ? entry : `atlas-${entry}`;
    const expectedName = `@univ-lehavre/${appToken}`;
    if (packageName !== expectedName) {
      errors.push(
        `${dir}: expected name "${expectedName}", got "${packageName}"`,
      );
    }
  }

  if (root === "cli") {
    const entry = path.basename(dir);
    if (entry.endsWith("-cli")) {
      errors.push(`${dir}: directory name should not end with "-cli"`);
    }
    if (
      !packageName.endsWith("-cli") &&
      !NO_CLI_SUFFIX_ALLOWED.has(packageName)
    ) {
      errors.push(
        `${dir}: CLI package name should end with "-cli" (or be explicitly allowed)`,
      );
    }
  }

  if (packageJson.repository && typeof packageJson.repository === "object") {
    const expectedDirectory = dir.replaceAll(path.sep, "/");
    const actualDirectory = packageJson.repository.directory;
    if (actualDirectory !== expectedDirectory) {
      errors.push(
        `${dir}: repository.directory must be "${expectedDirectory}" (got "${actualDirectory ?? "undefined"}")`,
      );
    }
  }

  // ── Architectural rules by category ────────────────────────────────────

  if (root === "packages") {
    if (hasBin) {
      errors.push(
        `${dir}: packages/ must not have a "bin" field — CLI entry points belong in cli/`,
      );
    }
    if (!CLI_IO_MIGRATION_PENDING.has(packageName)) {
      for (const dep of CLI_IO_DEPS) {
        if (dep in runtimeDeps) {
          errors.push(
            `${dir}: packages/ must not depend on "${dep}" — CLI I/O belongs in cli/`,
          );
        }
      }
    }
    for (const dep of SVELTE_DEPS) {
      if (dep in runtimeDeps) {
        errors.push(
          `${dir}: packages/ must not depend on "${dep}" in dependencies — use peerDependencies if optional`,
        );
      }
    }
    for (const dep of HTTP_ROUTING_DEPS) {
      if (dep in runtimeDeps) {
        errors.push(
          `${dir}: packages/ must not depend on "${dep}" — HTTP routing belongs in services/`,
        );
      }
    }
    const srcDir = path.join(dir, "src");
    // Scan source files for terminal node: imports
    for (const { file, module: mod } of findForbiddenImports(
      srcDir,
      TERMINAL_NODE_MODULES,
    )) {
      errors.push(
        `${file}: packages/ must not import "${mod}" — terminal I/O belongs in cli/`,
      );
    }
    // Scan source files for svelte/kit runtime imports (type imports are allowed)
    for (const { file, module: mod } of findForbiddenImports(
      srcDir,
      SVELTE_SOURCE_IMPORTS,
      { typeImportsAllowed: true },
    )) {
      errors.push(
        `${file}: packages/ must not runtime-import "${mod}" — UI/routing belongs in apps/ or ui/`,
      );
    }
  }

  if (root === "cli") {
    if (!hasBin) {
      errors.push(`${dir}: cli/ package must have a "bin" field`);
    }
    // Must delegate to at least one internal package
    if (internalDeps.length === 0) {
      errors.push(
        `${dir}: cli/ must depend on at least one @univ-lehavre/atlas-* package — business logic belongs in packages/`,
      );
    }
  }

  if (root === "apps") {
    if (hasBin) {
      errors.push(`${dir}: apps/ must not have a "bin" field`);
    }
    if (!("@sveltejs/kit" in allDeps)) {
      errors.push(`${dir}: apps/ must depend on "@sveltejs/kit"`);
    }
    if (!("svelte" in allDeps)) {
      errors.push(`${dir}: apps/ must depend on "svelte"`);
    }
  }

  if (root === "services") {
    if (hasBin) {
      errors.push(`${dir}: services/ must not have a "bin" field`);
    }
    if (!("hono" in runtimeDeps)) {
      errors.push(`${dir}: services/ must depend on "hono"`);
    }
    if (internalDeps.length === 0) {
      errors.push(
        `${dir}: services/ must depend on at least one @univ-lehavre/atlas-* package — business logic belongs in packages/`,
      );
    }
  }

  if (root === "config") {
    if (hasBin) {
      errors.push(`${dir}: config/ must not have a "bin" field`);
    }
    // Phase 6.7 — un paquet config/ doit exposer un champ `exports` propre
    // (sinon ses consommateurs importent via des chemins fragiles vers
    // src/). Une seule entrée `"."` au minimum, plus toutes les
    // sous-arborescences exposées (./eslint, ./prettier, ./vitest…).
    if (!packageJson.exports) {
      errors.push(
        `${dir}: config/ must declare an "exports" field — implicit deep imports breaks the public contract`,
      );
    }
  }

  if (root === "assets") {
    if (hasBin) {
      errors.push(
        `${dir}: assets/ must not have a "bin" field — installation tooling belongs in cli/`,
      );
    }
    if (Object.keys(runtimeDeps).length > 0) {
      errors.push(
        `${dir}: assets/ must not have runtime dependencies — only static files`,
      );
    }
  }

  if (root === "ui") {
    // ui/ packages are Svelte component libraries — must declare svelte as peerDependency
    if (hasBin) {
      errors.push(`${dir}: ui/ must not have a "bin" field`);
    }
    const peerDeps = packageJson.peerDependencies ?? {};
    if (!("svelte" in peerDeps)) {
      errors.push(`${dir}: ui/ must declare "svelte" as peerDependency`);
    }
    for (const dep of CLI_IO_DEPS) {
      if (dep in runtimeDeps) {
        errors.push(
          `${dir}: ui/ must not depend on "${dep}" — CLI I/O belongs in cli/`,
        );
      }
    }
    for (const dep of HTTP_ROUTING_DEPS) {
      if (dep in runtimeDeps) {
        errors.push(
          `${dir}: ui/ must not depend on "${dep}" — HTTP routing belongs in services/`,
        );
      }
    }
    // svelte must be a peerDependency, not a direct dependency
    if ("svelte" in runtimeDeps) {
      errors.push(
        `${dir}: ui/ must not depend on "svelte" in dependencies — use peerDependencies`,
      );
    }
    // Scan source files for server-side imports
    for (const { file, module: mod } of findForbiddenImports(
      path.join(dir, "src"),
      SERVER_ONLY_IMPORTS,
    )) {
      errors.push(
        `${file}: ui/ must not import "${mod}" — server-side logic belongs in apps/ server hooks`,
      );
    }
  }

  // ── Sandbox isolation ───────────────────────────────────────────────────

  if (root !== "sandbox") {
    for (const sandboxName of sandboxNames) {
      if (sandboxName in allDeps) {
        errors.push(
          `${dir}: must not depend on sandbox package "${sandboxName}"`,
        );
      }
    }
  }

  // ── Phase 6.2 — `private: true` enforcement (ADR 0011) ────────────────
  //
  // Les paquets `apps/*`, `sandbox/*` ainsi que la liste
  // `PRIVATE_INTERNAL_ALLOWED` (helpers internes non publiés) doivent
  // déclarer `"private": true` pour éviter une publication accidentelle.
  // Les autres catégories (packages/, cli/, services/, config/, ui/,
  // assets/) sont publiables : `private: true` y serait une erreur.
  const isPrivate = packageJson.private === true;
  const shouldBePrivate =
    root === "apps" ||
    root === "sandbox" ||
    PRIVATE_INTERNAL_ALLOWED.has(packageName);
  if (shouldBePrivate && !isPrivate) {
    errors.push(
      `${dir}: must declare "private": true (apps/sandbox or listed internal helper — see ADR 0011)`,
    );
  }
  if (!shouldBePrivate && isPrivate) {
    errors.push(
      `${dir}: must not declare "private": true (publishable package — remove the field or add the name to PRIVATE_INTERNAL_ALLOWED with a justification)`,
    );
  }
}

// ── Cross-workspace import checks ────────────────────────────────────────────

const serviceNames = new Set(
  [...workspaces.values()]
    .filter(({ root }) => root === "services")
    .map(({ packageJson }) => packageJson.name),
);
const appNames = new Set(
  [...workspaces.values()]
    .filter(({ root }) => root === "apps")
    .map(({ packageJson }) => packageJson.name),
);
const cliNames = new Set(
  [...workspaces.values()]
    .filter(({ root }) => root === "cli")
    .map(({ packageJson }) => packageJson.name),
);

for (const [packageName, { root, dir, packageJson }] of workspaces) {
  const allDeps = deps(
    packageJson,
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  );

  if (root === "services") {
    for (const serviceName of serviceNames) {
      if (serviceName !== packageName && serviceName in allDeps) {
        errors.push(
          `${dir}: services/ must not import another service "${serviceName}" — extract shared logic to packages/`,
        );
      }
    }
  }

  if (root === "apps") {
    for (const appName of appNames) {
      if (appName !== packageName && appName in allDeps) {
        errors.push(
          `${dir}: apps/ must not import another app "${appName}" — extract shared logic to packages/ or ui/`,
        );
      }
    }
  }

  // Phase 6.1 — un cli/ ne doit pas dépendre d'un autre cli/ (ADR 0008).
  // Les CLIs sont des thin wrappers vers packages/* ; mutualiser deux
  // CLIs entre eux signifie qu'il manque un package/ partagé.
  if (root === "cli") {
    for (const cliName of cliNames) {
      if (cliName !== packageName && cliName in allDeps) {
        errors.push(
          `${dir}: cli/ must not depend on another cli "${cliName}" — extract shared logic to packages/ (see ADR 0008)`,
        );
      }
    }
  }

  // Phase 6.4 — scan imports relatifs cross-workspace
  // (ex. `from '../../apps/foo/src/x'`). Les workspaces doivent
  // communiquer via `@univ-lehavre/atlas-*` pour préserver la
  // séparation des catégories.
  const srcDir = path.join(dir, "src");
  for (const { file, module: mod } of findRelativeCrossWorkspaceImports(
    srcDir,
    dir,
  )) {
    errors.push(
      `${file}: relative import "${mod}" escapes the workspace — use a @univ-lehavre/atlas-* package dependency instead`,
    );
  }
}

// ── Cycle detection ──────────────────────────────────────────────────────────

const cycles = detectCycles();
for (const cycle of cycles) {
  errors.push(`dependency cycle detected: ${cycle.join(" → ")}`);
}

// ── Report ───────────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error("Workspace structure audit failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Workspace structure audit passed.");
