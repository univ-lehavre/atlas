import process from "node:process";

export interface CliOptions {
  readonly projectId: number | null;
  readonly all: boolean;
  readonly apiUrl: string | null;
  readonly tokensFile: string;
  readonly content: string;
  readonly timeoutMs: number;
  readonly showBody: boolean;
  readonly json: boolean;
}

const DEFAULT_TOKENS_FILE = "redcap-token.csv";
const DEFAULT_CONTENT = "log";
const DEFAULT_TIMEOUT_MS = 12_000;

const usage = (): string =>
  `
atlas-crf-stats - tester les réponses HTTP REDCap par projet

Usage:
  atlas-crf-stats --project <id> [options]
  atlas-crf-stats --all [options]

Options:
  --project <id>      Tester un seul project_id
  --all               Tester tous les projects du CSV
  --api-url <url>     URL REDCap API (sinon REDCAP_API_URL depuis env/.env)
  --tokens-file <p>   Fichier CSV tokens (défaut: ${DEFAULT_TOKENS_FILE})
  --content <name>    Valeur REDCap content (défaut: ${DEFAULT_CONTENT})
  --timeout-ms <n>    Timeout HTTP en ms (défaut: ${String(DEFAULT_TIMEOUT_MS)})
  --show-body         Affiche un extrait de body pour chaque projet
  --json              Sortie JSON
  -h, --help          Aide

Exemples:
  atlas-crf-stats --project 25
  atlas-crf-stats --project 25 --show-body
  atlas-crf-stats --all --json
`.trim();

const fail = (message: string): never => {
  throw new Error(message);
};

const parseNumber = (value: string, label: string): number => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fail(`${label} invalide: ${value}`) : n;
};

export const parseArgs = (argv: readonly string[]): CliOptions => {
  let projectId: number | null = null;
  let all = false;
  let apiUrl: string | null = null;
  let tokensFile = DEFAULT_TOKENS_FILE;
  let content = DEFAULT_CONTENT;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let showBody = false;
  let json = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--project") {
      const value = argv[i + 1] ?? fail("Argument manquant pour --project");
      projectId = parseNumber(value, "project_id");
      i += 1;
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--api-url") {
      apiUrl = (argv[i + 1] ?? fail("Argument manquant pour --api-url")).trim();
      i += 1;
    } else if (arg === "--tokens-file") {
      tokensFile = (
        argv[i + 1] ?? fail("Argument manquant pour --tokens-file")
      ).trim();
      i += 1;
    } else if (arg === "--content") {
      content = (
        argv[i + 1] ?? fail("Argument manquant pour --content")
      ).trim();
      i += 1;
    } else if (arg === "--timeout-ms") {
      timeoutMs = parseNumber(
        argv[i + 1] ?? fail("Argument manquant pour --timeout-ms"),
        "timeout",
      );
      i += 1;
    } else if (arg === "--show-body") {
      showBody = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      fail(`Option inconnue: ${arg}`);
    }
  }

  if (projectId === null && !all) {
    fail("Tu dois fournir --project <id> ou --all");
  }

  if (projectId !== null && all) {
    fail("Utilise soit --project, soit --all (pas les deux)");
  }

  return {
    projectId,
    all,
    apiUrl,
    tokensFile,
    content,
    timeoutMs,
    showBody,
    json,
  };
};
