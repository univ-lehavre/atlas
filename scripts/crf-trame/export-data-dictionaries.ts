/**
 * Exporte le dictionnaire de données (data dictionary) des projets CRF/REDCap
 * concernés par les apps Atlas, en anonymisant les informations identifiantes
 * (institution, laboratoires, emails, téléphones).
 *
 * Stratégie d'identification des projets concernés :
 *   1. Lit `redcap-token.csv` à la racine (mapping project_id -> token).
 *   2. Lit les fichiers `.env` des apps Atlas + `.env` racine pour extraire
 *      les valeurs `REDCAP_API_TOKEN` utilisées en runtime.
 *   3. Pour chaque token trouvé, identifie le project_id (via le CSV) ou le
 *      récupère directement via `getProjectInfo()` si non listé.
 *
 * Anonymisation :
 *   - Avant écriture, toutes les valeurs string de la réponse REDCap sont
 *     passées au crible de `redact-patterns.json` (ULHN, labos, emails, etc.).
 *   - Les correspondances sont remplacées par `[REDACTED]` (ou label configuré).
 *   - Un résumé des redactions est imprimé par projet.
 *
 * Pour chaque projet identifié, exporte (après anonymisation) :
 *   - Informations du projet (getProjectInfo)
 *   - Liste des instruments / formulaires (getInstruments)
 *   - Data dictionary complet (getFields)
 *
 * Usage :
 *   pnpm crf:dictionaries:export              # dry-run (par défaut) : liste les projets
 *   pnpm crf:dictionaries:export --apply      # exécute les appels API et sauve les fichiers
 *   pnpm crf:dictionaries:export --apply --all  # idem mais inclut TOUS les tokens du CSV
 *
 * Sortie : `data-dictionaries/<project_id>-<slug>.json` (gitignored).
 *
 * Le script est idempotent : ré-exécution écrase les fichiers.
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

interface CliFlags {
  readonly apply: boolean;
  readonly all: boolean;
  readonly concurrency: number;
}

const parseFlags = (argv: readonly string[]): CliFlags => ({
  apply: argv.includes("--apply"),
  all: argv.includes("--all"),
  concurrency: Number(
    argv.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? 4,
  ),
});

const readTokenCsv = (
  path: string,
): ReadonlyMap<string, string> /* token -> project_id */ => {
  if (!existsSync(path)) return new Map();
  const text = readFileSync(path, "utf8").trim();
  const lines = text.split("\n").slice(1); // skip header
  const map = new Map<string, string>();
  for (const line of lines) {
    const [projectId, token] = line.split(",").map((s) => s.trim());
    if (projectId && token) map.set(token, projectId);
  }
  return map;
};

const extractEnvVar = (filePath: string, varName: string): string | null => {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf8");
  const match = content.match(new RegExp(`^${varName}=["']?([^"\\n]+)`, "m"));
  return match ? match[1].trim().replace(/["']$/, "") : null;
};

const REDCAP_TOKEN_REGEX = /^[A-F0-9]{32}$/;

const isRealToken = (value: string): boolean => REDCAP_TOKEN_REGEX.test(value);

interface TokenSource {
  readonly origin: string;
  readonly token: string;
  readonly projectId: string | null;
}

const collectTokens = (
  tokenToProject: ReadonlyMap<string, string>,
  includeAll: boolean,
): readonly TokenSource[] => {
  const seen = new Map<string, TokenSource>();

  const envFiles = [
    { origin: "root .env", path: ".env" },
    { origin: "apps/amarre/.env", path: "apps/amarre/.env" },
    { origin: "apps/ecrin/.env", path: "apps/ecrin/.env" },
    { origin: "apps/crf-dashboard/.env", path: "apps/crf-dashboard/.env" },
  ];

  for (const { origin, path } of envFiles) {
    const token = extractEnvVar(resolve(REPO_ROOT, path), "REDCAP_API_TOKEN");
    if (token && isRealToken(token) && !seen.has(token)) {
      seen.set(token, {
        origin,
        token,
        projectId: tokenToProject.get(token) ?? null,
      });
    }
  }

  if (includeAll) {
    for (const [token, projectId] of tokenToProject) {
      if (!seen.has(token)) {
        seen.set(token, {
          origin: `redcap-token.csv #${projectId}`,
          token,
          projectId,
        });
      }
    }
  }

  return [...seen.values()];
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// --- Anonymisation ----------------------------------------------------------

interface RedactConfig {
  readonly institutions: readonly string[];
  readonly labs: readonly string[];
  readonly redactionLabel: string;
  readonly alsoRedact: {
    readonly emails: boolean;
    readonly frenchPhones: boolean;
    readonly urls: boolean;
  };
}

interface CompiledRedactor {
  readonly apply: (value: string) => string;
  readonly counts: Map<string, number>;
}

const normalizeForMatch = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compileRedactor = (config: RedactConfig): CompiledRedactor => {
  const counts = new Map<string, number>();
  const literalPatterns: Array<{
    readonly label: string;
    readonly re: RegExp;
  }> = [];

  // Custom boundary that treats `_` and `-` as separators (so `labo_ulhn`
  // matches `ulhn`), unlike `\b` which considers `_` a word char.
  // Uses lookbehind/lookahead for non-alphanumeric.
  for (const term of [...config.institutions, ...config.labs]) {
    const normalized = normalizeForMatch(term).trim();
    if (!normalized) continue;
    const re = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegex(normalized)}(?![A-Za-z0-9])`,
      "gi",
    );
    literalPatterns.push({ label: term, re });
  }

  const extraPatterns: Array<{ readonly label: string; readonly re: RegExp }> =
    [];
  if (config.alsoRedact.emails) {
    extraPatterns.push({
      label: "<email>",
      re: /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
    });
  }
  if (config.alsoRedact.frenchPhones) {
    extraPatterns.push({
      label: "<phone-fr>",
      re: /\b(?:\+33[\s.]?|0)[1-9](?:[\s.]?\d{2}){4}\b/g,
    });
  }
  if (config.alsoRedact.urls) {
    extraPatterns.push({
      label: "<url>",
      re: /\bhttps?:\/\/\S+/g,
    });
  }

  const apply = (value: string): string => {
    if (typeof value !== "string" || value.length === 0) return value;
    let out = value;
    const normalized = normalizeForMatch(out);
    for (const { label, re } of literalPatterns) {
      const matches = normalized.match(re);
      if (matches) {
        counts.set(label, (counts.get(label) ?? 0) + matches.length);
        // Replace in original (case-insensitive, accent-insensitive) by re-running on out
        out = out.replace(re, config.redactionLabel);
      }
    }
    for (const { label, re } of extraPatterns) {
      const matches = out.match(re);
      if (matches) {
        counts.set(label, (counts.get(label) ?? 0) + matches.length);
        out = out.replace(re, config.redactionLabel);
      }
    }
    return out;
  };

  return { apply, counts };
};

const redactDeep = (value: unknown, redactor: CompiledRedactor): unknown => {
  if (typeof value === "string") return redactor.apply(value);
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, redactor));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactDeep(v, redactor);
    }
    return out;
  }
  return value;
};

const loadRedactConfig = (path: string): RedactConfig => {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<RedactConfig>;
  return {
    institutions: raw.institutions ?? [],
    labs: raw.labs ?? [],
    redactionLabel: raw.redactionLabel ?? "[REDACTED]",
    alsoRedact: {
      emails: raw.alsoRedact?.emails ?? true,
      frenchPhones: raw.alsoRedact?.frenchPhones ?? true,
      urls: raw.alsoRedact?.urls ?? false,
    },
  };
};

// ---------------------------------------------------------------------------

interface ProjectExportResult {
  readonly id: string;
  readonly slug: string;
  readonly path: string;
  readonly redactionCounts: ReadonlyMap<string, number>;
  readonly skipped: readonly string[];
}

const formatError = (e: unknown): string =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e !== null
      ? JSON.stringify(e)
      : String(e);

const exportOneProject = (
  client: CrfClient,
  source: TokenSource,
  redactConfig: RedactConfig,
): Effect.Effect<ProjectExportResult, unknown> =>
  Effect.gen(function* () {
    // Each call is independent: if REDCap denies one endpoint (e.g. project
    // info), we still export what we can (typically metadata/fields).
    const projectE = yield* Effect.either(client.getProjectInfo());
    const instrumentsE = yield* Effect.either(client.getInstruments());
    const fieldsE = yield* Effect.either(client.getFields());

    const skipped: string[] = [];
    const project = projectE._tag === "Right" ? projectE.right : null;
    const instruments =
      instrumentsE._tag === "Right" ? instrumentsE.right : null;
    const fields = fieldsE._tag === "Right" ? fieldsE.right : null;

    if (projectE._tag === "Left")
      skipped.push(`project(${formatError(projectE.left)})`);
    if (instrumentsE._tag === "Left")
      skipped.push(`instruments(${formatError(instrumentsE.left)})`);
    if (fieldsE._tag === "Left")
      skipped.push(`fields(${formatError(fieldsE.left)})`);

    // If everything failed, surface the error (the project is truly inaccessible).
    if (project === null && instruments === null && fields === null) {
      return yield* Effect.fail(
        new Error(`all endpoints failed: ${skipped.join(", ")}`),
      );
    }

    const rawId = String(project?.project_id ?? source.projectId ?? "unknown");
    const title = project?.project_title?.toString() ?? `project-${rawId}`;
    const slug = slugify(title) || `project-${rawId}`;
    const outDir = resolve(REPO_ROOT, "data-dictionaries");
    mkdirSync(outDir, { recursive: true });
    const path = resolve(outDir, `${rawId}-${slug}.json`);

    const rawPayload = {
      exported_at: new Date().toISOString(),
      source: source.origin,
      skipped,
      project,
      instruments,
      fields,
    };

    const redactor = compileRedactor(redactConfig);
    const redactedPayload = redactDeep(
      rawPayload,
      redactor,
    ) as typeof rawPayload;

    writeFileSync(path, JSON.stringify(redactedPayload, null, 2), "utf8");

    return { id: rawId, slug, path, redactionCounts: redactor.counts, skipped };
  });

const main = async (): Promise<void> => {
  const flags = parseFlags(process.argv.slice(2));

  const rawUrl = extractEnvVar(resolve(REPO_ROOT, ".env"), "REDCAP_API_URL");
  if (!rawUrl) {
    console.error("❌ REDCAP_API_URL not found in .env at repo root.");
    process.exit(1);
  }
  // REDCap requires a trailing slash on the API endpoint; some servers
  // return 501 without it.
  const url = rawUrl.endsWith("/") ? rawUrl : rawUrl + "/";
  if (url !== rawUrl) {
    console.log(
      `ℹ️  Appending trailing slash to REDCAP_API_URL for compatibility.`,
    );
  }

  const tokenToProject = readTokenCsv(resolve(REPO_ROOT, "redcap-token.csv"));
  const sources = collectTokens(tokenToProject, flags.all);

  console.log(`🔍 Identified ${sources.length} project(s):`);
  for (const s of sources) {
    console.log(
      `  - ${s.origin.padEnd(28)} ${s.projectId ? `project #${s.projectId}` : "(unknown id, will query API)"}`,
    );
  }
  console.log();

  const redactConfig = loadRedactConfig(
    resolve(__dirname, "redact-patterns.json"),
  );
  console.log(
    `🔒 Anonymisation active : ${redactConfig.institutions.length} institution(s), ${redactConfig.labs.length} labo(s), ` +
      `email=${redactConfig.alsoRedact.emails ? "✓" : "✗"} phone=${redactConfig.alsoRedact.frenchPhones ? "✓" : "✗"} url=${redactConfig.alsoRedact.urls ? "✓" : "✗"}`,
  );
  console.log();

  if (!flags.apply) {
    console.log(
      "🟡 Dry-run. Use --apply to actually call REDCap API and write files.",
    );
    console.log("    Add --all to include every token from redcap-token.csv.");
    return;
  }

  console.log(`📡 Calling REDCap API (concurrency=${flags.concurrency})...`);
  let okCount = 0;
  let failCount = 0;
  const aggregatedCounts = new Map<string, number>();

  const tasks = sources.map((s) =>
    Effect.gen(function* () {
      const client = createCrfClient({
        url: CrfUrl(url),
        token: CrfToken(s.token),
      });
      const result = yield* exportOneProject(client, s, redactConfig);
      return result;
    }).pipe(
      Effect.tapBoth({
        onSuccess: (r) =>
          Effect.sync(() => {
            okCount++;
            const total = [...r.redactionCounts.values()].reduce(
              (a, b) => a + b,
              0,
            );
            for (const [label, n] of r.redactionCounts) {
              aggregatedCounts.set(
                label,
                (aggregatedCounts.get(label) ?? 0) + n,
              );
            }
            const redactSuffix =
              total > 0 ? ` (${total} redaction${total > 1 ? "s" : ""})` : "";
            const skipSuffix =
              r.skipped.length > 0
                ? ` [skipped: ${r.skipped.map((s) => s.split("(")[0]).join(", ")}]`
                : "";
            console.log(
              `  ✓ project #${r.id} -> ${r.path.replace(REPO_ROOT + "/", "")}${redactSuffix}${skipSuffix}`,
            );
          }),
        onFailure: (error) =>
          Effect.sync(() => {
            failCount++;
            const message =
              error instanceof Error
                ? error.message
                : typeof error === "object" && error !== null
                  ? JSON.stringify(error)
                  : String(error);
            console.log(`  ✗ ${s.origin} (${s.projectId ?? "?"}): ${message}`);
          }),
      }),
      Effect.catchAll(() => Effect.void),
    ),
  );

  await Effect.runPromise(
    Effect.all(tasks, { concurrency: flags.concurrency }),
  );

  console.log();
  console.log(`✅ Done. ${okCount} succeeded, ${failCount} failed.`);
  if (aggregatedCounts.size > 0) {
    console.log();
    console.log("🔒 Redactions par catégorie :");
    for (const [label, n] of [...aggregatedCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`     ${label.padEnd(40)} ${n}`);
    }
  }
  console.log("   Output: data-dictionaries/ (gitignored)");
};

void main().catch((err: unknown) => {
  const msg =
    err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  console.error("Unexpected error:", msg);
  process.exit(1);
});
