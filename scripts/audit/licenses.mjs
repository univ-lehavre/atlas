import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ALLOWED_LICENSES = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSD",
  "ISC",
  "0BSD",
  "Unlicense",
  "CC0-1.0",
  "CC-BY-3.0",
  "CC-BY-4.0",
  "Python-2.0",
  "MPL-2.0",
  "BlueOak-1.0.0",
  "Zlib",
  "WTFPL",
  "Public",
  "Domain",
]);

const PACKAGE_LICENSE_EXCEPTIONS = new Set([
  "@tybys/wasm-util",
  "fsevents",
  "png-js",
  "flatbuffers",
]);

// Préfixes de paquets exemptés de l'allowlist de licences, avec leur raison.
// Le match est par préfixe pour couvrir les variantes plateforme
// (`@sentry/cli-darwin`, `@sentry/cli-linux-x64`, …).
const PACKAGE_LICENSE_EXCEPTION_PREFIXES = [
  // @sentry/cli* : outil build-only de @sentry/sveltekit (upload de
  // sourcemaps). Licence FSL-1.1-MIT (Functional Source License, qui
  // bascule en MIT après 2 ans). Atlas ne l'invoque PAS (pas de plugin
  // Vite Sentry, pas d'auth token) et ne le distribue dans aucun paquet
  // publié — c'est une dépendance transitive de dev jamais embarquée.
  // Phase 13.3.
  "@sentry/cli",
];

// Paquets dont le `package.json` ne déclare PAS de licence (`UNKNOWN` pour
// l'audit) mais dont la licence réelle est connue et permissive, vérifiée
// dans leur fichier LICENSE distribué.
const PACKAGE_LICENSE_KNOWN_UNDECLARED = new Set([
  // khroma : utilitaire de couleurs tiré par mermaid (diagrammes de la doc,
  // ADR 0036). Son package.json omet le champ `license`, mais son fichier
  // `license` indique « MIT © Fabio Spampinato ». Dépendance build-only.
  "khroma",
  // satteri : processeur Markdown/MDX haute performance tiré par
  // `@astrojs/markdown-satteri` → `@astrojs/mdx` (build de la doc Astro,
  // ADR 0036). Son package.json omet le champ `license`, mais son fichier
  // `LICENSE` est une MIT standard (© 2026 Bruits, github.com/bruits/satteri)
  // et son wrapper `@astrojs/markdown-satteri` déclare bien MIT. Dépendance
  // build-only, jamais embarquée dans un paquet publié.
  "satteri",
]);

function extractLicenseTokens(value) {
  if (typeof value !== "string" || value.trim() === "") return [];
  return (value.match(/[A-Za-z0-9-.+]+/g) ?? []).filter(
    (token) =>
      token !== "OR" &&
      token !== "AND" &&
      token !== "WITH" &&
      token !== "SEE" &&
      token !== "LICENSE" &&
      token !== "IN",
  );
}

function isAllowedLicense(value, packageName) {
  if (PACKAGE_LICENSE_EXCEPTIONS.has(packageName)) return true;
  if (
    PACKAGE_LICENSE_EXCEPTION_PREFIXES.some((prefix) =>
      packageName.startsWith(prefix),
    )
  )
    return true;

  // Paquets sans licence déclarée mais dont la licence réelle (fichier LICENSE)
  // est connue et permissive. Le nom peut porter une version (`khroma@2.1.0`).
  if (value === "UNKNOWN") {
    const bareName = packageName.replace(/@[^@]+$/, "");
    if (PACKAGE_LICENSE_KNOWN_UNDECLARED.has(bareName)) return true;
  }

  if (
    value === "UNKNOWN" &&
    (packageName.includes("-linux-") ||
      packageName.includes("-darwin-") ||
      packageName.includes("-win32-") ||
      packageName.includes("-android-") ||
      packageName.includes("-freebsd-") ||
      packageName.includes("-openbsd-") ||
      packageName.includes("-netbsd-") ||
      packageName.includes("-sunos-") ||
      packageName.includes("-arm64") ||
      packageName.includes("-x64") ||
      packageName.includes("-ia32") ||
      packageName.includes("-wasm") ||
      packageName.startsWith("@esbuild/") ||
      packageName.startsWith("@rollup/rollup-") ||
      packageName.startsWith("@parcel/watcher-") ||
      packageName.startsWith("@napi-rs/") ||
      packageName.startsWith("@emnapi/") ||
      packageName.startsWith("@rolldown/binding-") ||
      packageName.startsWith("@oxc-resolver/binding-") ||
      packageName.startsWith("@unrs/resolver-binding-") ||
      packageName.startsWith("@turbo/") ||
      packageName.startsWith("@duckdb/node-bindings-"))
  ) {
    return true;
  }

  if (value.startsWith("SEE LICENSE IN ")) return true;

  const tokens = extractLicenseTokens(value);
  if (tokens.length === 0) return false;
  if (tokens.includes("GPL-3.0-or-later")) {
    return value.includes(" OR ")
      ? tokens.some((token) => ALLOWED_LICENSES.has(token))
      : false;
  }
  return tokens.every((token) => ALLOWED_LICENSES.has(token));
}

function collectDependencyNodes(tree) {
  const stack = [tree];
  const nodes = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;

    const deps = current.dependencies;
    if (!deps || typeof deps !== "object") continue;

    for (const dep of Object.values(deps)) {
      if (!dep || typeof dep !== "object") continue;
      nodes.push(dep);
      stack.push(dep);
    }
  }

  return nodes;
}

function readPackageLicense(packagePath) {
  const packageJsonPath = join(packagePath, "package.json");
  if (!existsSync(packageJsonPath)) return "UNKNOWN";

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return typeof packageJson.license === "string"
      ? packageJson.license
      : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

const run = spawnSync(
  "pnpm",
  ["-r", "list", "--json", "--prod", "--depth", "Infinity"],
  {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  },
);

if (run.status !== 0) {
  process.stderr.write(
    run.stderr || run.stdout || "Failed to collect dependencies.\n",
  );
  process.exit(run.status ?? 1);
}

let projects;
try {
  projects = JSON.parse(run.stdout);
} catch {
  process.stderr.write("Unable to parse dependency tree from pnpm list.\n");
  process.exit(1);
}

const externalPackages = new Map();

for (const project of projects) {
  for (const dep of collectDependencyNodes(project)) {
    const path = dep.path;
    const name = dep.name ?? dep.from;
    const version = dep.version;

    if (
      typeof path !== "string" ||
      !path.includes(`${join("node_modules", ".pnpm")}`)
    ) {
      continue;
    }

    if (typeof name !== "string" || typeof version !== "string") continue;
    if (name.startsWith("@univ-lehavre/atlas-")) continue;

    const id = `${name}@${version}`;
    if (!externalPackages.has(id)) {
      externalPackages.set(id, {
        name,
        version,
        license: readPackageLicense(path),
      });
    }
  }
}

const packages = Array.from(externalPackages.values());
if (packages.length === 0) {
  process.stderr.write(
    "License audit failed: no external packages were inspected.\n",
  );
  process.exit(1);
}

const violations = [];
for (const pkg of packages) {
  if (!isAllowedLicense(pkg.license, pkg.name)) {
    violations.push(pkg);
  }
}

if (violations.length === 0) {
  process.stdout.write(
    `License audit passed (${packages.length} external production packages checked).\n`,
  );
  process.exit(0);
}

process.stderr.write("License audit failed. Non-allowed licenses found:\n");
for (const violation of violations) {
  process.stderr.write(
    `- ${violation.name}@${violation.version}: ${violation.license}\n`,
  );
}
process.stderr.write(
  `Allowed licenses: ${Array.from(ALLOWED_LICENSES).join(", ")}\n`,
);
process.exit(1);
