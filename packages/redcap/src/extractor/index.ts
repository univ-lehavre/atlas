/**
 * REDCap API Extractor
 *
 * Analyzes REDCap PHP source code to extract comprehensive API endpoint information
 * and generate a detailed OpenAPI 3.1.0 specification.
 */

import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
 * Find the versioned path for REDCap source
 */
export function findVersionedPath(basePath: string, version: string): string | null {
  const versionPath = join(basePath, version);

  if (existsSync(versionPath)) {
    const versionedName = `redcap_v${version}`;
    const nestedPath = join(versionPath, versionedName);
    if (existsSync(nestedPath)) {
      return nestedPath;
    }
    return versionPath;
  }

  if (!existsSync(basePath)) {
    return null;
  }

  const entries = readdirSync(basePath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const entryPath = join(basePath, entry.name);
      const innerEntries = readdirSync(entryPath, { withFileTypes: true });
      for (const inner of innerEntries) {
        if (inner.isDirectory() && inner.name.startsWith('redcap_v')) {
          return join(entryPath, inner.name);
        }
      }
      return entryPath;
    }
  }

  return null;
}

/**
 * Get available REDCap versions from the source directory
 */
export function getAvailableVersions(basePath: string): string[] {
  if (!existsSync(basePath)) {
    return [];
  }

  return readdirSync(basePath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export interface ExtractOptions {
  /** REDCap version to extract */
  version: string;
  /** Base path to upstream/versions */
  sourcePath: string;
  /** Output path for the generated spec */
  outputPath: string;
  /** Callback for progress messages */
  onProgress?: (message: string) => void;
}

/**
 * Extract API information from REDCap source and generate OpenAPI spec
 */
export function extract(options: ExtractOptions): ExtractorResult {
  const { version, sourcePath, outputPath, onProgress } = options;
  const log = onProgress ?? (() => {});

  const versionedPath = findVersionedPath(sourcePath, version);
  if (!versionedPath) {
    throw new Error(`REDCap version ${version} not found in ${sourcePath}`);
  }

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

  return {
    contentTypes,
    helpSections,
    actionFiles,
    schemas,
    examples,
    specPath: outputPath,
  };
}
