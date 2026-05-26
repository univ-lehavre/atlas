/**
 * REDCap API Extractor
 *
 * Analyzes REDCap PHP source code to extract comprehensive API endpoint information
 * and generate a detailed OpenAPI 3.1.0 specification.
 */

import { existsSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { stringify } from 'yaml';

import {
  parseIndexPhp,
  parseHelpPhp,
  parseActionFiles,
  parseClassSchemas,
  parseCurlExamples,
} from './parsers.js';
import { generateOpenApiSpec } from './generator.js';
import type { ExtractorResult } from './types.js';

export * from './types.js';
export { generateOpenApiSpec } from './generator.js';

/**
 * Get available REDCap versions from ZIP files in the upstream directory.
 * Expects files named `redcap{version}.zip` (e.g. `redcap16.1.9.zip`).
 */
export function getAvailableVersions(upstreamPath: string): string[] {
  if (!existsSync(upstreamPath)) {
    return [];
  }

  return readdirSync(upstreamPath)
    .filter((name) => /^redcap[\d.]+\.zip$/.test(name))
    .map((name) => name.replace(/^redcap/, '').replace(/\.zip$/, ''))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Extract a REDCap ZIP to a temporary directory and return the versioned source path.
 * The ZIP structure is expected to be `redcap/redcap_v{version}/`.
 * The caller is responsible for cleaning up the returned `tmpRoot`.
 */
export function extractZip(
  upstreamPath: string,
  version: string
): { sourcePath: string; tmpRoot: string } {
  const zipPath = join(upstreamPath, `redcap${version}.zip`);
  if (!existsSync(zipPath)) {
    throw new Error(`ZIP not found: ${zipPath}`);
  }

  const tmpRoot = join(tmpdir(), `redcap-openapi-${version}-${Date.now()}`);
  mkdirSync(tmpRoot, { recursive: true });

  execFileSync('unzip', ['-q', '-o', zipPath, '-d', tmpRoot]);

  const sourcePath = join(tmpRoot, 'redcap', `redcap_v${version}`);
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Expected path not found after extraction: ${sourcePath}\n` +
        `Check that the ZIP contains redcap/redcap_v${version}/ at its root.`
    );
  }

  return { sourcePath, tmpRoot };
}

export interface ExtractOptions {
  /** REDCap version to extract */
  version: string;
  /** Path to the upstream/ directory containing redcap{version}.zip files */
  upstreamPath: string;
  /** Output path for the generated spec */
  outputPath: string;
  /** Callback for progress messages */
  onProgress?: (message: string) => void;
}

/**
 * Extract API information from REDCap source ZIP and generate OpenAPI spec
 */
export function extract(options: ExtractOptions): ExtractorResult {
  const { version, upstreamPath, outputPath, onProgress } = options;
  const log = onProgress ?? (() => {});

  log(`Extracting ZIP for REDCap v${version}...`);
  const { sourcePath: versionedPath, tmpRoot } = extractZip(upstreamPath, version);
  log(`Parsing REDCap v${version} from ${versionedPath}`);

  // Parse all sources
  log('Parsing index.php...');
  const contentTypes = parseIndexPhp(versionedPath);
  log(`  Found ${contentTypes.length} content types`);

  log('Parsing help.php...');
  const helpSections = parseHelpPhp(versionedPath);
  log(`  Found ${helpSections.size} documented endpoints`);

  log('Parsing action files...');
  const actionFiles = parseActionFiles(versionedPath, contentTypes);
  log(`  Found ${actionFiles.size} action implementations`);

  log('Parsing class schemas...');
  const schemas = parseClassSchemas(versionedPath);
  log(`  Found ${schemas.length} data schemas`);

  log('Parsing curl examples...');
  const examples = parseCurlExamples(versionedPath);
  log(`  Found ${examples.size} example sets`);

  // Generate OpenAPI spec
  log('Generating OpenAPI specification...');
  const spec = generateOpenApiSpec({
    version,
    contentTypes,
    helpSections,
    actionFiles,
    schemas,
  });

  // Write output
  const yamlOutput = stringify(spec, {
    lineWidth: 0,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, yamlOutput, 'utf-8');
  log(`Spec written to ${outputPath}`);

  rmSync(tmpRoot, { recursive: true, force: true });

  return {
    contentTypes,
    helpSections,
    actionFiles,
    schemas,
    examples,
    specPath: outputPath,
  };
}
