#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOTS = [
  "apps",
  "cli",
  "config",
  "packages",
  "sandbox",
  "services",
  "ui",
];
const NO_CLI_SUFFIX_ALLOWED = new Set(["@univ-lehavre/atlas-redcap-openapi"]);
// TODO: migrate src/prompt/ to cli/biblio — @clack/prompts belongs in cli/
const CLI_IO_MIGRATION_PENDING = new Set([
  "@univ-lehavre/atlas-validate-openalex",
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
      entry.name.endsWith(".svelte")
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
    for (const match of content.matchAll(new RegExp(re.source, re.flags))) {
      const mod = match[1];
      if (forbidden.some((f) => mod === f || mod.startsWith(f + "/"))) {
        hits.push({ file: file.replace(process.cwd() + "/", ""), module: mod });
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
