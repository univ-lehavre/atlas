#!/usr/bin/env node
// Génère des changesets à partir des Conventional Commits SCOPÉS depuis la dernière release.
//
// atlas impose un scope-enum (commitlint) qui mappe aux packages du workspace : un commit
// `type(scope): sujet` porte donc le PACKAGE (scope = basename du dossier du package) et le
// BUMP (type → semver). Ce script dérive les changesets de ces commits — backfill des commits
// accumulés + génération continue dans le release.yml (avant `changeset version`).
//
// Règles :
//   • scope → package : basename du dossier du package (auto-découvert via `pnpm -r ls`).
//   • type → bump : `feat` → minor ; `fix`/`perf` → patch ; `!` ou `BREAKING CHANGE` → major.
//     Les autres types (docs, chore, refactor, test, ci, build, style) NE bumpent PAS.
//   • IGNORE les scopes non-package (dataops = Python, ci/deps/infra/config/plans, ui = catégorie).
//   • SAUTE les packages `private` (site docs, sandboxes… jamais publiés).
//   • Un scope inconnu (ni package, ni ignore-list) → WARNING (jamais d'invention silencieuse).
//   • UN changeset par package (bump = max des commits ; corps = liste des changements).
//
// Usage : node scripts/release/generate-changesets.mjs [--dry-run]

import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry-run");

// Scopes MÉTA (outillage transverse, non-package) — alignés sur META_SCOPES de
// commitlint.config.js — plus les scopes LEGACY retirés de l'enum (`dataops` fourre-tout,
// `ui` catégorie) qu'on peut rencontrer dans l'historique avant la refonte de la taxonomie.
// Un package (npm) reste géré par l'auto-découverte + le skip des `private`.
const IGNORE = new Set([
  "ci", "deps", "deps-dev", "config", "infra", "plans", // méta (commitlint.config.js)
  "dataops", "ui", // legacy (retirés de l'enum ; commits historiques)
]); // prettier-ignore

const BUMP_RANK = { patch: 1, minor: 2, major: 3 };

// 1. Auto-découverte : scope (basename du dossier) → { name, private }.
const pkgs = JSON.parse(execSync("pnpm -r ls --depth -1 --json").toString());
const byScope = {};
for (const p of pkgs) {
  if (p.name === "atlas") continue; // la racine = version du DÉPÔT (release-please), pas ici.
  const scope = p.path.split("/").pop();
  let priv = false;
  try {
    priv = !!JSON.parse(readFileSync(join(p.path, "package.json"), "utf8"))
      .private;
  } catch {
    /* pas de package.json lisible → traité comme non-private */
  }
  byScope[scope] = { name: p.name, private: priv };
}

// 2. Fenêtre = depuis le dernier `chore: version packages` (dernière consommation de changesets).
let since = "";
try {
  since = execSync('git log --grep="^chore: version packages" --format=%H -1')
    .toString()
    .trim();
} catch {
  /* aucun release-commit → depuis le début */
}
const range = since ? `${since}..HEAD` : "HEAD";

// 3. Parcourt les commits, dérive (package, bump, sujet). Séparateurs \x1f (champs) / \x1e (records).
const raw = execSync(
  `git log ${range} --no-merges --format=%s%x1f%b%x1e`,
).toString();
const commits = raw
  .split("\x1e")
  .map((c) => c.trim())
  .filter(Boolean)
  .map((c) => {
    const [subject, body = ""] = c.split("\x1f");
    return { subject, body };
  });

const perPackage = {}; // name → { bump, lines: [] }
const warnings = new Map(); // scope → count

for (const { subject, body } of commits) {
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!m) continue;
  const [, type, scope, bang, desc] = m;
  if (!scope || IGNORE.has(scope)) continue;
  const pkg = byScope[scope];
  if (!pkg) {
    warnings.set(scope, (warnings.get(scope) || 0) + 1);
    continue;
  }
  if (pkg.private) continue;

  let bump = null;
  if (bang || /BREAKING[ -]CHANGE/.test(body)) bump = "major";
  else if (type === "feat") bump = "minor";
  else if (type === "fix" || type === "perf") bump = "patch";
  else continue; // type sans impact de version.

  const cur = perPackage[pkg.name] || { bump: "patch", lines: [] };
  if (BUMP_RANK[bump] > BUMP_RANK[cur.bump]) cur.bump = bump;
  cur.lines.push(`- ${type}${bang ? "!" : ""}: ${desc}`);
  perPackage[pkg.name] = cur;
}

// 4. Écrit UN changeset par package.
const entries = Object.entries(perPackage);
for (const [name, { bump, lines }] of entries) {
  const slug = "auto-" + name.replace(/[@/]/g, "-").replace(/^-+/, "");
  const content = `---\n"${name}": ${bump}\n---\n\n${lines.join("\n")}\n`;
  const file = `.changeset/${slug}.md`;
  if (DRY) console.log(`\n=== ${file} ===\n${content}`);
  else writeFileSync(file, content);
}

if (warnings.size) {
  console.error(
    "\n⚠ scopes INCONNUS (ni package, ni ignore-list) — à mapper ou ajouter à IGNORE :",
  );
  for (const [scope, n] of warnings) console.error(`  ${scope} (${n})`);
}
console.log(
  `\n${entries.length} changeset(s) ${DRY ? "(dry-run, non écrits)" : "écrits"} : ${entries.map(([n]) => n).join(", ") || "aucun"}`,
);
