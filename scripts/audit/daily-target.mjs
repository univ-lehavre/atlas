#!/usr/bin/env node

/**
 * Daily review target selector.
 *
 * Picks ONE review target for a given day, deterministically from the date —
 * so the choice is reproducible, idempotent, and testable (no Math.random).
 * The selection rotates across four dimensions with weights:
 *
 *   - source : un fichier source `packages|apps|services/*\/src/**\/*.ts`
 *   - test   : un fichier de test `**\/*.test.ts`
 *   - docs   : un fichier de documentation `docs/.../*.md(x)` ou un README de paquet
 *   - debt   : une dette / dimension globale tirée du pool curé `lib/debt-pool.json`
 *
 * This script does NOT conduct the review (a GitHub runner cannot run Claude —
 * cf. ADR 0039/0044). It only designates the target; `.github/workflows/
 * daily-review.yml` opens an issue from it, which the human reviews by hand.
 *
 * Usage:
 *   node scripts/audit/daily-target.mjs [--date=YYYY-MM-DD] [--json] [--seed=N]
 *
 * Default output is human-readable; `--json` emits the machine payload the
 * workflow consumes: { date, dimension, target, why, hints }.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const DEBT_POOL_PATH = path.join(HERE, "lib", "debt-pool.json");

// Roots scanned for source/test files. Sandbox is excluded on purpose:
// dev/test playground (ADR 0042), not production code worth a daily review.
const CODE_ROOTS = ["packages", "apps", "services", "cli", "ui"];

// Weighted rotation. The weights bias toward code (source+test) while keeping
// docs and debt in steady rotation. Sum need not be 100 — weights are relative.
export const DIMENSIONS = [
  { key: "source", weight: 35 },
  { key: "test", weight: 25 },
  { key: "docs", weight: 25 },
  { key: "debt", weight: 15 },
];

/**
 * Deterministic 32-bit hash of a string (FNV-1a). Used to derive a stable
 * per-day seed from the date — same date always yields the same target.
 */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick a dimension from the weighted list using an integer seed.
 * The mapping is stable: a given seed always lands on the same dimension.
 */
export function pickDimension(seed, dimensions = DIMENSIONS) {
  const total = dimensions.reduce((sum, d) => sum + d.weight, 0);
  let point = seed % total;
  for (const d of dimensions) {
    if (point < d.weight) return d.key;
    point -= d.weight;
  }
  return dimensions[dimensions.length - 1].key; // unreachable, defensive
}

/**
 * Pick one element from a sorted candidate list using a seed. Returns null for
 * an empty list. The list MUST be pre-sorted by the caller for determinism.
 */
export function pickFrom(candidates, seed) {
  if (candidates.length === 0) return null;
  return candidates[seed % candidates.length];
}

/**
 * Validate a YYYY-MM-DD date string. Throws on malformed input — the workflow
 * passes a real UTC date, tests pass fixed dates; a typo should fail loud.
 */
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date "${value}" — expected YYYY-MM-DD`);
  }
  return value;
}

/**
 * Recursively collect files under `dir` matching `predicate`, returning paths
 * relative to the repo root. Skips node_modules, dist, build artifacts and
 * hidden dirs. Returns a SORTED array (determinism).
 */
export function collectFiles(dir, predicate, root = REPO_ROOT) {
  const out = [];
  const abs = path.isAbsolute(dir) ? dir : path.join(root, dir);
  if (!existsSync(abs)) return out;

  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && predicate(full)) {
        out.push(path.relative(root, full));
      }
    }
  };
  walk(abs);
  return out.sort();
}

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".svelte-kit",
  ".turbo",
  ".astro",
  "upstream",
]);

const isTest = (f) => /\.(test|spec)\.[cm]?tsx?$/.test(f);
const isSource = (f) => /\/src\/.*\.[cm]?tsx?$/.test(f) && !isTest(f);
const isDocMd = (f) => /\.mdx?$/.test(f);

/** Enumerate candidate source files across code roots. */
export function sourceCandidates(root = REPO_ROOT) {
  return CODE_ROOTS.flatMap((r) =>
    collectFiles(path.join(r), (f) => isSource(f), root),
  ).sort();
}

/** Enumerate candidate test files across code roots. */
export function testCandidates(root = REPO_ROOT) {
  return CODE_ROOTS.flatMap((r) =>
    collectFiles(path.join(r), (f) => isTest(f), root),
  ).sort();
}

/**
 * Enumerate candidate documentation files: the Starlight content tree plus
 * every package README. ADR files are excluded (they are immutable once
 * accepted — cf. decisions index), as are generated content trees.
 */
export function docCandidates(root = REPO_ROOT) {
  const content = collectFiles(
    "docs/src/content/docs",
    (f) => isDocMd(f) && !/\/decisions\//.test(f),
    root,
  );
  const readmes = CODE_ROOTS.flatMap((r) =>
    collectFiles(r, (f) => /\/README\.mdx?$/.test(f), root),
  );
  return [...content, ...readmes].sort();
}

/** Load the curated debt pool items. */
export function loadDebtPool(poolPath = DEBT_POOL_PATH) {
  const raw = JSON.parse(readFileSync(poolPath, "utf8"));
  return Array.isArray(raw.items) ? raw.items : [];
}

/**
 * Build a target for a given date. Pure given its inputs (date + the candidate
 * providers), so tests inject fixtures and assert determinism.
 */
export function selectTarget(date, providers = {}) {
  const {
    source = sourceCandidates,
    test = testCandidates,
    docs = docCandidates,
    debt = loadDebtPool,
    seedOffset = 0,
  } = providers;

  const seed = (hashString(date) + seedOffset) >>> 0;
  const dimension = pickDimension(seed);
  // Second, decorrelated draw for the within-dimension pick.
  const pickSeed = hashString(`${date}#${dimension}`);

  if (dimension === "debt") {
    const items = debt();
    const item = pickFrom(items, pickSeed);
    if (!item) return fallbackTarget(date, seed); // empty pool → degrade gracefully
    return {
      date,
      dimension: "debt",
      target: item.id,
      why: item.title + " — " + item.why,
      hints: item.hints ?? [],
    };
  }

  const candidates =
    dimension === "source" ? source() : dimension === "test" ? test() : docs();
  const file = pickFrom(candidates, pickSeed);
  if (!file) return fallbackTarget(date, seed);

  return {
    date,
    dimension,
    target: file,
    why: WHY_BY_DIMENSION[dimension],
    hints: [file],
  };
}

const WHY_BY_DIMENSION = {
  source:
    "Revue d'un fichier source : lisibilité, robustesse, dette locale, fidélité à l'intention. Le constat doit être prouvé par le code.",
  test: "Revue d'un fichier de test : pertinence des cas, cas manquants, lisibilité, sur-mocking. Teste-t-il bien ce qui compte ?",
  docs: "Revue d'un fichier de documentation : exactitude, fraîcheur, vérifiabilité par le code (ADR 0028).",
};

/**
 * When a dimension's candidate list is empty (e.g. fixture, fresh repo), fall
 * back to the most universal target: a source file, else a debt item, else a
 * generic prompt. Keeps the workflow from ever producing an empty issue.
 */
function fallbackTarget(date, seed) {
  const src = sourceCandidates();
  const file = pickFrom(src, seed);
  if (file) {
    return {
      date,
      dimension: "source",
      target: file,
      why: WHY_BY_DIMENSION.source,
      hints: [file],
    };
  }
  return {
    date,
    dimension: "debt",
    target: "free-review",
    why: "Aucune cible automatique disponible : choisis librement une dimension du dépôt à améliorer aujourd'hui.",
    hints: [],
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const opts = { date: null, json: false, seedOffset: 0 };
  for (const arg of argv) {
    if (arg === "--json") opts.json = true;
    else if (arg.startsWith("--date=")) opts.date = parseDate(arg.slice(7));
    else if (arg.startsWith("--seed=")) {
      const n = Number(arg.slice(7));
      if (!Number.isInteger(n)) throw new Error(`Invalid --seed "${arg}"`);
      opts.seedOffset = n;
    } else throw new Error(`Unknown option "${arg}"`);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  // Default to today's UTC date. new Date() is intentional here (CLI entry,
  // not a tested pure function); tests always pass an explicit --date.
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const target = selectTarget(date, { seedOffset: opts.seedOffset });

  if (opts.json) {
    process.stdout.write(JSON.stringify(target, null, 2) + "\n");
    return;
  }

  console.log(`Revue quotidienne — ${target.date}`);
  console.log(`  Dimension : ${target.dimension}`);
  console.log(`  Cible     : ${target.target}`);
  console.log(`  Pourquoi  : ${target.why}`);
  if (target.hints.length)
    console.log(`  Indices   : ${target.hints.join(", ")}`);
}

// Run only as a CLI, not when imported by tests.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
