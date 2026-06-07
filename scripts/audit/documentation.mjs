/**
 * @fileoverview Audit de la documentation rédigée.
 *
 * Vérifie que la documentation *écrite à la main* (README de paquets, pages
 * `docs/**`, ADR) reste cohérente avec le code et navigable — pendant que la
 * partie *générée* (carte des paquets) est, elle, garantie à jour par
 * `docs:generate:check`. On n'audite jamais la qualité rédactionnelle (ton,
 * exactitude sémantique) : seulement des invariants structurels mécaniquement
 * vérifiables. Voir le plan « documentation vérifiable » et l'ADR 0028.
 *
 * Deux niveaux de sévérité :
 *   - BLOQUANT (exit 1) : un manquement qui casse la navigation ou ment sur le
 *     code (README absent, lien interne mort, ADR référencé inexistant, page
 *     orpheline, carte périmée).
 *   - AVERTISSEMENT (exit 0) : un écart mesuré mais toléré pour l'instant
 *     (sous-chemin `exports`/`bin` non mentionné, description manquante…).
 *     Affiché pour piloter la dette ; promu en bloquant plus tard sans
 *     réécrire le script.
 *
 * Calqué sur `scripts/audit/coverage-report.mjs` : fonctions pures exportées
 * (testables) + `main()` gardé par `invokedDirectly`.
 *
 * @module
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { buildWorkspaceIndex } from "./lib/workspace-index.mjs";

/** Préfixe de scope des paquets du monorepo (pour l'affichage court). */
const SCOPE_PREFIX = "@univ-lehavre/atlas-";

/**
 * Lit un fichier en UTF-8, ou renvoie `null` s'il est absent/illisible. On lit
 * directement (pas de `existsSync` préalable) pour éviter un schéma
 * vérification-puis-usage (TOCTOU) — cf. CodeQL `js/file-system-race`.
 */
export const readText = (filePath) => {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};

/** Premier titre H1 (`# …`) d'un markdown, ou `null`. */
export const firstH1 = (markdown) => {
  const m = markdown.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
};

/**
 * Vrai s'il existe un paragraphe de prose (ligne non vide qui n'est ni un
 * titre, ni une liste, ni une clôture de bloc) APRÈS le premier H1. Sert à
 * vérifier qu'un README ne se réduit pas à un titre.
 */
export const hasDescriptionParagraph = (markdown) => {
  const lines = markdown.split("\n");
  const h1Index = lines.findIndex((l) => /^#\s+/.test(l));
  if (h1Index === -1) return false;
  let inFence = false;
  for (const line of lines.slice(h1Index + 1)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (trimmed === "") continue;
    if (/^#{1,6}\s/.test(trimmed)) continue; // sous-titre
    if (/^[-*+]\s/.test(trimmed)) continue; // puce
    if (/^\d+\.\s/.test(trimmed)) continue; // liste ordonnée
    if (/^>/.test(trimmed)) continue; // citation
    if (/^[|!<]/.test(trimmed)) continue; // tableau, image, HTML
    return true;
  }
  return false;
};

/**
 * Normalise un nom de paquet pour comparaison au titre H1 : sans scope, tirets
 * et casse neutralisés. `@univ-lehavre/atlas-crf-core` → `crfcore`.
 */
export const normalizeName = (s) =>
  s
    .replace(SCOPE_PREFIX, "")
    .replace(/^@[^/]+\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Le H1 « évoque-t-il » le nom du paquet ? On tolère le nom court (sans scope,
 * sans suffixe `-cli`) : un README titré « atlas-biblio » pour le paquet
 * `@univ-lehavre/atlas-biblio-cli` est cohérent.
 */
export const h1MatchesName = (h1, packageName) => {
  const h1n = normalizeName(h1);
  const full = normalizeName(packageName);
  const short = full.replace(/cli$/, "");
  return h1n.includes(short) || full.includes(h1n) || h1n.includes(full);
};

/** Sous-chemins `exports` significatifs (hors `.` et `./package.json`). */
export const exportSubpaths = (packageJson) =>
  packageJson.exports && typeof packageJson.exports === "object"
    ? Object.keys(packageJson.exports).filter(
        (k) => k !== "." && k !== "./package.json",
      )
    : [];

/** Noms de commandes exposées par `bin` (objet ou chaîne unique). */
export const binNames = (packageJson) => {
  const bin = packageJson.bin;
  if (!bin) return [];
  if (typeof bin === "string") return [packageJson.name.replace(/^.*\//, "")];
  return Object.keys(bin);
};

/**
 * Liens relatifs Markdown vers des fichiers `.md` ([texte](./x.md),
 * (../y.md#ancre)). Renvoie les chemins (sans l'ancre). Ignore http(s),
 * mailto, ancres pures et liens absolus.
 */
export const relativeMarkdownLinks = (markdown) =>
  [...markdown.matchAll(/\]\((\.\.?\/[^)\s#]+\.md)(?:#[^)]*)?\)/g)].map(
    (m) => m[1],
  );

/**
 * Références ADR **cliquables et internes** d'un texte : un
 * `decisions/NNNN-slug.md` cible d'un lien Markdown **relatif**
 * `[texte](…/decisions/NNNN-slug.md)`. On ignore volontairement :
 * - les mentions en prose ou en `code span` (ex. un plan qui *propose* de créer
 *   tel ADR) : ce ne sont pas des liens, donc pas des liens morts ;
 * - les **URLs absolues** (`https://…/decisions/NNNN.md`), qui pointent vers un
 *   autre dépôt (ex. les ADR du dépôt `cluster`) et ne sont pas vérifiables
 *   contre `docs/decisions/` d'`atlas`. Le char-class `[^):]*` exclut tout lien
 *   contenant `:` — donc tout schéma `http://`/`https://`.
 * Seul un lien interne réel doit pointer vers un ADR existant du dépôt.
 */
export const adrReferences = (markdown) =>
  [
    ...markdown.matchAll(
      /\]\([^):]*decisions\/(\d{4}-[a-z0-9-]+)\.md(?:#[^)]*)?\)/g,
    ),
  ].map((m) => m[1]);

/**
 * Compteurs « N ADR » présents dans `markdown` qui ne correspondent pas au
 * nombre réel d'ADR (`adrCount`). Charte rédactionnelle (ADR 0052, règle R8).
 * Ne s'applique qu'aux pages catalogue, où « N ADR » désigne le total —
 * ailleurs « 6 ADR de cadrage » est un sous-ensemble légitime.
 * @returns {string[]} les libellés obsolètes (ex. `["35 ADR"]`), `[]` si OK.
 */
export const staleAdrCounts = (markdown, adrCount) =>
  [...markdown.matchAll(/\b(\d{1,3})\s+ADR\b/g)]
    .filter((m) => Number.parseInt(m[1], 10) !== adrCount)
    .map((m) => m[0]);

/** Racine du contenu de documentation (Starlight). */
const DOCS_ROOT = path.join("docs", "src", "content", "docs");

/**
 * Toutes les pages de contenu (`.md`/`.mdx`) de la documentation Starlight.
 * Chemins relatifs à la racine du contenu, sans extension (ex. `quality/security`).
 */
export const listDocsPages = (cwd = ".") => {
  const root = path.join(cwd, DOCS_ROOT);
  const pages = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
        pages.push(path.relative(root, full).replace(/\.mdx?$/, ""));
      }
    }
  };
  if (existsSync(root)) walk(root);
  return pages.sort();
};

/**
 * Sources de navigation déclarées dans la config Starlight (`astro.config.mjs`) :
 * les dossiers couverts par un `autogenerate: { directory: "x" }` et les pages
 * explicitement liées (`link: "/x/"`). Parsing textuel volontairement simple :
 * la sidebar est statique aujourd'hui ; si elle devenait programmatique, ce
 * contrôle casserait et devrait évoluer.
 */
export const navLinks = (configSource) => {
  const directories = new Set(
    [...configSource.matchAll(/directory:\s*"([^"]+)"/g)].map((m) => m[1]),
  );
  const links = new Set(
    [...configSource.matchAll(/link:\s*"(\/[^"]*)"/g)].map((m) =>
      m[1].replace(/^\/|\/$/g, ""),
    ),
  );
  return { directories, links };
};

/**
 * Pages de contenu injoignables depuis la nav Starlight. Une page est atteinte
 * si son dossier de premier niveau est couvert par un `autogenerate.directory`,
 * ou si elle est explicitement liée. L'accueil (`index`) est toujours atteint.
 */
export const findOrphanPages = (pages, nav) =>
  pages.filter((page) => {
    if (page === "index") return false; // page d'accueil (splash)
    const topDir = page.split("/")[0];
    if (nav.directories.has(topDir)) return false; // dossier autogénéré
    if (nav.links.has(page)) return false; // lien explicite
    return true;
  });

/**
 * Coeur de l'audit. Parcourt les paquets publiables et les pages docs, et
 * accumule deux listes de constats.
 *
 * @param {string} [cwd]
 * @returns {{blocking: string[], warnings: string[]}}
 */
export const auditDocumentation = (cwd = ".") => {
  const blocking = [];
  const warnings = [];
  const workspaces = buildWorkspaceIndex(cwd);

  // ── Paquets publiables : README et cohérence avec package.json ──────────
  for (const [name, { dir, packageJson }] of workspaces) {
    if (packageJson.private) continue;
    const readmePath = path.join(cwd, dir, "README.md");
    const readme = readText(readmePath);

    // B1 — README présent
    if (readme === null) {
      blocking.push(`[B1] ${dir} : README.md absent (paquet publiable).`);
      continue;
    }

    // B2 — titre H1
    const h1 = firstH1(readme);
    if (h1 === null) {
      blocking.push(`[B2] ${dir}/README.md : aucun titre H1 (\`# …\`).`);
    } else if (!h1MatchesName(h1, name)) {
      // B4 — H1 cohérent avec le nom du paquet
      blocking.push(
        `[B4] ${dir}/README.md : le titre « ${h1} » n'évoque pas le paquet « ${name} ».`,
      );
    }

    // B3 — paragraphe de description
    if (!hasDescriptionParagraph(readme)) {
      blocking.push(
        `[B3] ${dir}/README.md : pas de paragraphe de description après le titre.`,
      );
    }

    // B6 — liens relatifs internes valides
    for (const link of relativeMarkdownLinks(readme)) {
      const target = path.resolve(path.join(cwd, dir), link);
      if (!existsSync(target)) {
        blocking.push(`[B6] ${dir}/README.md : lien interne mort → ${link}`);
      }
    }

    // B7 — ADR référencé existe
    for (const adr of adrReferences(readme)) {
      const adrPath = path.join(cwd, "docs", "decisions", `${adr}.md`);
      if (!existsSync(adrPath)) {
        blocking.push(
          `[B7] ${dir}/README.md : ADR référencé inexistant → decisions/${adr}.`,
        );
      }
    }

    // W1 — description dans package.json
    if (!packageJson.description) {
      warnings.push(
        `[W1] ${dir} : champ \`description\` absent du package.json.`,
      );
    }

    // W5 — sous-chemins exports mentionnés au README
    for (const sub of exportSubpaths(packageJson)) {
      const bare = sub.replace(/^\.\//, "");
      if (!readme.includes(bare)) {
        warnings.push(
          `[W5] ${dir}/README.md : sous-chemin d'export « ${sub} » non mentionné.`,
        );
      }
    }

    // W6 — commandes bin mentionnées au README
    for (const cmd of binNames(packageJson)) {
      if (!readme.includes(cmd)) {
        warnings.push(
          `[W6] ${dir}/README.md : commande \`${cmd}\` (bin) non mentionnée.`,
        );
      }
    }
  }

  // ── Pages docs : ADR référencés, liens, orphelines ──────────────────────
  const pages = listDocsPages(cwd);
  const decisionsDir = path.join(cwd, DOCS_ROOT, "decisions");
  for (const page of pages) {
    const mdx = path.join(cwd, DOCS_ROOT, `${page}.mdx`);
    const pagePath = existsSync(mdx)
      ? mdx
      : path.join(cwd, DOCS_ROOT, `${page}.md`);
    const content = readText(pagePath);
    if (content === null) continue;

    // B6 — liens relatifs internes valides (pages docs)
    for (const link of relativeMarkdownLinks(content)) {
      const target = path.resolve(path.dirname(pagePath), link);
      if (!existsSync(target)) {
        blocking.push(`[B6] ${page} : lien interne mort → ${link}`);
      }
    }

    // B7 — ADR référencé existe (pages docs)
    for (const adr of adrReferences(content)) {
      // En Starlight les ADR sont liés sans extension ; on vérifie les deux.
      const exists =
        existsSync(path.join(decisionsDir, `${adr}.md`)) ||
        existsSync(path.join(decisionsDir, `${adr}.mdx`));
      if (!exists) {
        blocking.push(
          `[B7] ${page} : ADR référencé inexistant → decisions/${adr}.`,
        );
      }
    }
  }

  // B9 — pages docs non orphelines (joignables depuis la nav Starlight)
  const configPath = path.join(cwd, "docs", "astro.config.mjs");
  const configSource = readText(configPath);
  if (configSource !== null) {
    const nav = navLinks(configSource);
    for (const orphan of findOrphanPages(pages, nav)) {
      blocking.push(
        `[B9] ${orphan} : page orpheline (dossier absent de la sidebar Starlight).`,
      );
    }
  }

  // W7 — compteur d'ADR exact dans les pages catalogue (charte rédactionnelle,
  // ADR 0052, règle R8). On ne contrôle QUE l'index et le parcours, seules
  // pages où « N ADR » désigne le total : ailleurs « 6 ADR de cadrage » ou un
  // instantané d'audit historique sont des sous-ensembles légitimes, pas des
  // compteurs à tenir à jour.
  const adrCount = existsSync(decisionsDir)
    ? readdirSync(decisionsDir).filter((f) => /^\d{4}-.+\.mdx?$/.test(f)).length
    : 0;
  if (adrCount > 0) {
    const catalogPages = ["decisions/index", "decisions/parcours"];
    for (const page of catalogPages) {
      const mdx = path.join(cwd, DOCS_ROOT, `${page}.mdx`);
      const pagePath = existsSync(mdx)
        ? mdx
        : path.join(cwd, DOCS_ROOT, `${page}.md`);
      const content = readText(pagePath);
      if (content === null) continue;
      for (const stale of staleAdrCounts(content, adrCount)) {
        warnings.push(
          `[W7] ${page} : compteur d'ADR « ${stale} » obsolète — ${adrCount} ADR réels (ADR 0052, R8).`,
        );
      }
    }
  }

  return { blocking, warnings };
};

const useColor = () => process.stdout.isTTY;
const paint = (code, s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => paint("31", s);
const yellow = (s) => paint("33", s);
const green = (s) => paint("32", s);
const dim = (s) => paint("2", s);

// Corps du script. Ignoré à l'import (tests).
const main = () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();

  const { blocking, warnings } = auditDocumentation(root);

  if (warnings.length > 0) {
    console.log(yellow(`Avertissements (${warnings.length}) :`));
    for (const w of warnings) console.log(dim(`  ${w}`));
    console.log("");
  }

  if (blocking.length > 0) {
    console.log(red(`Constats bloquants (${blocking.length}) :`));
    for (const b of blocking) console.log(red(`  ${b}`));
    console.log("");
    console.log(
      red(
        "Documentation : corrige les constats bloquants ci-dessus, ou ajuste la doc.",
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    green(
      `Documentation : OK (${warnings.length} avertissement(s), 0 bloquant).`,
    ),
  );
};

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main();
}
