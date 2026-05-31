#!/usr/bin/env -S tsx
/**
 * Seeds the sillage REDCap project with realistic synthetic records.
 *
 * Strategy
 * --------
 * For each record we pick a *scenario* (incomplete request, awaiting
 * reviews, validated, refused) and then walk the data dictionary, only
 * filling fields whose branching_logic evaluates to true given the
 * other field values we've chosen so far.
 *
 * Branching logic is REDCap's mini-DSL : `[field]=value`, optional
 * `OR` / `AND`, optional `<>` for inequality. We implement just that
 * subset — enough for the sillage dictionary (118 fields).
 *
 * Fake values use @faker-js/faker with `fr` locale so the data reads
 * naturally. Dropdown/radio choices are picked from the dictionary's
 * `select_choices_or_calculations` field.
 *
 * Idempotence : the import endpoint with `overwriteBehavior=normal`
 * upserts on record_id, so re-running the script with the same seed
 * is safe (and deterministic if SEED is set).
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fakerFR as faker } from "@faker-js/faker";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");
const REPO_ROOT = resolve(SANDBOX_DIR, "../..");
const DATA_DICT_PATH = resolve(
  REPO_ROOT,
  "data-dictionaries/136-ecrin-v2-alpha.json",
);

interface Field {
  field_name: string;
  form_name: string;
  field_type: string;
  field_label: string;
  select_choices_or_calculations: string;
  branching_logic: string;
  text_validation_type_or_show_slider_number: string;
  required_field: string;
}

interface DataDictionary {
  fields: Field[];
}

type Record_ = { [field: string]: string };

const parseEnv = async (): Promise<Record_> => {
  const raw = await readFile(ENV_PATH, "utf8").catch(() => {
    throw new Error(`Missing ${ENV_PATH}. Run bootstrap first.`);
  });
  const out: Record_ = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return out;
};

const parseChoices = (raw: string): Array<{ code: string; label: string }> => {
  if (!raw) return [];
  return raw.split("|").map((pair) => {
    const [code, ...rest] = pair.split(",");
    return { code: code.trim(), label: rest.join(",").trim() };
  });
};

/**
 * Evaluate REDCap branching logic against a partial record.
 * Supports : [field], =, <>, AND, OR, parentheses. No nesting beyond
 * what the sillage dictionary uses.
 */
const evaluateBranching = (expr: string, record: Record_): boolean => {
  if (!expr) return true;
  // Replace [field] with quoted current value
  const filled = expr.replace(/\[([a-z0-9_]+)\]/gi, (_, name: string) => {
    const v = record[name] ?? "";
    return JSON.stringify(v);
  });
  // Build a JS-evaluable form. ` = ` → ` === `, ` <> ` → ` !== `,
  // ` AND ` → ` && `, ` OR ` → ` || `.
  const js = filled
    .replace(/<>/g, "!==")
    .replace(/(?<![=!<>])=(?!=)/g, "===")
    .replace(/\bAND\b/gi, "&&")
    .replace(/\bOR\b/gi, "||");
  try {
    return Boolean(new Function(`return (${js});`)());
  } catch {
    // Anything funky → treat as visible. Better to over-fill than skip
    // a required field and have REDCap reject the import.
    return true;
  }
};

type Scenario = "incomplete" | "awaiting_reviews" | "validated" | "refused";

const pickScenario = (): Scenario => {
  const r = faker.number.float({ min: 0, max: 1 });
  if (r < 0.2) return "incomplete";
  if (r < 0.5) return "awaiting_reviews";
  if (r < 0.9) return "validated";
  return "refused";
};

const fakeText = (label: string): string => {
  const l = label.toLowerCase();
  if (l.includes("nom") && !l.includes("prénom"))
    return faker.person.lastName();
  if (l.includes("prénom")) return faker.person.firstName();
  if (l.includes("adresse")) return faker.location.streetAddress();
  if (l.includes("téléphone")) return faker.phone.number();
  if (l.includes("nationalité")) return faker.location.country();
  if (l.includes("motif") || l.includes("objet") || l.includes("justif")) {
    return faker.lorem.sentence();
  }
  if (l.includes("université")) return faker.company.name();
  if (l.includes("période")) {
    const start = faker.date.future();
    const end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 7);
    return `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`;
  }
  return faker.lorem.words({ min: 2, max: 5 });
};

const fakeFieldValue = (field: Field, record: Record_): string => {
  switch (field.field_type) {
    case "descriptive":
      return "";
    case "dropdown":
    case "radio": {
      const choices = parseChoices(field.select_choices_or_calculations);
      if (choices.length === 0) return "";
      return faker.helpers.arrayElement(choices).code;
    }
    case "checkbox": {
      const choices = parseChoices(field.select_choices_or_calculations);
      // checkbox values get split into field_name___code = 0/1 by REDCap
      // but for `content=record&format=json` we use comma-separated codes
      const picked = faker.helpers.arrayElements(choices, {
        min: 1,
        max: choices.length,
      });
      return picked.map((c) => c.code).join(",");
    }
    case "yesno":
      return faker.helpers.arrayElement(["0", "1"]);
    case "truefalse":
      return faker.helpers.arrayElement(["0", "1"]);
    case "notes":
      return faker.lorem.sentences({ min: 1, max: 3 });
    case "text":
    default:
      switch (field.text_validation_type_or_show_slider_number) {
        case "email":
          return faker.internet.email().toLowerCase();
        case "number":
        case "integer":
          return String(faker.number.int({ min: 1, max: 90 }));
        case "date_dmy":
        case "date_mdy":
        case "date_ymd":
          return faker.date
            .between({ from: "1960-01-01", to: "2005-12-31" })
            .toISOString()
            .slice(0, 10);
        case "datetime_dmy":
        case "datetime_seconds_dmy":
          return faker.date
            .recent()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
        case "time":
          return `${String(faker.number.int({ min: 8, max: 18 })).padStart(2, "0")}:${String(faker.number.int({ min: 0, max: 59 })).padStart(2, "0")}`;
        default:
          if (field.field_name === "record_id")
            return record["record_id"] ?? "";
          if (field.field_name === "created_at") {
            return faker.date.recent({ days: 90 }).toISOString();
          }
          if (field.field_name === "userid")
            return faker.string.alphanumeric(20);
          return fakeText(field.field_label);
      }
  }
};

/**
 * Set the *_complete flags depending on the scenario. Form-complete in
 * REDCap is a per-form `<form_name>_complete` field, value 0/1/2.
 */
const applyScenario = (
  record: Record_,
  scenario: Scenario,
  forms: string[],
): void => {
  const setAll = (value: string): void => {
    for (const form of forms) record[`${form}_complete`] = value;
  };
  switch (scenario) {
    case "incomplete":
      setAll("0");
      // demandeur_composante / labo / encadrant / validation = 0 too
      break;
    case "awaiting_reviews":
      record["contact_complete"] = "2";
      record["form_complete"] = "2";
      record["demandeur_composante_complete"] = faker.helpers.arrayElement([
        "0",
        "1",
      ]);
      record["labo_complete"] = "0";
      record["encadrant_complete"] = "0";
      record["validation_finale_complete"] = "0";
      record["admin_complete"] = "0";
      break;
    case "validated":
      setAll("2");
      // 1 = Favorable, 2 = Favorable sous réserve, 3 = Défavorable.
      record["avis_composante_position"] = "1";
      record["avis_laboratoire_position"] = "1";
      record["avis_encadrant_position"] = "1";
      break;
    case "refused":
      setAll("2");
      record["avis_composante_position"] = faker.helpers.arrayElement([
        "2",
        "3",
      ]);
      record["avis_laboratoire_position"] = "3";
      record["avis_encadrant_position"] = faker.helpers.arrayElement([
        "1",
        "3",
      ]);
      break;
  }
};

// Some snapshots have PII-redacted field names (e.g. `alignement_[REDACTED]`)
// that REDCap's metadata API accepts but its record API rejects. Filter
// them out at seed time — they're a dictionary export artifact, not a
// real form requirement.
const isValidFieldName = (name: string): boolean =>
  /^[a-z][a-z0-9_]*$/.test(name);

const buildRecord = (id: number, fields: Field[], forms: string[]): Record_ => {
  const record: Record_ = { record_id: String(id) };
  const scenario = pickScenario();

  for (const field of fields) {
    if (field.field_type === "descriptive") continue;
    if (field.field_name === "record_id") continue;
    if (field.field_name.endsWith("_complete")) continue;
    if (!isValidFieldName(field.field_name)) continue;
    if (!evaluateBranching(field.branching_logic, record)) continue;
    record[field.field_name] = fakeFieldValue(field, record);
  }

  applyScenario(record, scenario, forms);
  return record;
};

const importRecords = async (
  crfUrl: string,
  token: string,
  records: Record_[],
): Promise<void> => {
  const params = new URLSearchParams();
  params.set("token", token);
  params.set("content", "record");
  params.set("action", "import");
  params.set("format", "json");
  params.set("type", "flat");
  params.set("overwriteBehavior", "normal");
  params.set("forceAutoNumber", "false");
  params.set("data", JSON.stringify(records));
  params.set("returnContent", "count");
  params.set("returnFormat", "json");

  const r = await fetch(crfUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`REDCap record import failed (HTTP ${r.status}): ${text}`);
  }
  console.log(`  ✓ Imported ${text.trim()}`);
};

const main = async (): Promise<void> => {
  const env = await parseEnv();
  const crfUrl = env["PUBLIC_CRF_URL"] || "http://localhost:8888/api/";
  const token = env["CRF_API_TOKEN"];
  if (!token || token.startsWith("__")) {
    throw new Error(
      "CRF_API_TOKEN not set in .env — run `pnpm bootstrap:crf` first",
    );
  }

  const seed = process.env["FAKER_SEED"]
    ? Number(process.env["FAKER_SEED"])
    : Date.now();
  faker.seed(seed);
  console.log(`==> Seed: ${seed}`);

  const countArg = process.argv.find((a) => a.startsWith("--count="));
  const envCount = Number(env["SEED_RECORD_COUNT"] || "120");
  const count = countArg ? Number(countArg.slice("--count=".length)) : envCount;
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid record count: ${count}`);
  }

  console.log(`==> Loading data dictionary`);
  const raw = await readFile(DATA_DICT_PATH, "utf8").catch(() => {
    throw new Error(
      `Data dictionary not found at ${DATA_DICT_PATH}\n` +
        `\n` +
        `This file is gitignored. Run \`pnpm crf:dictionaries:export --apply\`\n` +
        `from the repo root, or ask a teammate for the anonymised export.\n` +
        `See apps/sillage/tests/RUNBOOK.md → "Préparer le data dictionary".`,
    );
  });
  const dict = JSON.parse(raw) as DataDictionary;
  const forms = Array.from(new Set(dict.fields.map((f) => f.form_name)));

  console.log(
    `==> Building ${count} synthetic records (${forms.length} forms, ${dict.fields.length} fields)`,
  );
  const records: Record_[] = [];
  for (let i = 1; i <= count; i++) {
    records.push(buildRecord(i, dict.fields, forms));
  }

  console.log(`==> Importing into REDCap (${crfUrl})`);
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    await importRecords(crfUrl, token, records.slice(i, i + batchSize));
  }

  console.log(
    `\nDone. ${records.length} records seeded into the sillage project.`,
  );
};

main().catch((err) => {
  console.error(`\n✗ seed-fake-data failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
