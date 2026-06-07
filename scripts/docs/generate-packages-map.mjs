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

const OUTPUT = "docs/src/content/docs/architecture/packages.md";
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

/**
 * Une phrase par catégorie : ce qu'elle contient et pourquoi elle existe
 * (charte rédactionnelle ADR 0052, règle R1 — chaque section a une intro avant
 * le tableau). Le découpage en catégories est cadré par l'ADR 0002.
 */
const CATEGORY_INTROS = {
  apps: "Les applications destinées aux utilisateurs finaux (interfaces web). Elles consomment les services et les bibliothèques sans être consommées par personne — ce sont les feuilles de l'arbre de dépendances.",
  services:
    "Les services HTTP déployés (back-ends). Ils exposent une API consommée par les applications et orchestrent l'accès aux plateformes externes.",
  packages:
    "Les bibliothèques réutilisables : toute la logique métier vit ici, jamais dans les applications ni les CLIs (ADR 0008). C'est le socle partagé du monorepo.",
  cli: "Les outils en ligne de commande. Ils restent **fins** : ils orchestrent et appellent les bibliothèques de `packages/`, sans porter de logique métier propre (ADR 0008).",
  ui: "Les composants d'interface partagés entre applications, pour garantir une cohérence visuelle sans dépendre d'un designer dédié.",
  config:
    "Les configurations transverses partagées (TypeScript, ESLint, Prettier, Vitest…) factorisées une fois et réutilisées par tous les paquets.",
  assets:
    "Les ressources statiques (logos, images) consommées par les applications.",
  sandbox:
    "Les bancs d'essai et prototypes isolés : terrain d'expérimentation qui n'est jamais consommé par un paquet publiable (ADR 0021).",
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
 * URL de la page de doc d'un paquet dans Starlight. Les README sont inclus en
 * place (route /packages/<dir>/, cf. ADR 0036) ; `dir` est le chemin du paquet
 * dans le monorepo (ex. `packages/crf-core` → `/atlas/packages/packages/crf-core/`).
 * Le slash FINAL est requis : Astro sert les pages avec, et le validateur de
 * liens rejette la forme sans slash.
 */
const readmeUrl = (dir) => `/atlas/packages/${dir}/`;

/**
 * Rôle d'un paquet : `description` du package.json, sinon premier paragraphe
 * du README, sinon une mention explicite (que l'audit signalera).
 */
const roleOf = (dir, packageJson) => {
  if (
    typeof packageJson.description === "string" &&
    packageJson.description.trim()
  )
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
      const rel = readme && existsSync(readme) ? readmeUrl(ws.dir) : null;
      const short = n.replace("@univ-lehavre/", "");
      return rel ? `[\`${short}\`](${rel})` : `\`${short}\``;
    })
    .join(", ");
};

/** Identifiant Mermaid sûr pour un nom de paquet. */
const mermaidId = (name) => name.replace(/[@/-]/g, "_");

/**
 * Classe un paquet racine (consommé par aucun autre paquet interne) selon la
 * RAISON pour laquelle personne ne l'appelle. Chaque raison correspond à un
 * sous-tableau de la section « Paquets racines », avec son intention propre :
 * un livrable au sommet de l'arbre est attendu, un paquet interne orphelin
 * mérite l'œil. L'ordre des clés fixe l'ordre d'affichage des sous-sections.
 *
 * @param {{root: string, packageJson: object}} info
 * @returns {"deliverable" | "cli" | "sandbox" | "published-library" | "internal-orphan"}
 */
const classifyRoot = ({ root, packageJson }) => {
  if (root === "apps" || root === "services") return "deliverable";
  if (root === "cli") return "cli";
  if (root === "sandbox") return "sandbox";
  // packages / ui / config / assets : bibliothèque. Publiée → livrable pour
  // l'extérieur ; privée → personne ne l'appelle ni en interne ni en aval.
  return packageJson.private === true ? "internal-orphan" : "published-library";
};

/** Sous-sections de « Paquets racines », dans l'ordre, avec leur préambule. */
const ROOT_GROUPS = [
  {
    key: "deliverable",
    title: "Livrables applicatifs",
    intro:
      "Applications et services : on les **déploie et on les exécute**, pas " +
      "on ne les importe. Être au sommet de l'arbre est leur nature même.",
  },
  {
    key: "cli",
    title: "Outils en ligne de commande",
    intro:
      "Points d'entrée lancés par un humain ou un script. Ils consomment des " +
      "bibliothèques internes mais ne sont eux-mêmes jamais importés (les CLIs " +
      "restent fins, la logique vit dans `packages/` — cf. ADR 0008).",
  },
  {
    key: "published-library",
    title: "Bibliothèques publiées sans consommateur interne",
    intro:
      "Paquets **publiables** (non `private`) qu'aucun autre paquet du dépôt " +
      "n'importe : leur public est **en aval**, hors du monorepo. C'est " +
      "légitime — un paquet peut être livré pour d'autres sans qu'on s'en " +
      "serve ici.",
  },
  {
    key: "sandbox",
    title: "Bancs d'essai",
    intro:
      "Démonstrateurs isolés : ils consomment le reste du dépôt pour l'illustrer " +
      "mais ne sont jamais consommés en retour (cf. ADR 0021).",
  },
  {
    key: "internal-orphan",
    title: "Paquets internes sans consommateur",
    intro:
      "Paquets **privés** (`private: true`) que personne n'importe et qui ne " +
      "sont pas publiés : ni consommateur interne, ni public aval. À surveiller " +
      "— code potentiellement mort, ou point d'entrée pas encore raccordé.",
  },
];

/**
 * Section « Paquets racines » : pour chaque raison d'être racine, un tableau
 * des paquets concernés avec leur rôle. Répond explicitement à « quels paquets
 * ne sont jamais appelés par d'autres, et pourquoi ».
 *
 * @param {Map<string, {root: string, dir: string, packageJson: object}>} workspaces
 * @param {string[]} roots - Noms des paquets racines (reverse-deps vide), triés.
 * @returns {string[]} Lignes Markdown.
 */
const renderRootPackages = (workspaces, roots) => {
  const grouped = new Map(ROOT_GROUPS.map((g) => [g.key, []]));
  for (const name of roots) {
    grouped.get(classifyRoot(workspaces.get(name))).push(name);
  }

  const lines = ["## Paquets racines", ""];
  lines.push(
    "Un paquet est **racine** quand aucun autre paquet du dépôt ne le consomme.",
    "La colonne « Consommé par » de la carte ci-dessus le marque d'un « — ». Ce",
    "n'est pas un défaut en soi : un livrable est racine par construction. Les",
    "sous-sections ci-dessous regroupent ces paquets **par raison** d'être",
    "racine, de l'attendu (un livrable au sommet) au suspect (un paquet interne",
    "que plus personne n'appelle).",
    "",
  );

  for (const group of ROOT_GROUPS) {
    const names = grouped.get(group.key);
    if (names.length === 0) continue;
    lines.push(`### ${group.title}`, "", group.intro, "");
    lines.push("| Paquet | Catégorie | Rôle |", "| --- | --- | --- |");
    for (const name of names) {
      const { dir, packageJson, root } = workspaces.get(name);
      const short = name.replace("@univ-lehavre/", "");
      const readme = path.join(dir, "README.md");
      const nameCell = existsSync(readme)
        ? `[\`${short}\`](${readmeUrl(dir)})`
        : `\`${short}\``;
      lines.push(
        `| ${nameCell} | \`${root}/\` | ${cell(roleOf(dir, packageJson))} |`,
      );
    }
    lines.push("");
  }

  return lines;
};

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
    if (CATEGORY_INTROS[category]) {
      lines.push(CATEGORY_INTROS[category], "");
    }
    lines.push(
      "| Paquet | Rôle | Dépend de | Consommé par |",
      "| --- | --- | --- | --- |",
    );
    for (const name of names) {
      const { dir, packageJson } = workspaces.get(name);
      const short = name.replace("@univ-lehavre/", "");
      const readme = path.join(dir, "README.md");
      const nameCell = existsSync(readme)
        ? `[\`${short}\`](${readmeUrl(dir)})`
        : `\`${short}\``;
      const role = cell(roleOf(dir, packageJson));
      const dependsOn = linkList(
        internalDepsOf(packageJson, workspaces),
        workspaces,
      );
      const consumedBy = linkList(reverse.get(name) ?? [], workspaces);
      lines.push(`| ${nameCell} | ${role} | ${dependsOn} | ${consumedBy} |`);
    }
    lines.push("");
  }

  // Racines = paquets que personne ne consomme (reverse-deps vide). Tri par
  // catégorie (ordre ROOTS) puis nom — partagé par la section descriptive et
  // par les graphes Mermaid ci-dessous.
  const roots = [...workspaces.keys()]
    .filter((name) => (reverse.get(name) ?? []).length === 0)
    .sort((a, b) => {
      const ra = ROOTS.indexOf(workspaces.get(a).root);
      const rb = ROOTS.indexOf(workspaces.get(b).root);
      return ra - rb || a.localeCompare(b);
    });

  // ── Section descriptive « Paquets racines » ─────────────────────────────
  lines.push(...renderRootPackages(workspaces, roots));

  // ── Graphes Mermaid : un graphe par racine (app/CLI) ────────────────────
  // Un graphe global de 43 nœuds / 114 arêtes est illisible. On le découpe :
  // pour chaque RACINE (paquet que personne ne consomme — typiquement une app
  // ou un CLI, le « point d'entrée » d'un livrable), on dessine uniquement son
  // sous-arbre de dépendances transitives. Chaque graphe répond à « pour
  // comprendre tel livrable, de quoi dépend-il, directement et indirectement ».
  lines.push("## Graphes de dépendances par livrable", "");
  lines.push(
    "Le graphe complet (toutes les dépendances internes d'un coup) est",
    "illisible. On le découpe **par livrable** : chaque application ou outil en",
    "ligne de commande — un paquet que personne d'autre ne consomme — a son",
    "propre graphe, limité à ses **dépendances transitives**. Une flèche",
    "`A --> B` signifie « A dépend de B » (tous champs de dépendances confondus).",
    "Un livrable sans dépendance interne n'a pas de graphe.",
    "",
  );

  for (const root of roots) {
    // Fermeture transitive des dépendances de `root` (DFS), arêtes incluses.
    const subNodes = new Set([root]);
    const subEdges = [];
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      for (const dep of [...(graph.get(node) ?? [])].sort()) {
        subEdges.push([node, dep]);
        if (!subNodes.has(dep)) {
          subNodes.add(dep);
          stack.push(dep);
        }
      }
    }
    // Un livrable sans dépendance interne : pas de graphe (table suffit).
    if (subEdges.length === 0) continue;

    const short = root.replace("@univ-lehavre/", "");
    const dir = workspaces.get(root).dir;
    const readme = path.join(dir, "README.md");
    const heading = existsSync(readme)
      ? `[\`${short}\`](${readmeUrl(dir)})`
      : `\`${short}\``;
    lines.push(`### ${heading}`, "");
    lines.push("```mermaid", "flowchart TD");
    for (const name of [...subNodes].sort()) {
      const label = name.replace("@univ-lehavre/", "");
      lines.push(`  ${mermaidId(name)}["${label}"]`);
    }
    subEdges.sort(
      (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]),
    );
    for (const [from, to] of subEdges) {
      lines.push(`  ${mermaidId(from)} --> ${mermaidId(to)}`);
    }
    lines.push("```", "");
  }

  return lines.join("\n").trimEnd() + "\n";
};

/** Assemble la page complète (frontmatter Starlight + intro FR + corps généré). */
const renderPage = (body) =>
  `---
title: Carte des paquets
---

Cette page liste **tous les paquets du monorepo** : leur rôle, leur catégorie,
et leurs dépendances internes — qui consomme quoi. Elle répond à la question
« pour comprendre un paquet, lesquels dois-je lire ? ». Une section dédiée
recense les [paquets racines](#paquets-racines) — ceux qu'aucun autre paquet
n'appelle — et explique, pour chacun, pourquoi.

> **Page générée.** Le contenu ci-dessous est dérivé des \`package.json\` par
> \`scripts/docs/generate-packages-map.mjs\`. Ne l'éditez pas à la main : lancez
> \`pnpm docs:generate\` après un changement de dépendances. La fraîcheur est
> vérifiée en CI (plan « Documentation vérifiable »).

Pour la vue d'ensemble par catégorie et les règles transverses, voir
[la structure du monorepo](/atlas/architecture/monorepo/).

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
