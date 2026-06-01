#!/usr/bin/env node

/**
 * @fileoverview Génère la carte des paquets du monorepo.
 *
 * Produit `docs/architecture/packages.md` : pour chaque paquet, son rôle,
 * sa catégorie, ses dépendances internes et les paquets qui le consomment.
 * Cette page est **dérivée du code** (les `package.json`) — elle ne doit pas
 * être éditée à la main : le corps auto-généré est encadré par des marqueurs
 * et vérifié à jour en CI (cf. ADR 0028, plan « Documentation vérifiable »).
 *
 * Usage :
 *   node scripts/docs/generate-packages-map.mjs           # écrit le fichier
 *   node scripts/docs/generate-packages-map.mjs --check    # échoue si périmé
 *
 * @module
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import prettier from "prettier";
import {
  ROOTS,
  buildWorkspaceIndex,
  buildDependencyGraph,
  internalDepsOf,
} from "../audit/lib/workspace-index.mjs";

const OUTPUT = "docs/architecture/packages.md";
const START = "<!-- AUTO-GENERATED:packages-map START -->";
const END = "<!-- AUTO-GENERATED:packages-map END -->";

/** Libellés lisibles des catégories, dans l'ordre d'affichage. */
const CATEGORY_LABELS = {
  apps: "Applications (`apps/`)",
  services: "Services (`services/`)",
  packages: "Bibliothèques (`packages/`)",
  cli: "Outils en ligne de commande (`cli/`)",
  ui: "Interface partagée (`ui/`)",
  config: "Configuration (`config/`)",
  assets: "Ressources (`assets/`)",
  sandbox: "Bancs d'essai (`sandbox/`)",
};

/** Ordre d'affichage des catégories (du plus « consommateur » au plus « socle »). */
const CATEGORY_ORDER = [
  "apps",
  "services",
  "packages",
  "cli",
  "ui",
  "config",
  "assets",
  "sandbox",
];

/**
 * Rôle d'un paquet : `description` du package.json, sinon premier paragraphe
 * du README, sinon une mention explicite (que l'audit signalera).
 */
const roleOf = (dir, packageJson) => {
  if (typeof packageJson.description === "string" && packageJson.description.trim())
    return packageJson.description.trim();
  const readme = path.join(dir, "README.md");
  if (existsSync(readme)) {
    const lines = readFileSync(readme, "utf8").split("\n");
    for (const line of lines) {
      const t = line.trim();
      // Ignore titres, badges (`![...]` ou `[![...]`), citations, HTML.
      if (
        t === "" ||
        t.startsWith("#") ||
        t.startsWith("![") ||
        t.startsWith("[![") ||
        t.startsWith(">") ||
        t.startsWith("<")
      )
        continue;
      return t;
    }
  }
  return "_(rôle non documenté)_";
};

/** Construit la table inverse : paquet → paquets qui le consomment (triés). */
const buildReverseDeps = (graph) => {
  const reverse = new Map([...graph.keys()].map((name) => [name, []]));
  for (const [name, targets] of graph) {
    for (const target of targets) {
      if (reverse.has(target)) reverse.get(target).push(name);
    }
  }
  for (const list of reverse.values()) list.sort();
  return reverse;
};

/**
 * Rend une chaîne sûre pour une cellule de tableau Markdown : on neutralise
 * tout ce qui casserait la cellule ou la ligne. Ordre important — on échappe
 * d'abord les antislashs, puis les pipes ; on aplatit les retours à la ligne
 * (qui termineraient la ligne du tableau) et on neutralise les balises HTML.
 */
const cell = (s) =>
  String(s)
    .replace(/\\/g, "\\\\") // antislash littéral d'abord
    .replace(/\r?\n/g, " ") // retours à la ligne → espace
    .replace(/\|/g, "\\|") // pipe → pipe échappé
    .replace(/</g, "&lt;") // balises HTML neutralisées
    .replace(/>/g, "&gt;")
    .trim();

/** Lien Markdown vers une liste de paquets (ou « — » si vide). */
const linkList = (names, workspaces) => {
  if (names.length === 0) return "—";
  return names
    .map((n) => {
      const ws = workspaces.get(n);
      const readme = ws ? path.join(ws.dir, "README.md") : null;
      const rel = readme && existsSync(readme) ? `../../${readme}` : null;
      const short = n.replace("@univ-lehavre/", "");
      return rel ? `[\`${short}\`](${rel})` : `\`${short}\``;
    })
    .join(", ");
};

/** Identifiant Mermaid sûr pour un nom de paquet. */
const mermaidId = (name) => name.replace(/[@/-]/g, "_");

/**
 * Génère le corps Markdown (entre les marqueurs).
 *
 * @param {string} [cwd]
 * @returns {string}
 */
export const generateBody = (cwd = ".") => {
  const workspaces = buildWorkspaceIndex(cwd);
  const graph = buildDependencyGraph(workspaces);
  const reverse = buildReverseDeps(graph);

  // Regrouper par catégorie (root), trier les paquets par nom.
  const byCategory = new Map(ROOTS.map((r) => [r, []]));
  for (const [name, info] of workspaces) byCategory.get(info.root).push(name);
  for (const list of byCategory.values()) list.sort();

  const lines = [];

  // ── Tableaux par catégorie ──────────────────────────────────────────────
  for (const category of CATEGORY_ORDER) {
    const names = byCategory.get(category) ?? [];
    if (names.length === 0) continue;
    lines.push(`### ${CATEGORY_LABELS[category]}`, "");
    lines.push(
      "| Paquet | Rôle | Dépend de | Consommé par |",
      "| --- | --- | --- | --- |",
    );
    for (const name of names) {
      const { dir, packageJson } = workspaces.get(name);
      const short = name.replace("@univ-lehavre/", "");
      const readme = path.join(dir, "README.md");
      const nameCell = existsSync(readme)
        ? `[\`${short}\`](../../${readme})`
        : `\`${short}\``;
      const role = cell(roleOf(dir, packageJson));
      const dependsOn = linkList(internalDepsOf(packageJson, workspaces), workspaces);
      const consumedBy = linkList(reverse.get(name) ?? [], workspaces);
      lines.push(`| ${nameCell} | ${role} | ${dependsOn} | ${consumedBy} |`);
    }
    lines.push("");
  }

  // ── Graphe Mermaid (un sous-graphe par catégorie) ───────────────────────
  lines.push("## Graphe des dépendances internes", "");
  lines.push(
    "Chaque flèche `A --> B` signifie « A dépend de B » (dépendance interne au",
    "monorepo, tous champs confondus). Les paquets sont regroupés par catégorie.",
    "",
  );
  lines.push("```mermaid", "flowchart LR");
  for (const category of CATEGORY_ORDER) {
    const names = byCategory.get(category) ?? [];
    if (names.length === 0) continue;
    lines.push(`  subgraph ${category}`);
    for (const name of names) {
      const short = name.replace("@univ-lehavre/", "");
      lines.push(`    ${mermaidId(name)}["${short}"]`);
    }
    lines.push("  end");
  }
  // Arêtes (triées pour le déterminisme).
  const edges = [];
  for (const [name, targets] of graph) {
    for (const target of targets) edges.push([name, target]);
  }
  edges.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  for (const [from, to] of edges) {
    lines.push(`  ${mermaidId(from)} --> ${mermaidId(to)}`);
  }
  lines.push("```", "");

  return lines.join("\n").trimEnd() + "\n";
};

/** Assemble la page complète (intro manuelle FR + corps généré). */
const renderPage = (body) =>
  `# Carte des paquets

Cette page liste **tous les paquets du monorepo** : leur rôle, leur catégorie,
et leurs dépendances internes — qui consomme quoi. Elle répond à la question
« pour comprendre un paquet, lesquels dois-je lire ? ».

> **Page générée.** Le contenu ci-dessous est dérivé des \`package.json\` par
> \`scripts/docs/generate-packages-map.mjs\`. Ne l'éditez pas à la main : lancez
> \`pnpm docs:generate\` après un changement de dépendances. La fraîcheur est
> vérifiée en CI (plan « Documentation vérifiable »).

Pour la vue d'ensemble par catégorie et les règles transverses, voir
[la structure du monorepo](./monorepo.md).

${START}

${body.trimEnd()}

${END}
`;

/**
 * Page complète, formatée par Prettier (config du dépôt) pour être
 * déterministe et stable vis-à-vis du hook `format`.
 *
 * @param {string} [cwd]
 * @returns {Promise<string>}
 */
export const renderFormattedPage = async (cwd = ".") => {
  const raw = renderPage(generateBody(cwd));
  const options = (await prettier.resolveConfig(OUTPUT)) ?? {};
  return prettier.format(raw, { ...options, parser: "markdown" });
};

/** Vrai si le fichier sur disque correspond au contenu attendu. */
const isUpToDate = (expected) =>
  existsSync(OUTPUT) && readFileSync(OUTPUT, "utf8") === expected;

const main = async () => {
  const check = process.argv.includes("--check");
  const page = await renderFormattedPage();
  if (check) {
    if (isUpToDate(page)) {
      console.log("Packages map is up to date.");
      process.exit(0);
    }
    console.error(
      `Packages map is stale: ${OUTPUT} ne reflète plus les package.json.\n` +
        "Lance `pnpm docs:generate` puis commite le résultat.",
    );
    process.exit(1);
  }
  writeFileSync(OUTPUT, page);
  console.log(`Wrote ${OUTPUT}`);
};

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
