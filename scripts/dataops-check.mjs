#!/usr/bin/env node

// Vérifications qualité de la catégorie `dataops/` (Python, ADR 0055).
//
// La catégorie vit hors du graphe pnpm : turbo ne la découvre pas. Ce script
// applique à chaque sous-projet `dataops/<nom>/` les MÊMES exigences que le code
// Node (ADR 0055, « même qualité partout ») avec l'outillage Python :
//   - ruff check       (lint)
//   - ruff format --check (format)
//   - pytest --cov --cov-fail-under (tests + couverture à seuil)
//
// Branché à `ci:checks` et au hook pre-push. Une régression bloque CI et push.
//
// Self-skipping : si `uv` n'est pas installé (machine sans toolchain Python),
// le script s'arrête proprement en code 0 avec un avertissement — cohérent avec
// les suites self-skipping du dépôt (pas de blocage du contributeur sans Python).

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DATAOPS_DIR = path.resolve(import.meta.dirname, "..", "dataops");

function hasUv() {
  const probe = spawnSync("uv", ["--version"], { stdio: "ignore" });
  return probe.status === 0;
}

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  return res.status === 0;
}

function pythonProjects() {
  if (!existsSync(DATAOPS_DIR)) return [];
  return readdirSync(DATAOPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(DATAOPS_DIR, e.name))
    .filter((dir) => existsSync(path.join(dir, "pyproject.toml")));
}

const projects = pythonProjects();
if (projects.length === 0) {
  console.log("dataops: aucun sous-projet Python — rien à vérifier.");
  process.exit(0);
}

if (!hasUv()) {
  console.warn(
    "⚠️  dataops: `uv` introuvable — vérifications Python ignorées (self-skipping).\n" +
      "   Installer uv (https://docs.astral.sh/uv/) pour les exécuter localement.",
  );
  process.exit(0);
}

let ok = true;
for (const dir of projects) {
  const name = path.basename(dir);
  console.log(`\n=== dataops/${name} ===`);
  // uv sync garantit l'environnement (idempotent) avant lint/tests.
  if (!run("uv", ["sync", "--quiet"], dir)) {
    console.error(`dataops/${name}: \`uv sync\` a échoué.`);
    ok = false;
    continue;
  }
  const steps = [
    ["ruff (lint)", ["run", "ruff", "check"]],
    ["ruff (format)", ["run", "ruff", "format", "--check"]],
    ["pytest (+ couverture)", ["run", "pytest"]],
  ];
  for (const [label, args] of steps) {
    if (!run("uv", args, dir)) {
      console.error(`dataops/${name}: ${label} a échoué.`);
      ok = false;
    }
  }
}

if (!ok) {
  console.error("\n❌ dataops: vérifications qualité en échec.");
  process.exit(1);
}
console.log("\n✅ dataops: vérifications qualité OK.");
