#!/usr/bin/env node

/**
 * @fileoverview Ajoute un instantané de couverture à la série historique.
 *
 * La couverture de tests est une donnée **classe B** de l'[ADR 0032] : elle
 * dépend de l'**exécution** des tests, donc n'est pas reproductible depuis
 * l'arbre Git et ne peut pas être diff-checkée. On l'**historise** dans une
 * série **append-only** commitée (`docs/.vitepress/data/kpi-history.json`) :
 * une entrée datée par jour, écrite **uniquement sur `main`** par un job
 * planifié (cron). Une seconde exécution le même jour **écrase** l'entrée du
 * jour (idempotent) plutôt que d'empiler.
 *
 * Ce script **n'exécute pas** les tests : il lit les rapports
 * `coverage/coverage-final.json` déjà produits par `pnpm test:coverage`,
 * les agrège via `summarize` (réutilisé de `coverage-report.mjs`), et fait
 * l'« upsert » de l'entrée du jour dans la série.
 *
 * Usage :
 *   node scripts/docs/snapshot-coverage.mjs            # upsert l'entrée du jour
 *   node scripts/docs/snapshot-coverage.mjs --check    # audite la cohérence
 *
 * [ADR 0032]: docs/decisions/0032-kpi-determinisme-vs-snapshot.md
 * @module
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { summarize } from "../audit/coverage-report.mjs";

const HISTORY = "docs/.vitepress/data/kpi-history.json";

/** Date du jour au format `YYYY-MM-DD` en UTC (fuseau figé pour la stabilité). */
const todayUtc = () => new Date().toISOString().slice(0, 10);

/** Arrondit un pourcentage à une décimale (stable pour la série). */
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Agrège la couverture de tous les workspaces ayant un rapport, en réutilisant
 * la découverte et le `summarize` de `coverage-report.mjs`.
 *
 * @returns {{statements:number,branches:number,functions:number,lines:number,packages:number}}
 */
export const collectCoverage = () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const workspaces = JSON.parse(
    execFileSync("pnpm", ["ls", "-r", "--json", "--depth", "-1"], {
      cwd: root,
      encoding: "utf8",
    }),
  ).filter((w) => w.path !== root);

  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
  };
  let packages = 0;

  for (const workspace of workspaces) {
    const coveragePath = `${workspace.path}/coverage/coverage-final.json`;
    if (!existsSync(coveragePath)) continue;
    const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
    const { metrics } = summarize(coverage);
    for (const key of Object.keys(totals)) {
      totals[key].covered += metrics[key].covered;
      totals[key].total += metrics[key].total;
    }
    packages += 1;
  }

  const pct = ({ covered, total }) =>
    total === 0 ? 0 : (covered / total) * 100;
  return {
    statements: round1(pct(totals.statements)),
    branches: round1(pct(totals.branches)),
    functions: round1(pct(totals.functions)),
    lines: round1(pct(totals.lines)),
    packages,
  };
};

/** Charge la série (ou `[]` si le fichier n'existe pas encore). */
const loadHistory = () =>
  existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, "utf8")) : [];

/**
 * Insère ou remplace (« upsert ») l'entrée d'une date dans la série, puis
 * **trie par date croissante**. Idempotent : ré-exécuter le même jour remplace
 * l'entrée du jour au lieu d'en ajouter une seconde.
 *
 * @param {Array<{date:string}>} history
 * @param {{date:string}} entry
 */
export const upsert = (history, entry) => {
  const others = history.filter((e) => e.date !== entry.date);
  return [...others, entry].sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Audit de **cohérence structurelle** (jamais de fraîcheur, cf. ADR 0032) :
 * JSON valide, schéma respecté, dates strictement croissantes, pas de doublon,
 * dernière date ≤ aujourd'hui. Retourne la liste des erreurs (vide si OK).
 *
 * @param {unknown} history
 * @param {string} today
 * @returns {string[]}
 */
export const checkHistory = (history, today) => {
  const errors = [];
  if (!Array.isArray(history))
    return ["kpi-history.json : la racine doit être un tableau."];

  let previous = "";
  for (const [i, entry] of history.entries()) {
    if (typeof entry !== "object" || entry === null) {
      errors.push(`Entrée ${i} : doit être un objet.`);
      continue;
    }
    const { date, statements, branches, functions, lines } = entry;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(
        `Entrée ${i} : « date » manquante ou mal formée (attendu YYYY-MM-DD).`,
      );
    } else {
      if (previous && date <= previous) {
        errors.push(
          `Entrée ${i} : date ${date} non strictement croissante (après ${previous}).`,
        );
      }
      if (date > today) {
        errors.push(`Entrée ${i} : date ${date} dans le futur (> ${today}).`);
      }
      previous = date;
    }
    for (const [key, value] of Object.entries({
      statements,
      branches,
      functions,
      lines,
    })) {
      if (typeof value !== "number" || value < 0 || value > 100) {
        errors.push(
          `Entrée ${i} : « ${key} » doit être un pourcentage entre 0 et 100.`,
        );
      }
    }
  }
  return errors;
};

const main = () => {
  const check = process.argv.includes("--check");
  const history = loadHistory();

  if (check) {
    const errors = checkHistory(history, todayUtc());
    if (errors.length === 0) {
      console.log(`kpi-history.json : cohérent (${history.length} entrée(s)).`);
      process.exit(0);
    }
    console.error("kpi-history.json incohérent :");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const entry = { date: todayUtc(), ...collectCoverage() };
  const updated = upsert(history, entry);
  writeFileSync(HISTORY, JSON.stringify(updated, null, 2) + "\n");
  console.log(
    `Snapshot ${entry.date} : lines=${entry.lines}% (${entry.packages} paquets).`,
  );
};

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main();
}
