#!/usr/bin/env tsx

/**
 * @fileoverview Génère la page d'évolution historique du dépôt.
 *
 * Produit `docs/quality/evolution-git.md` : quatre graphes d'évolution mensuelle
 * — pull requests mergées, lignes de code, commits/contributeurs, et robustesse
 * statique (ratios tests/source, densité TSDoc). **Toutes ces données sont des
 * fonctions déterministes de l'historique Git** atteignable depuis `HEAD`
 * (classe A de l'ADR 0032) : la page est générée, commitée et **vérifiée octet
 * par octet en CI** (`--check`). On n'exécute jamais les tests (ce serait de la
 * couverture mesurée, classe B, non reproductible) : la robustesse est mesurée
 * par **analyse statique** d'un arbre Git, via les analyseurs purs de
 * `lib/code-analyzer.ts`.
 *
 * Déterminisme (impératif, sinon le diff-check boucle) :
 *  - bucketing mensuel sur l'**epoch** du commit (`%ct`), converti en UTC dans
 *    le script — jamais un slice de date locale dépendant du fuseau du runner ;
 *  - parcours `--first-parent` (un point par PR mergée, ordre stable) ;
 *  - tri lexical explicite des périodes `YYYY-MM` (= ordre chronologique) ;
 *  - rendu numérique **canonique** (entiers bruts, ratios `toFixed(3)`, `-0`
 *    normalisé) — jamais de float brut à précision variable ;
 *  - aucun horodatage dans la sortie ; style Prettier exact.
 *
 * Usage :
 *   tsx scripts/docs/generate-kpi-history.ts           # écrit le fichier
 *   tsx scripts/docs/generate-kpi-history.ts --check   # échoue si périmé
 *
 * @module
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import prettier from "prettier";
import {
  analyzeTestContent,
  analyzeTypeScriptContent,
  isTestFile,
} from "./lib/code-analyzer.js";

const OUTPUT = "docs/quality/evolution-git.md";

/**
 * Exécute une commande git de façon déterministe : fuseau figé à UTC (le
 * bucketing mensuel n'en dépend de toute façon pas, mais on ne laisse aucune
 * variable d'environnement influencer la sortie) et `core.quotepath=false`
 * pour que les chemins non-ASCII ne soient ni cités ni échappés en octal.
 */
const git = (args: string[]): string =>
  execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, TZ: "UTC" },
  });

/** Mois `YYYY-MM` (UTC) d'un commit, dérivé de son epoch (`%ct`). */
export const monthOfEpoch = (epochSeconds: number): string =>
  new Date(epochSeconds * 1000).toISOString().slice(0, 7);

/**
 * Quantifie un nombre en chaîne **canonique** et stable : les entiers sortent
 * tels quels, les non-entiers à trois décimales fixes. Normalise `-0` en `0`.
 * C'est ce qui garantit que deux générations produisent les mêmes octets.
 */
export const canonical = (n: number): string => {
  const v = Object.is(n, -0) ? 0 : n;
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
};

/** Ratio borné et déterministe : dénominateur nul → 0 (jamais NaN/Infinity). */
export const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

/** Trie les clés de période `YYYY-MM` (tri lexical = ordre chronologique). */
const sortedPeriods = (periods: Iterable<string>): string[] =>
  [...new Set(periods)].sort();

/**
 * Aligne une série (clé→valeur) sur un axe de mois complet : tout mois absent
 * prend `fallback` (0). Garantit que tous les graphes partagent le même axe x,
 * même quand un mois n'a aucune PR (février 2026, p. ex.).
 */
const alignToAxis = (
  axis: string[],
  byPeriod: Map<string, number>,
  fallback = 0,
): number[] => axis.map((period) => byPeriod.get(period) ?? fallback);

interface MonthlyCount {
  readonly period: string;
  readonly value: number;
}

/**
 * PR mergées par mois : compte les numéros `(#NNN)` uniques apparaissant dans
 * les sujets des commits `--first-parent`. Plus fiable que les merge commits
 * (les PR squash-mergées n'en ont pas) et purement textuel donc reproductible.
 */
export const prsByMonth = (firstParentLog: string): MonthlyCount[] => {
  const byMonth = new Map<string, Set<number>>();
  for (const line of firstParentLog.split("\n")) {
    if (line === "") continue;
    const tab = line.indexOf("\t");
    const epoch = Number(line.slice(0, tab));
    const subject = line.slice(tab + 1);
    const month = monthOfEpoch(epoch);
    const match = subject.match(/\(#(\d+)\)/);
    if (!match) continue;
    const set = byMonth.get(month) ?? new Set<number>();
    set.add(Number(match[1]));
    byMonth.set(month, set);
  }
  return sortedPeriods(byMonth.keys()).map((period) => ({
    period,
    value: byMonth.get(period)!.size,
  }));
};

interface LineDelta {
  readonly period: string;
  readonly additions: number;
  readonly deletions: number;
}

/**
 * Lignes ajoutées/supprimées par mois, depuis `--numstat --first-parent`.
 * Les lignes binaires (`-\t-`) comptent pour 0. On somme les colonnes
 * numériques, insensible aux renames `{old => new}`.
 */
export const linesByMonth = (numstatLog: string): LineDelta[] => {
  const adds = new Map<string, number>();
  const dels = new Map<string, number>();
  let month = "";
  for (const line of numstatLog.split("\n")) {
    if (line === "") continue;
    if (line.startsWith("__C__\t")) {
      month = monthOfEpoch(Number(line.slice("__C__\t".length)));
      continue;
    }
    const [a, d] = line.split("\t");
    const added = a === "-" ? 0 : Number(a);
    const deleted = d === "-" ? 0 : Number(d);
    adds.set(month, (adds.get(month) ?? 0) + added);
    dels.set(month, (dels.get(month) ?? 0) + deleted);
  }
  return sortedPeriods([...adds.keys(), ...dels.keys()]).map((period) => ({
    period,
    additions: adds.get(period) ?? 0,
    deletions: dels.get(period) ?? 0,
  }));
};

interface Activity {
  readonly period: string;
  readonly commits: number;
  readonly contributors: number;
}

/** Commits et contributeurs uniques (par email normalisé) par mois. */
export const activityByMonth = (authorLog: string): Activity[] => {
  const commits = new Map<string, number>();
  const authors = new Map<string, Set<string>>();
  for (const line of authorLog.split("\n")) {
    if (line === "") continue;
    const tab = line.indexOf("\t");
    const month = monthOfEpoch(Number(line.slice(0, tab)));
    const email = line
      .slice(tab + 1)
      .trim()
      .toLowerCase();
    commits.set(month, (commits.get(month) ?? 0) + 1);
    const set = authors.get(month) ?? new Set<string>();
    set.add(email);
    authors.set(month, set);
  }
  return sortedPeriods(commits.keys()).map((period) => ({
    period,
    commits: commits.get(period) ?? 0,
    contributors: authors.get(period)?.size ?? 0,
  }));
};

interface Robustness {
  readonly period: string;
  readonly sha: string;
  readonly testFileRatio: number;
  readonly tsdocDensity: number;
  readonly testDensity: number;
}

/**
 * Commit-échantillon par mois : le **dernier commit `--first-parent` du mois**
 * (premier rencontré en parcourant du plus récent au plus ancien). Stable et
 * unique tant que l'historique à `HEAD` ne bouge pas.
 */
export const monthlySamples = (
  firstParentEpochSha: string,
): Map<string, string> => {
  const samples = new Map<string, string>();
  for (const line of firstParentEpochSha.split("\n")) {
    if (line === "") continue;
    const [epoch, sha] = line.split(" ");
    const month = monthOfEpoch(Number(epoch));
    if (!samples.has(month)) samples.set(month, sha);
  }
  return samples;
};

/** Vrai pour un fichier source TypeScript (on EXCLUT `.svelte` : les regex de
 * `code-analyzer` matchent mal son contenu et bruiteraient la mesure). */
const isTsSource = (path: string): boolean =>
  path.endsWith(".ts") && !path.endsWith(".d.ts") && !isTestFile(path);

/**
 * Robustesse statique d'un arbre Git : pour le commit `sha`, liste les fichiers
 * (`ls-tree`), lit leur contenu en un seul `cat-file --batch`, et agrège via
 * les analyseurs purs. Aucune exécution de test — pure lecture d'arbre.
 */
export const robustnessAt = (period: string, sha: string): Robustness => {
  // oid + chemin de chaque blob de l'arbre (un seul appel git).
  const tree = git(["ls-tree", "-r", "--format=%(objectname) %(path)", sha]);
  const blobs: { oid: string; path: string }[] = [];
  for (const line of tree.split("\n")) {
    if (line === "") continue;
    const space = line.indexOf(" ");
    blobs.push({ oid: line.slice(0, space), path: line.slice(space + 1) });
  }
  const wanted = blobs.filter((b) => isTsSource(b.path) || isTestFile(b.path));

  // Lecture groupée des contenus via cat-file --batch (1 process au lieu de N).
  const contents = batchReadBlobs(wanted.map((b) => b.oid));

  let sourceFiles = 0;
  let testFiles = 0;
  let functions = 0;
  let constants = 0;
  let tsdoc = 0;
  let tests = 0;
  for (const blob of wanted) {
    const content = contents.get(blob.oid) ?? "";
    if (isTestFile(blob.path)) {
      testFiles += 1;
      tests += analyzeTestContent(content).tests;
    } else {
      sourceFiles += 1;
      const stats = analyzeTypeScriptContent(content);
      functions += stats.functions;
      constants += stats.constants;
      tsdoc += stats.tsdocComments;
    }
  }
  const exportSurface = functions + constants;
  return {
    period,
    sha: sha.slice(0, 12),
    testFileRatio: ratio(testFiles, sourceFiles),
    tsdocDensity: ratio(tsdoc, exportSurface),
    testDensity: ratio(tests, exportSurface),
  };
};

/**
 * Lit plusieurs blobs en un seul `git cat-file --batch`. La sortie est une
 * suite d'entêtes `<oid> blob <size>\n` suivis de `<size>` octets puis `\n`.
 */
const batchReadBlobs = (oids: string[]): Map<string, string> => {
  const result = new Map<string, string>();
  if (oids.length === 0) return result;
  // Pas d'option `encoding` → execFileSync renvoie un Buffer brut (nécessaire
  // pour lire les tailles d'objets octet par octet sans corruption UTF-8).
  const stdout = execFileSync(
    "git",
    ["-c", "core.quotepath=false", "cat-file", "--batch"],
    {
      input: oids.join("\n") + "\n",
      maxBuffer: 512 * 1024 * 1024,
      env: { ...process.env, TZ: "UTC" },
    },
  ) as Buffer;
  let offset = 0;
  while (offset < stdout.length) {
    const nl = stdout.indexOf(0x0a, offset);
    if (nl === -1) break;
    const header = stdout.toString("utf8", offset, nl);
    offset = nl + 1;
    const [oid, type, sizeStr] = header.split(" ");
    if (type !== "blob") {
      // 'missing' ou autre : pas de corps à consommer.
      continue;
    }
    const size = Number(sizeStr);
    result.set(oid, stdout.toString("utf8", offset, offset + size));
    offset += size + 1; // +1 pour le \n de fin d'objet
  }
  return result;
};

/** Rend un graphe `xychart-beta` à une série, valeurs quantifiées canoniques. */
const renderBarChart = (
  title: string,
  xLabels: string[],
  yTitle: string,
  values: number[],
): string =>
  [
    "```mermaid",
    "xychart-beta",
    `    title "${title}"`,
    `    x-axis [${xLabels.map((l) => `"${l}"`).join(", ")}]`,
    `    y-axis "${yTitle}"`,
    `    bar [${values.map(canonical).join(", ")}]`,
    "```",
  ].join("\n");

/** Rend un graphe `xychart-beta` multi-séries (lignes). */
const renderLineChart = (
  title: string,
  xLabels: string[],
  yTitle: string,
  series: number[][],
): string =>
  [
    "```mermaid",
    "xychart-beta",
    `    title "${title}"`,
    `    x-axis [${xLabels.map((l) => `"${l}"`).join(", ")}]`,
    `    y-axis "${yTitle}"`,
    ...series.map((s) => `    line [${s.map(canonical).join(", ")}]`),
    "```",
  ].join("\n");

/** Construit le corps complet de la page (déterministe, sans horodatage). */
export const generateBody = (): string => {
  const prLog = git([
    "log",
    "--first-parent",
    "--pretty=format:%ct%x09%s",
    "HEAD",
  ]);
  const numstat = git([
    "log",
    "--first-parent",
    "--numstat",
    "--pretty=format:__C__%x09%ct",
    "HEAD",
  ]);
  const authorLog = git([
    "log",
    "--first-parent",
    "--pretty=format:%ct%x09%aE",
    "HEAD",
  ]);
  const sampleLog = git([
    "log",
    "--first-parent",
    "--pretty=format:%ct %H",
    "HEAD",
  ]);

  const prs = prsByMonth(prLog);
  const lines = linesByMonth(numstat);
  const activity = activityByMonth(authorLog);
  const samples = monthlySamples(sampleLog);

  // Mois COURANT = mois du dernier commit de HEAD (première ligne de sampleLog,
  // qui est en ordre antéchronologique). Déterministe (fonction de HEAD, pas de
  // l'horloge runtime). On l'EXCLUT du diff-check : un mois en cours change à
  // chaque commit, ce qui ferait échouer `--check` à chaque PR. Seuls les
  // **mois clos** (définitivement stables) sont figés dans la page commitée —
  // c'est l'esprit de l'ADR 0032 (on ne diff-checke que le reproductible-STABLE).
  const currentMonth = monthOfEpoch(
    Number(sampleLog.split("\n")[0].split(" ")[0]),
  );
  const isClosed = (period: string): boolean => period < currentMonth;

  const robustness = sortedPeriods(samples.keys())
    .filter(isClosed)
    .map((period) => robustnessAt(period, samples.get(period)!));

  // Axe x commun à tous les graphes : l'union des mois CLOS, triée. Un mois sans
  // PR (février 2026) reste sur l'axe avec une valeur 0 — graphes comparables.
  const axis = sortedPeriods([
    ...prs.map((p) => p.period),
    ...lines.map((l) => l.period),
    ...activity.map((a) => a.period),
    ...samples.keys(),
  ]).filter(isClosed);

  const pct = (r: number): number => Math.round(r * 1000) / 10;

  const sections: string[] = [];

  sections.push(
    "## Pull requests mergées par mois\n",
    renderBarChart(
      "Pull requests mergées par mois",
      axis,
      "PR",
      alignToAxis(axis, new Map(prs.map((p) => [p.period, p.value]))),
    ),
  );

  sections.push(
    "\n## Lignes de code par mois\n",
    renderLineChart("Lignes ajoutées et supprimées par mois", axis, "Lignes", [
      alignToAxis(axis, new Map(lines.map((l) => [l.period, l.additions]))),
      alignToAxis(axis, new Map(lines.map((l) => [l.period, l.deletions]))),
    ]),
    "\n_Deux séries : lignes ajoutées (haute) et lignes supprimées (basse)._",
  );

  sections.push(
    "\n## Commits et contributeurs par mois\n",
    renderLineChart(
      "Commits et contributeurs uniques par mois",
      axis,
      "Nombre",
      [
        alignToAxis(axis, new Map(activity.map((a) => [a.period, a.commits]))),
        alignToAxis(
          axis,
          new Map(activity.map((a) => [a.period, a.contributors])),
        ),
      ],
    ),
    "\n_Deux séries : commits (haute) et contributeurs uniques (basse)._",
  );

  sections.push(
    "\n## Robustesse statique par mois\n",
    "Mesurée par **analyse statique** du dernier arbre `--first-parent` de chaque\n" +
      "mois (jamais en exécutant les tests). Trois ratios, multipliés par 100 pour\n" +
      "la lisibilité :\n",
    renderLineChart("Robustesse statique (ratios ×100)", axis, "Ratio ×100", [
      alignToAxis(
        axis,
        new Map(robustness.map((r) => [r.period, pct(r.testFileRatio)])),
      ),
      alignToAxis(
        axis,
        new Map(robustness.map((r) => [r.period, pct(r.tsdocDensity)])),
      ),
      alignToAxis(
        axis,
        new Map(robustness.map((r) => [r.period, pct(r.testDensity)])),
      ),
    ]),
    "\n_Trois séries : fichiers de test / fichiers source · commentaires TSDoc /\n" +
      "surface exportée · blocs de test / surface exportée._\n",
    "| Mois | Commit | Tests/Source | TSDoc/Surface | Tests/Surface |",
    "| ---- | ------ | ------------ | ------------- | ------------- |",
    ...robustness.map(
      (r) =>
        `| ${r.period} | \`${r.sha}\` | ${canonical(pct(r.testFileRatio))} | ` +
        `${canonical(pct(r.tsdocDensity))} | ${canonical(pct(r.testDensity))} |`,
    ),
  );

  return sections.join("\n");
};

/** Assemble la page complète (intro manuelle FR + corps généré). */
const renderPage = (body: string): string =>
  `# Évolution du dépôt

Cette page retrace l'**évolution mensuelle** du dépôt depuis ses débuts : pull
requests mergées, volume de code, activité, et robustesse. Toutes ces courbes
sont **dérivées de l'historique Git** — donc reproductibles à l'identique — et
vérifiées à jour en CI (classe A de l'[ADR 0032](../decisions/0032-kpi-determinisme-vs-snapshot.md)).

> **Page générée.** Le contenu ci-dessous est produit par
> \`scripts/docs/generate-kpi-history.ts\` à partir de \`git log\`. Ne l'éditez pas
> à la main : lancez \`pnpm docs:generate\` puis commitez le résultat. La
> robustesse est mesurée par **analyse statique** des arbres Git, jamais en
> exécutant les tests (la couverture mesurée, non reproductible, est historisée
> ailleurs — cf. [tableau de bord](./tableau-de-bord.md)).

> **Le mois en cours n'est pas affiché.** Seuls les **mois clos** figurent ici :
> un mois en cours change à chaque commit, ce qui périmerait la page à chaque
> _pull request_. La page ne fige donc que ce qui est définitivement stable
> (esprit de l'[ADR 0032](../decisions/0032-kpi-determinisme-vs-snapshot.md)).

${body.trimEnd()}
`;

/** Page complète, formatée par Prettier (config du dépôt) pour être stable. */
export const renderFormattedPage = async (): Promise<string> => {
  const raw = renderPage(generateBody());
  const options = (await prettier.resolveConfig(OUTPUT)) ?? {};
  return prettier.format(raw, { ...options, parser: "markdown" });
};

/** Vrai si le fichier sur disque correspond au contenu attendu. */
const isUpToDate = (expected: string): boolean =>
  existsSync(OUTPUT) && readFileSync(OUTPUT, "utf8") === expected;

const main = async (): Promise<void> => {
  const check = process.argv.includes("--check");
  const page = await renderFormattedPage();
  if (check) {
    if (isUpToDate(page)) {
      console.log("Evolution page is up to date.");
      process.exit(0);
    }
    console.error(
      `Evolution page is stale: ${OUTPUT} ne reflète plus l'historique Git.\n` +
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
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(2);
  });
}
