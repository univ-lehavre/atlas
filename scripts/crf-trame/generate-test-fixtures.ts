/**
 * Génère des fixtures REDCap-importables (CSV de data dictionary) pour les
 * tests d'intégration des packages Atlas qui interrogent l'API REDCap.
 *
 * Différence avec `export-data-dictionaries.ts` :
 *   - Ce script NE redacte PAS les identifiants institutionnels (qui rendraient
 *     les fixtures inutilisables en runtime), il les remplace par des
 *     **fake names cohérents et déterministes** (cf. `fake-names-map.json`).
 *   - La sortie est un CSV au format REDCap data dictionary import (et non du
 *     JSON arbitraire), permettant un import direct dans une instance REDCap
 *     de test (UI ou API).
 *   - Cible un sous-ensemble réduit de projets : ceux explicitement utilisés
 *     par des packages Atlas (amarre, ecrin, researcher-profiles).
 *   - Fetch en direct depuis REDCap, indépendant du cache `data-dictionaries/`.
 *
 * Entrée : `redcap-token.csv` (mapping project_id -> token) + `.env`
 * (REDCAP_API_URL).
 *
 * Sortie : `fixtures/crf-projects/<output-name>.csv` (data dictionary REDCap) +
 * `fixtures/crf-projects/index.json` (manifeste).
 *
 * Usage :
 *   pnpm crf:fixtures:generate
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import {
  createCrfClient,
  CrfUrl,
  CrfToken,
  type CrfClient,
} from "@univ-lehavre/atlas-crf-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");

interface TargetProject {
  readonly id: number;
  readonly outputName: string;
  readonly usedBy: readonly string[];
  readonly description: string;
}

// Cible explicite : uniquement les projets utilisés par des packages Atlas
// qui font des requêtes vers l'API REDCap. Les autres projets du serveur
// REDCap ne sont pas pertinents pour les tests d'intégration.
const TARGETS: readonly TargetProject[] = [
  {
    id: 127,
    outputName: "atlas-amarre-v1",
    usedBy: ["apps/amarre"],
    description:
      "AMARRE — workflow d'appel à candidature multi-étapes (Contact → Form → Composante/Labo/Encadrant → Validation → triple peer-review).",
  },
  {
    id: 136,
    outputName: "atlas-ecrin-v2-alpha",
    usedBy: ["apps/ecrin"],
    description:
      "ECRIN v2-alpha — référentiel chercheurs avec ORCID, contacts et données institutionnelles (schéma de production actuel).",
  },
  {
    id: 106,
    outputName: "atlas-ecrin-v1-beta",
    usedBy: ["packages/researcher-profiles", "cli/researcher-profiles"],
    description:
      "ECRIN v1-beta — schéma chercheurs avec champs `orcid` et `openalex_complete` requis par `ResearcherRow` (packages/researcher-profiles).",
  },
];

// --- Token map + URL -------------------------------------------------------

const readTokenCsv = (path: string): ReadonlyMap<number, string> => {
  if (!existsSync(path)) return new Map();
  const text = readFileSync(path, "utf8").trim();
  const lines = text.split("\n").slice(1);
  const map = new Map<number, string>();
  for (const line of lines) {
    const [pid, t] = line.split(",").map((s) => s.trim());
    if (pid && t) map.set(Number(pid), t);
  }
  return map;
};

const extractEnvVar = (filePath: string, varName: string): string | null => {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf8");
  const match = content.match(new RegExp(`^${varName}=["']?([^"\\n]+)`, "m"));
  return match ? match[1].trim().replace(/["']$/, "") : null;
};

// --- Fake-names substitution -----------------------------------------------

interface FakeNamesMap {
  readonly replacements: readonly {
    readonly from: string;
    readonly to: string;
  }[];
  readonly patterns: {
    readonly emails: {
      readonly enabled: boolean;
      readonly replacement: string;
    };
    readonly frenchPhones: {
      readonly enabled: boolean;
      readonly replacement: string;
    };
    readonly urls: { readonly enabled: boolean; readonly replacement?: string };
  };
}

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeForMatch = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

interface CompiledFaker {
  readonly apply: (value: string) => string;
  readonly counts: Map<string, number>;
}

const compileFaker = (config: FakeNamesMap): CompiledFaker => {
  const counts = new Map<string, number>();

  // Order: longest LHS first to avoid prefix collisions ("Le Havre Normandie"
  // before "Le Havre", etc.).
  const sorted = [...config.replacements].sort(
    (a, b) => b.from.length - a.from.length,
  );

  const rules: Array<{
    readonly label: string;
    readonly re: RegExp;
    readonly to: string;
  }> = [];

  for (const { from, to } of sorted) {
    const normalized = normalizeForMatch(from).trim();
    if (!normalized) continue;
    // Custom boundary: treat _ and - as separators so `labo_ulhn` matches.
    const re = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegex(normalized)}(?![A-Za-z0-9])`,
      "gi",
    );
    rules.push({ label: from, re, to });
  }

  const extras: Array<{
    readonly label: string;
    readonly re: RegExp;
    readonly to: string;
  }> = [];
  if (config.patterns.emails.enabled) {
    extras.push({
      label: "<email>",
      re: /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
      to: config.patterns.emails.replacement,
    });
  }
  if (config.patterns.frenchPhones.enabled) {
    extras.push({
      label: "<phone-fr>",
      re: /\b(?:\+33[\s.]?|0)[1-9](?:[\s.]?\d{2}){4}\b/g,
      to: config.patterns.frenchPhones.replacement,
    });
  }
  if (config.patterns.urls.enabled && config.patterns.urls.replacement) {
    extras.push({
      label: "<url>",
      re: /\bhttps?:\/\/\S+/g,
      to: config.patterns.urls.replacement,
    });
  }

  const apply = (value: string): string => {
    if (typeof value !== "string" || value.length === 0) return value;
    let out = value;
    for (const { label, re, to } of rules) {
      const matches = out.match(re);
      if (matches) {
        counts.set(label, (counts.get(label) ?? 0) + matches.length);
        out = out.replace(re, () => to);
      }
    }
    for (const { label, re, to } of extras) {
      const matches = out.match(re);
      if (matches) {
        counts.set(label, (counts.get(label) ?? 0) + matches.length);
        out = out.replace(re, () => to);
      }
    }
    return out;
  };

  return { apply, counts };
};

const fakeDeep = (value: unknown, faker: CompiledFaker): unknown => {
  if (typeof value === "string") return faker.apply(value);
  if (Array.isArray(value)) return value.map((v) => fakeDeep(v, faker));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = fakeDeep(v, faker);
    }
    return out;
  }
  return value;
};

// --- REDCap data dictionary CSV format -------------------------------------

// Columns in the standard REDCap CSV import format. Map JSON metadata
// (returned by `content=metadata&format=json`) to these exact column names
// (REDCap is strict on header text).
const CSV_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ["field_name", "Variable / Field Name"],
  ["form_name", "Form Name"],
  ["section_header", "Section Header"],
  ["field_type", "Field Type"],
  ["field_label", "Field Label"],
  ["select_choices_or_calculations", "Choices, Calculations, OR Slider Labels"],
  ["field_note", "Field Note"],
  [
    "text_validation_type_or_show_slider_number",
    "Text Validation Type OR Show Slider Number",
  ],
  ["text_validation_min", "Text Validation Min"],
  ["text_validation_max", "Text Validation Max"],
  ["identifier", "Identifier?"],
  ["branching_logic", "Branching Logic (Show field only if...)"],
  ["required_field", "Required Field?"],
  ["custom_alignment", "Custom Alignment"],
  ["question_number", "Question Number (surveys only)"],
  ["matrix_group_name", "Matrix Group Name"],
  ["matrix_ranking", "Matrix Ranking?"],
  ["field_annotation", "Field Annotation"],
];

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const renderCsv = (fields: ReadonlyArray<Record<string, unknown>>): string => {
  const header = CSV_COLUMNS.map(([, label]) => csvEscape(label)).join(",");
  const rows = fields.map((f) =>
    CSV_COLUMNS.map(([key]) => csvEscape(f[key])).join(","),
  );
  return [header, ...rows].join("\n") + "\n";
};

// --- Fetch project ---------------------------------------------------------

interface FetchedProject {
  readonly project: {
    readonly project_id: number;
    readonly project_title: string;
  };
  readonly instruments: ReadonlyArray<{
    readonly instrument_name: string;
    readonly instrument_label: string;
  }>;
  readonly fields: ReadonlyArray<Record<string, unknown>>;
}

const fetchProject = (
  client: CrfClient,
): Effect.Effect<FetchedProject, unknown> =>
  Effect.gen(function* () {
    const project = yield* client.getProjectInfo();
    const instruments = yield* client.getInstruments();
    const fields = yield* client.getFields();
    return {
      project: {
        project_id: Number(project.project_id ?? 0),
        project_title: String(project.project_title ?? ""),
      },
      instruments: instruments.map((i) => ({
        instrument_name: String(i.instrument_name ?? ""),
        instrument_label: String(i.instrument_label ?? ""),
      })),
      fields: fields as ReadonlyArray<Record<string, unknown>>,
    };
  });

// --- Main ------------------------------------------------------------------

interface ManifestEntry {
  readonly project_id: number;
  readonly output_csv: string;
  readonly project_title: string;
  readonly used_by: readonly string[];
  readonly description: string;
  readonly instruments: readonly string[];
  readonly fields_count: number;
  readonly fake_substitutions: number;
}

const main = async (): Promise<void> => {
  const rawUrl = extractEnvVar(resolve(REPO_ROOT, ".env"), "REDCAP_API_URL");
  if (!rawUrl) {
    console.error("❌ REDCAP_API_URL not found in .env at repo root.");
    process.exit(1);
  }
  const url = rawUrl.endsWith("/") ? rawUrl : rawUrl + "/";

  const tokenMap = readTokenCsv(resolve(REPO_ROOT, "redcap-token.csv"));
  const fakeMap = JSON.parse(
    readFileSync(resolve(__dirname, "fake-names-map.json"), "utf8"),
  ) as FakeNamesMap;

  const outDir = resolve(REPO_ROOT, "fixtures/crf-projects");
  mkdirSync(outDir, { recursive: true });

  const manifest: ManifestEntry[] = [];
  let okCount = 0;
  let failCount = 0;
  const aggregated = new Map<string, number>();

  console.log(`📂 Output: fixtures/crf-projects/`);
  console.log();

  for (const target of TARGETS) {
    const token = tokenMap.get(target.id);
    if (!token) {
      console.log(
        `  ✗ project #${target.id} (${target.outputName}): token not found in redcap-token.csv`,
      );
      failCount++;
      continue;
    }

    const client = createCrfClient({
      url: CrfUrl(url),
      token: CrfToken(token),
    });

    const result = await Effect.runPromise(Effect.either(fetchProject(client)));

    if (result._tag === "Left") {
      const err = result.left;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ project #${target.id}: ${msg}`);
      failCount++;
      continue;
    }

    const raw = result.right;
    const faker = compileFaker(fakeMap);
    const faked = fakeDeep(raw, faker) as FetchedProject;

    const csv = renderCsv(faked.fields);
    const csvPath = resolve(outDir, `${target.outputName}.csv`);
    writeFileSync(csvPath, csv, "utf8");

    const total = [...faker.counts.values()].reduce((a, b) => a + b, 0);
    for (const [k, n] of faker.counts) {
      aggregated.set(k, (aggregated.get(k) ?? 0) + n);
    }

    console.log(
      `  ✓ project #${target.id} -> ${csvPath.replace(REPO_ROOT + "/", "")}`,
    );
    console.log(
      `       title: ${faked.project.project_title} | instruments: ${faked.instruments.length} | fields: ${faked.fields.length} | substitutions: ${total}`,
    );
    okCount++;

    manifest.push({
      project_id: target.id,
      output_csv: `${target.outputName}.csv`,
      project_title: faked.project.project_title,
      used_by: target.usedBy,
      description: target.description,
      instruments: faked.instruments.map((i) => i.instrument_label),
      fields_count: faked.fields.length,
      fake_substitutions: total,
    });
  }

  // Write manifest
  const manifestPath = resolve(outDir, "index.json");
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        description:
          "Atlas REDCap test fixtures — fake-named, REDCap-importable data dictionaries pour les tests d'intégration des packages consommant l'API REDCap.",
        projects: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log();
  console.log(`📄 Manifest: ${manifestPath.replace(REPO_ROOT + "/", "")}`);
  if (aggregated.size > 0) {
    console.log();
    console.log("🔁 Total substitutions par catégorie :");
    for (const [label, n] of [...aggregated.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`     ${label.padEnd(40)} ${n}`);
    }
  }
  console.log();
  console.log(`✅ Done. ${okCount} fixture(s) generated, ${failCount} failed.`);
};

void main().catch((err: unknown) => {
  const msg =
    err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  console.error("Unexpected error:", msg);
  process.exit(1);
});
