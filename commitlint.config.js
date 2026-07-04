import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

// ── Scope-enum DÉRIVÉ du workspace (exhaustif + non ambigu par construction) ─────────────────
// Un scope = le BASENAME du dossier d'UN package du workspace (les basenames sont uniques → pas
// d'ambiguïté ; ajouter un package → son scope est automatiquement valide, plus de liste figée à
// maintenir qui dérive). Inclut les code-locations Python dataops (citation-dagster,
// mediawatch-dagster) : `dataops` n'est plus un scope FOURRE-TOUT — chaque paquet Python a son
// scope, prêt pour une future publication indépendante. Les projets dbt (citation-dbt,
// mediawatch-dbt) n'ont pas de package.json → hors workspace → pas de scope (changement dbt =
// scope du dagster consommateur, ou un scope à ajouter le jour où ils deviennent des packages).

/** Lit UNIQUEMENT la liste `packages:` de pnpm-workspace.yaml (sans dépendance YAML). */
function workspaceGlobs() {
  const txt = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  const globs = [];
  let inPackages = false;
  for (const line of txt.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (/^\S/.test(line)) break; // prochaine clé de 1er niveau → fin de `packages:`
    const m = line.match(/^\s*-\s+["']?([^"'#\s]+)/);
    if (m) globs.push(m[1]);
  }
  return globs;
}

/** Basenames des dossiers de package (avec package.json) résolus depuis les globs. */
function packageScopes() {
  const scopes = new Set();
  for (const g of workspaceGlobs()) {
    if (g.endsWith("/*")) {
      const parent = join(ROOT, g.slice(0, -2));
      try {
        for (const d of readdirSync(parent, { withFileTypes: true })) {
          if (
            d.isDirectory() &&
            existsSync(join(parent, d.name, "package.json"))
          )
            scopes.add(d.name);
        }
      } catch {
        /* dossier parent absent → ignoré */
      }
    } else if (existsSync(join(ROOT, g, "package.json"))) {
      scopes.add(g.split("/").pop());
    }
  }
  return [...scopes];
}

// Scopes MÉTA légitimes (ne correspondent à AUCUN package) : outillage transverse.
const META_SCOPES = ["ci", "deps", "deps-dev", "config", "infra", "plans"];

const SCOPES = [...new Set([...packageScopes(), ...META_SCOPES])].sort();

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [2, "always", SCOPES],
    "subject-case": [2, "always", "lower-case"],
  },
};
