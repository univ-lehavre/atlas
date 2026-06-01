/**
 * @fileoverview Indexation partagée du workspace pnpm.
 *
 * Brique commune réutilisée par les audits de structure
 * (`scripts/audit/workspace-structure.mjs`) et par la génération de la
 * carte des paquets (`scripts/docs/generate-packages-map.mjs`). Centralise
 * la découverte des paquets, la lecture des `package.json`, le graphe des
 * dépendances internes et la détection de cycles — pour qu'une seule source
 * de vérité décrive « quels paquets existent et qui dépend de qui ».
 *
 * @module
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

/** Les huit catégories racines du monorepo (cf. ADR 0002). */
export const ROOTS = [
  "apps",
  "assets",
  "cli",
  "config",
  "packages",
  "sandbox",
  "services",
  "ui",
];

/** Lit et parse un `package.json` (ou tout fichier JSON). */
export const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

/**
 * Fusionne les champs de dépendances demandés en un seul objet
 * `{ nom: range }`. Exemple : `deps(pkg, "dependencies", "devDependencies")`.
 */
export const deps = (packageJson, ...fields) =>
  Object.assign({}, ...fields.map((f) => packageJson[f] ?? {}));

/**
 * Parcourt les huit catégories et indexe chaque paquet ayant un `name`.
 *
 * @param {string} [cwd] - Répertoire racine à scanner (défaut : `.`).
 * @returns {Map<string, {root: string, dir: string, packageJson: object}>}
 *   Indexé par nom de paquet (`@univ-lehavre/atlas-...`).
 */
export const buildWorkspaceIndex = (cwd = ".") => {
  const workspaces = new Map();
  for (const root of ROOTS) {
    const rootDir = path.join(cwd, root);
    if (!existsSync(rootDir)) continue;
    for (const entry of readdirSync(rootDir)) {
      const dir = path.join(root, entry);
      const absDir = path.join(cwd, dir);
      if (!statSync(absDir).isDirectory()) continue;
      const packageJsonPath = path.join(absDir, "package.json");
      if (!existsSync(packageJsonPath)) continue;
      const packageJson = readJson(packageJsonPath);
      if (packageJson.name)
        workspaces.set(packageJson.name, { root, dir, packageJson });
    }
  }
  return workspaces;
};

/**
 * Dépendances INTERNES (workspace) d'un paquet, tous champs confondus.
 *
 * @param {object} packageJson
 * @param {Map<string, unknown>} workspaces - Index produit par
 *   {@link buildWorkspaceIndex}.
 * @returns {string[]} Noms des paquets internes consommés (triés).
 */
export const internalDepsOf = (packageJson, workspaces) => {
  const allDeps = deps(
    packageJson,
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  );
  return Object.keys(allDeps)
    .filter((d) => workspaces.has(d))
    .sort();
};

/**
 * Graphe d'adjacence des dépendances internes : `nom → Set<nom>`.
 *
 * @param {Map<string, {packageJson: object}>} workspaces
 * @returns {Map<string, Set<string>>}
 */
export const buildDependencyGraph = (workspaces) => {
  const graph = new Map();
  for (const [name, { packageJson }] of workspaces) {
    graph.set(name, new Set(internalDepsOf(packageJson, workspaces)));
  }
  return graph;
};

/**
 * Détecte les cycles de dépendances internes (DFS).
 *
 * @param {Map<string, Set<string>>} graph - Produit par
 *   {@link buildDependencyGraph}.
 * @returns {string[][]} Liste de cycles (chaque cycle = chaîne de noms).
 */
export const detectCycles = (graph) => {
  const visited = new Set();
  const inStack = new Set();
  const cycles = [];

  const dfs = (node, stack) => {
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
  };

  for (const name of graph.keys()) {
    if (!visited.has(name)) dfs(name, []);
  }

  return cycles;
};
