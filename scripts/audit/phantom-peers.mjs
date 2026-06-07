#!/usr/bin/env node

/**
 * @fileoverview Audit « phantom-peer » — l'angle mort de knip, ciblé sur
 * les paquets `@effect/*` « peers pratiquement optionnels ».
 *
 * knip compte « utilisée » toute dépendance qui satisfait une
 * `peerDependency` d'un paquet importé, même si le code ne l'importe
 * jamais directement. Un tel phantom échappe donc à `audit:unused`
 * (cf. [ADR 0050](../../docs/src/content/docs/decisions/0050-limite-knip-peer-deps.md)).
 *
 * Distinguer en général un vrai phantom d'un peer légitimement requis
 * demande l'analyse d'usage de l'intermédiaire — c'est le « hard problem »
 * que l'ADR 0050 nomme, qu'aucune analyse du graphe de dépendances ne
 * tranche seule. Exemple : `@effect/platform-node` déclare
 * `@effect/cluster`/`rpc`/`sql` en peers **non marqués optionnels**, alors
 * qu'ils ne servent qu'à des fonctionnalités que les CLIs n'utilisent pas.
 * Symétriquement `@effect/printer`/`printer-ansi`, peers de `@effect/cli`,
 * sont **requis** au runtime bien que jamais importés directement.
 *
 * Ce contrôle vise donc précisément la classe qui a piégé l'écart E4 : une
 * **liste explicite** de paquets `@effect/*` « peers pratiquement
 * optionnels » qui ne doivent **jamais** être déclarés en dépendance s'ils
 * ne sont pas importés. Portée volontairement étroite (zéro faux positif)
 * plutôt qu'une heuristique générale bruyante. Toute nouvelle entrée
 * s'ajoute à {@link OPTIONAL_EFFECT_PEERS} avec sa raison.
 *
 * Les dérogations légitimes (usage dynamique) restent déclarées dans
 * `package.json` via `knip.ignoreDependencies` (cf. ADR 0019).
 *
 * @module
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { buildWorkspaceIndex, deps } from "./lib/workspace-index.mjs";

/**
 * Paquets `@effect/*` déclarés en peers (souvent non marqués optionnels)
 * par des paquets de l'écosystème, mais qui n'apportent rien tant qu'on
 * n'importe pas explicitement leurs API. Les déclarer sans les importer
 * crée un phantom que knip ne signale pas (ils satisfont un peer d'un dep
 * importé). C'est exactement le cas retiré par E4.
 */
export const OPTIONAL_EFFECT_PEERS = new Set([
  "@effect/cluster", // peer de @effect/platform-node — sharding, inutile aux CLIs/services actuels
  "@effect/rpc", // peer de @effect/platform-node — RPC, non utilisé
  "@effect/sql", // peer de @effect/platform-node — accès SQL, non utilisé
  "@effect/experimental", // peer optionnel — DevTools/persistence, à n'inclure que si importé
]);

const IMPORT_RE =
  /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const SOURCE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte"];

function* iterSourceFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      ["node_modules", "dist", "coverage", ".svelte-kit"].includes(entry.name)
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* iterSourceFiles(full);
    else if (SOURCE_EXT.some((ext) => entry.name.endsWith(ext))) yield full;
  }
}

/** Vrai si `pkg` (ou un sous-chemin) est importé quelque part sous `dir`. */
const isImported = (dir, pkg) => {
  for (const file of iterSourceFiles(dir)) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2];
      if (spec === pkg || spec?.startsWith(pkg + "/")) return true;
    }
  }
  return false;
};

/**
 * Cœur pur, testable. Pour chaque paquet, signale les `@effect/*`
 * « pratiquement optionnels » déclarés mais jamais importés.
 *
 * @param {Map<string, {dir: string, packageJson: object}>} workspaces
 * @param {(dir: string, dep: string) => boolean} importChecker - vrai si
 *   `dep` est importé sous `dir`. Injecté pour pouvoir tester sans I/O.
 * @returns {{pkg: string, dep: string}[]} findings
 */
export const findPhantomPeers = (workspaces, importChecker) => {
  const findings = [];
  for (const [name, { dir, packageJson }] of workspaces) {
    const declared = deps(packageJson, "dependencies", "devDependencies");
    const ignored = new Set(packageJson.knip?.ignoreDependencies ?? []);

    for (const depName of Object.keys(declared)) {
      if (!OPTIONAL_EFFECT_PEERS.has(depName)) continue;
      if (ignored.has(depName)) continue; // dérogation ADR 0019 assumée
      if (importChecker(dir, depName)) continue; // réellement utilisée
      findings.push({ pkg: name, dep: depName });
    }
  }
  return findings;
};

const main = () => {
  const workspaces = buildWorkspaceIndex();
  const findings = findPhantomPeers(workspaces, isImported);

  if (findings.length === 0) {
    console.log(
      "Audit phantom-peers : OK — aucun peer @effect/* pratiquement optionnel déclaré sans être importé.",
    );
    return;
  }

  console.error(
    `Audit phantom-peers : ${findings.length} dépendance(s) @effect/* fantôme(s) (déclarée(s), jamais importée(s), masquée(s) par un peerDependency — invisible(s) pour knip) :\n`,
  );
  for (const { pkg, dep } of findings) {
    console.error(
      `  [${pkg}] « ${dep} » : déclarée mais jamais importée. La retirer du package.json, ou (si l'usage est dynamique) la déclarer en knip.ignoreDependencies avec sa raison (cf. ADR 0019/0050).`,
    );
  }
  process.exit(1);
};

// Run main only when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main();
}
