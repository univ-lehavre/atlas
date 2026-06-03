#!/usr/bin/env node

/**
 * @fileoverview Migre le contenu Markdown de VitePress vers Astro Starlight.
 *
 * Migration ponctuelle (étape 2 de l'ADR 0036). Pour chaque page de `docs/`
 * (hors `.vitepress/` et `api/` généré), produit la page équivalente dans
 * `docs-astro/src/content/docs/` :
 *  - extrait le premier titre `# H1` et le place en frontmatter `title`
 *    (Starlight l'exige et affiche le titre depuis le frontmatter, pas le corps) ;
 *  - retire ce H1 du corps pour éviter un double titre ;
 *  - convertit les `README.md` d'index de section en `index.md` ;
 *  - laisse le contenu Markdown et les blocs Mermaid intacts.
 *
 * Le script est idempotent : relancé, il réécrit les pages cibles.
 *
 * Usage : node scripts/docs/migrate-to-starlight.mjs
 * @module
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const SRC = "docs";
const DEST = "docs-astro/src/content/docs";

/** Liste récursive des pages Markdown à migrer (hors zones non pertinentes). */
const listPages = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === ".vitepress" || entry === "api") continue;
      out.push(...listPages(full));
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Réécrit les liens Markdown internes pour Starlight. Un lien relatif vers une
 * autre page de doc (`...x.md` ou `...x.md#ancre`) perd son `.md` — Starlight
 * résout les liens relatifs sans extension. Les liens vers `README.md`
 * deviennent le segment de répertoire (l'index). Les liens vers des fichiers
 * HORS de `docs/` (`../../packages/...`, `../../CONTRIBUTING.md`) sont laissés
 * tels quels : ils relèvent d'étapes ultérieures (README inclus en place) ou
 * pointent vers GitHub.
 */
const rewriteLinks = (body) =>
  body.replace(/\]\(([^)]*?)\.md(#[^)]*)?\)/g, (match, path, anchor = "") => {
    // Liens externes (http, mailto) : intacts.
    if (/^[a-z]+:/i.test(path)) return match;
    // Hors docs/ (remonte au-delà de la racine docs) : on ne touche pas — ces
    // cibles (README de paquets, CONTRIBUTING…) relèvent d'étapes ultérieures.
    if (path.includes("../../")) return match;
    // README.md → répertoire (index Starlight) ; sinon on retire juste `.md`.
    const cleaned = path.replace(/(^|\/)README$/, "$1");
    return `](${cleaned}${anchor})`;
  });

/** Échappe une valeur de frontmatter YAML (guillemets si nécessaire). */
const yamlString = (value) => {
  const needsQuotes =
    /[:#"'\[\]{}&*!|>%@`]/.test(value) || value.includes("  ");
  if (!needsQuotes) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
};

/** Sépare un éventuel frontmatter existant du corps. */
const splitFrontmatter = (content) => {
  if (!content.startsWith("---\n")) return { frontmatter: null, body: content };
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: null, body: content };
  return {
    frontmatter: content.slice(4, end),
    body: content.slice(end + 5),
  };
};

/** Transforme une page VitePress en page Starlight. */
const transform = (content, relPath) => {
  const { frontmatter, body } = splitFrontmatter(content);

  // Page d'accueil VitePress (layout: home) → splash Starlight minimal.
  if (frontmatter && /layout:\s*home/.test(frontmatter)) {
    return [
      "---",
      "title: Atlas",
      "description: Un dépôt, plusieurs projets, une chaîne de qualité commune.",
      "template: splash",
      "---",
      "",
      "Un dépôt Git unique rassemblant plusieurs projets logiciels sous une",
      "chaîne de qualité commune. Choisis ton entrée :",
      "",
      "- [**Je découvre**](/atlas/architecture/monorepo) — comprendre le dépôt sans prérequis technique.",
      "- [**Je veux lire le code**](/atlas/architecture/comprendre-le-code) — entrer dans le code par le bon endroit.",
      "- [**La carte des paquets**](/atlas/architecture/packages) — rôle, dépendances et consommateurs de chaque paquet.",
      "",
    ].join("\n");
  }

  // Extrait le premier H1 comme titre, le retire du corps.
  const lines = body.split("\n");
  let title = null;
  const kept = [];
  for (const line of lines) {
    if (title === null) {
      const m = line.match(/^#\s+(.+?)\s*$/);
      if (m) {
        title = m[1];
        continue; // on retire le H1 du corps
      }
    }
    kept.push(line);
  }
  if (title === null) title = relPath.replace(/\.md$/, "");

  // Retire les lignes vides en tête du corps restant.
  while (kept.length > 0 && kept[0].trim() === "") kept.shift();

  const rewritten = rewriteLinks(kept.join("\n"));
  return ["---", `title: ${yamlString(title)}`, "---", "", rewritten].join(
    "\n",
  );
};

/** Chemin cible Starlight : README.md → index.md, sinon inchangé. */
const destPath = (srcPath) => {
  let rel = relative(SRC, srcPath);
  rel = rel.replace(/(^|\/)README\.md$/, "$1index.md");
  return join(DEST, rel);
};

const main = () => {
  const pages = listPages(SRC);
  let count = 0;
  for (const src of pages) {
    const content = readFileSync(src, "utf8");
    const out = transform(content, relative(SRC, src));
    const dest = destPath(src);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
    count += 1;
  }
  console.log(`Migré ${count} pages vers ${DEST}`);
};

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) main();
