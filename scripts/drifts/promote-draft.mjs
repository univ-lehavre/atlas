#!/usr/bin/env node

/**
 * @fileoverview Promotion d'un brouillon de drift en entrée de registre (ADR 0080,
 * volet b). Commande `pnpm drift:new`.
 *
 * Invoquée par l'humain APRÈS qu'il a jugé un écart _marquant_ (ce jugement reste
 * humain, ADR 0056). Elle transforme un brouillon `.drift.json` (déposé à chaud
 * par un capteur, ADR 0080 volet a) en une entrée conforme du registre
 * (`docs/src/content/drifts/registre-drifts.yaml`, ADR 0056) :
 *
 *   1. choisit un brouillon (le plus récent, ou `--draft <fichier>`) — ou part
 *      d'un squelette vierge si aucun brouillon (`--blank`) ;
 *   2. demande les champs de jugement (nature, portée, cause, correctif, statut) ;
 *   3. pour un statut NON clos (`ouvert`/`en-cours`), CRÉE l'issue de suivi via
 *      `gh issue create` et injecte son numéro (`#NNN`) — l'entrée est conforme
 *      d'emblée (le `superRefine` Zod l'exige, ADR 0071 volet a) ;
 *   4. calcule le prochain `Dnn` (max + 1, identifiants stables, ADR 0056) ;
 *   5. AJOUTE le bloc en fin de YAML (_append_) sans re-sérialiser l'existant ;
 *   6. supprime le brouillon promu.
 *
 * Échoue **bruyamment** si `gh` est requis mais absent/non authentifié, ou si la
 * création d'issue échoue — sans rien écrire au registre (pas d'entrée non
 * conforme silencieuse, ADR 0080).
 *
 * Usage :
 *   pnpm drift:new                  # promeut le brouillon le plus récent
 *   pnpm drift:new --draft <chemin> # promeut un brouillon précis
 *   pnpm drift:new --blank          # entrée vierge, sans brouillon
 *   pnpm drift:new --list           # liste les brouillons en attente
 *
 * @module
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { DRAFTS_DIR } from "./draft.mjs";

const REGISTRY = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  "docs",
  "src",
  "content",
  "drifts",
  "registre-drifts.yaml",
);

const NATURES = ["drift-e2e", "piege-revue"];
const PORTEES = ["code", "env", "harnais"];
const STATUTS = ["corrige", "caduc", "ouvert", "en-cours"];
const NON_CLOS = new Set(["ouvert", "en-cours"]);

/** Échec contrôlé : message clair, code de sortie 1, pas de pile Node. */
const fail = (message) => {
  process.stderr.write(`\n✖ ${message}\n`);
  process.exit(1);
};

/** Brouillons en attente, du plus récent au plus ancien. */
const listDrafts = () => {
  if (!existsSync(DRAFTS_DIR)) return [];
  return readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".drift.json"))
    .map((f) => path.join(DRAFTS_DIR, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
};

/**
 * Plus grand `Dnn` du registre + 1. On lit les `id: Dnn` par expression
 * régulière (sans parser le YAML : on ne veut ni dépendance, ni round-trip qui
 * détruirait l'en-tête de commentaires). Identifiants stables : on prend max + 1,
 * jamais le comblement d'un trou (ADR 0056).
 * @param {string} yaml contenu du registre.
 * @returns {string} prochain identifiant, ex. `D24`.
 */
export const nextDriftId = (yaml) => {
  const nums = [...yaml.matchAll(/^\s*-?\s*id:\s*D(\d+)\b/gm)].map((m) =>
    Number.parseInt(m[1], 10),
  );
  const max = nums.length ? Math.max(...nums) : 0;
  return `D${max + 1}`;
};

/**
 * Sérialise une entrée de registre en bloc YAML, au format maison : un élément de
 * tableau de premier niveau, scalaires longs repliés en `>-`. Prettier reformatera
 * le détail au commit ; on vise un repli simple et stable.
 * @param {object} e entrée { id, campagne, nature, portee, symptome, cause, correctif, statut, issue? }
 * @returns {string} bloc YAML précédé d'une ligne vide.
 */
export const renderEntry = (e) => {
  const folded = (value) => {
    const text = String(value ?? "").trim();
    // Repli >- avec indentation à 4 espaces, comme les entrées existantes.
    const wrapped = text
      .replace(/\s+/g, " ")
      .replace(/(.{1,88})(\s+|$)/g, "$1\n")
      .trimEnd()
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");
    return `>-\n${wrapped}`;
  };
  const lines = [
    "",
    `- id: ${e.id}`,
    `  campagne: ${JSON.stringify(e.campagne)}`,
    `  nature: ${e.nature}`,
    `  portee: ${e.portee}`,
    `  symptome: ${folded(e.symptome)}`,
    `  cause: ${folded(e.cause)}`,
    `  correctif: ${folded(e.correctif)}`,
    `  statut: ${e.statut}`,
  ];
  if (e.issue) lines.push(`  issue: ${JSON.stringify(e.issue)}`);
  return `${lines.join("\n")}\n`;
};

/** Crée l'issue de suivi via `gh` et retourne `#NNN`. Échoue bruyamment sinon. */
const createIssue = (title, body) => {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
  } catch {
    fail(
      "`gh` (GitHub CLI) est introuvable — requis pour créer l'issue de suivi d'un drift non clos.\n" +
        "  Installez-le, ou choisissez le statut `corrige`/`caduc` (sans issue).",
    );
  }
  let url;
  try {
    url = execFileSync(
      "gh",
      [
        "issue",
        "create",
        "--title",
        title,
        "--body",
        body,
        "--label",
        "tech-debt",
      ],
      { encoding: "utf8" },
    ).trim();
  } catch (err) {
    fail(
      "La création de l'issue via `gh issue create` a échoué (auth ? droits ? label `tech-debt` absent ?).\n" +
        `  ${String(err.stderr || err.message || err).trim()}\n` +
        "  Rien n'a été écrit au registre.",
    );
  }
  const m = url.match(/\/issues\/(\d+)\s*$/);
  if (!m)
    fail(`Réponse inattendue de \`gh\` (URL d'issue introuvable) : ${url}`);
  return `#${m[1]}`;
};

const main = async () => {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const valueOf = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  if (has("--list")) {
    const drafts = listDrafts();
    if (!drafts.length) {
      stdout.write("Aucun brouillon de drift en attente.\n");
      return;
    }
    stdout.write("Brouillons en attente (du plus récent au plus ancien) :\n");
    for (const d of drafts)
      stdout.write(`  ${path.relative(process.cwd(), d)}\n`);
    return;
  }

  // Source : un brouillon (le plus récent ou ciblé), ou vierge.
  let draft = null;
  let draftPath = null;
  if (!has("--blank")) {
    draftPath = valueOf("--draft") ?? listDrafts()[0] ?? null;
    if (draftPath) {
      if (!existsSync(draftPath)) fail(`Brouillon introuvable : ${draftPath}`);
      try {
        draft = JSON.parse(readFileSync(draftPath, "utf8"));
      } catch {
        fail(`Brouillon illisible (JSON invalide) : ${draftPath}`);
      }
    } else {
      stdout.write(
        "Aucun brouillon en attente — saisie vierge (équivalent `--blank`).\n",
      );
    }
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const ask = async (label, fallback = "") => {
    const suffix = fallback ? ` [${fallback}]` : "";
    const answer = (await rl.question(`${label}${suffix} : `)).trim();
    return answer || fallback;
  };
  const askEnum = async (label, choices, fallback) => {
    for (;;) {
      const a = await ask(`${label} (${choices.join(" | ")})`, fallback);
      if (choices.includes(a)) return a;
      stdout.write(`  → valeur hors liste : ${choices.join(", ")}\n`);
    }
  };

  let entry;
  try {
    stdout.write(
      "\n— Promotion d'un drift en entrée de registre (ADR 0080) —\n",
    );
    if (draft) {
      stdout.write(`Brouillon : ${path.relative(process.cwd(), draftPath)}\n`);
      stdout.write(`Source    : ${draft.source}\n`);
      stdout.write(
        `Symptôme capturé à chaud :\n  ${draft.symptome?.replace(/\n/g, "\n  ")}\n\n`,
      );
    }

    const campagne = await ask(
      "Campagne (chantier/issue qui l'a révélé)",
      draft?.campagne ?? "",
    );
    const nature = await askEnum("Nature", NATURES, "drift-e2e");
    const portee = await askEnum("Portée", PORTEES, "code");
    const symptome = await ask(
      "Symptôme (ce qu'on a vu)",
      draft?.symptome ?? "",
    );
    const cause = await ask("Cause racine", "");
    const correctif = await ask(
      "Correctif (ce qui a été fait / est prévu)",
      "",
    );
    const statut = await askEnum("Statut", STATUTS, "corrige");

    let issue;
    if (NON_CLOS.has(statut)) {
      stdout.write(
        "\nStatut non clos → une issue de suivi est requise (ADR 0071, volet a).\n",
      );
      const title = await ask(
        "Titre de l'issue",
        `Drift : ${campagne || symptome.slice(0, 60)}`,
      );
      const body =
        `Drift non clos consigné au registre (ADR 0056/0080).\n\n` +
        `**Symptôme** : ${symptome}\n\n**Cause** : ${cause}\n\n**Piste** : ${correctif}\n`;
      issue = createIssue(title, body);
      stdout.write(`Issue créée : ${issue}\n`);
    }

    const yaml = readFileSync(REGISTRY, "utf8");
    const id = nextDriftId(yaml);
    entry = {
      id,
      campagne,
      nature,
      portee,
      symptome,
      cause,
      correctif,
      statut,
      issue,
    };

    const block = renderEntry(entry);
    const trimmed = yaml.replace(/\s*$/, "\n");
    writeFileSync(REGISTRY, `${trimmed}${block}`, "utf8");
    stdout.write(
      `\n✓ ${id} ajouté au registre. Relisez/formattez avant commit (Prettier).\n`,
    );
  } finally {
    rl.close();
  }

  // Brouillon promu → on l'efface (sa capture vit maintenant dans le registre).
  if (draftPath && existsSync(draftPath)) {
    rmSync(draftPath);
    stdout.write(
      `Brouillon consommé : ${path.relative(process.cwd(), draftPath)}\n`,
    );
  }
};

// Exécuté en CLI (pas en import de test).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => fail(String(err?.stack || err)));
}
