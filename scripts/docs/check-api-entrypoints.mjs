#!/usr/bin/env node

/**
 * @fileoverview Vérifie que les `entryPoints` TypeDoc couvrent exactement les
 * paquets publiables.
 *
 * La Référence API (TypeDoc) doit lister **tous** les paquets publiables et
 * **aucun** paquet privé ou disparu. Sans ce contrôle, un nouveau paquet
 * serait silencieusement absent de l'API (dérive). Ce script compare la liste
 * `typedocOptions.entryPoints` de `package.json` à l'ensemble réel des paquets
 * publiables (`packages/`, `cli/`, `services/` non-`private`) et échoue en cas
 * d'écart, avec le diff à appliquer.
 *
 * @module
 */

import { readFileSync } from "node:fs";
import { buildWorkspaceIndex } from "../audit/lib/workspace-index.mjs";

const PUBLISHABLE_ROOTS = new Set(["packages", "cli", "services"]);

const config = JSON.parse(readFileSync("package.json", "utf8"));
const entryPoints = new Set(config.typedocOptions?.entryPoints ?? []);

const workspaces = buildWorkspaceIndex();
const publishable = new Set(
  [...workspaces]
    .filter(
      ([, info]) =>
        info.packageJson.private !== true && PUBLISHABLE_ROOTS.has(info.root),
    )
    .map(([, info]) => info.dir),
);

const missing = [...publishable].filter((d) => !entryPoints.has(d)).sort();
const extra = [...entryPoints].filter((d) => !publishable.has(d)).sort();

if (missing.length === 0 && extra.length === 0) {
  console.log("API entry points up to date.");
  process.exit(0);
}

console.error("Référence API désynchronisée des paquets publiables :\n");
for (const d of missing) {
  console.error(`- MANQUANT dans typedocOptions.entryPoints : "${d}"`);
}
for (const d of extra) {
  console.error(`- À RETIRER de typedocOptions.entryPoints (non publiable) : "${d}"`);
}
console.error(
  "\nMets à jour le champ typedocOptions.entryPoints dans package.json.",
);
process.exit(1);
