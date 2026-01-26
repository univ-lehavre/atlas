#!/usr/bin/env node
/**
 * REDCap CLI
 *
 * Unified command-line interface for REDCap source analysis tools.
 *
 * Commands:
 *   extract  - Extract OpenAPI spec from REDCap PHP source
 *   compare  - Compare two OpenAPI spec versions
 *   docs     - Serve API documentation with Swagger UI and Redoc
 */

import { intro, outro, select, text, spinner, log, cancel, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extract, getAvailableVersions } from '../extractor/index.js';
import { compare, getAvailableSpecs } from '../comparator/index.js';
import { serve } from '../server/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '../..');
const SOURCE_PATH = join(PACKAGE_ROOT, 'upstream/versions');
const SPECS_PATH = join(PACKAGE_ROOT, 'specs/versions');

type Command = 'extract' | 'compare' | 'docs' | 'exit';

async function runExtract(): Promise<void> {
  const versions = getAvailableVersions(SOURCE_PATH);

  if (versions.length === 0) {
    log.error('No REDCap versions found in upstream/versions/');
    log.info('Place REDCap source code in upstream/versions/<version>/');
    return;
  }

  const version = await select({
    message: 'Select REDCap version to extract',
    options: versions.map((v) => ({ value: v, label: `v${v}` })),
  });

  if (isCancel(version)) {
    cancel('Operation cancelled');
    return;
  }

  const outputPath = join(SPECS_PATH, `redcap-${version}.yaml`);

  const s = spinner();
  s.start(`Extracting API from REDCap v${version}...`);

  try {
    const result = extract({
      version: version as string,
      sourcePath: SOURCE_PATH,
      outputPath,
      onProgress: (msg) => s.message(msg),
    });

    s.stop(`Extraction complete!`);

    log.success(`OpenAPI spec written to: ${pc.cyan(result.specPath)}`);
    log.info(`
  ${pc.bold('Summary:')}
  - Content types: ${pc.green(result.contentTypes.length.toString())}
  - Documented endpoints: ${pc.green(result.helpSections.size.toString())}
  - Action implementations: ${pc.green(result.actionFiles.size.toString())}
  - Data schemas: ${pc.green(result.schemas.length.toString())}
  - Curl examples: ${pc.green(result.examples.size.toString())}
`);
  } catch (error) {
    s.stop('Extraction failed');
    log.error(error instanceof Error ? error.message : String(error));
  }
}

async function runCompare(): Promise<void> {
  const specs = getAvailableSpecs(SPECS_PATH);

  if (specs.length < 2) {
    log.error('Need at least 2 spec versions to compare.');
    log.info('Run "extract" first to generate specs from different REDCap versions.');
    return;
  }

  const oldVersion = await select({
    message: 'Select older version',
    options: specs.map((v) => ({ value: v, label: `v${v}` })),
  });

  if (isCancel(oldVersion)) {
    cancel('Operation cancelled');
    return;
  }

  const newVersion = await select({
    message: 'Select newer version',
    options: specs.filter((v) => v !== oldVersion).map((v) => ({ value: v, label: `v${v}` })),
  });

  if (isCancel(newVersion)) {
    cancel('Operation cancelled');
    return;
  }

  const s = spinner();
  s.start(`Comparing v${oldVersion} with v${newVersion}...`);

  try {
    const result = compare({
      oldSpecPath: join(SPECS_PATH, `redcap-${oldVersion}.yaml`),
      newSpecPath: join(SPECS_PATH, `redcap-${newVersion}.yaml`),
      oldVersion: oldVersion as string,
      newVersion: newVersion as string,
    });

    s.stop('Comparison complete!');

    if (result.removed.length === 0 && result.added.length === 0 && result.changed.length === 0) {
      log.success('No discrepancies found between specs.');
      return;
    }

    log.info(
      `Found ${result.removed.length + result.added.length + result.changed.length} discrepancies:\n`
    );

    if (result.removed.length > 0) {
      log.warn(`${pc.bold(`Removed in v${newVersion}:`)} (${result.removed.length})`);
      for (const r of result.removed.slice(0, 10)) {
        console.log(`  ${pc.red('−')} ${r.message}`);
      }
      if (result.removed.length > 10) {
        console.log(`  ${pc.dim(`... and ${result.removed.length - 10} more`)}`);
      }
      console.log();
    }

    if (result.added.length > 0) {
      log.info(`${pc.bold(`Added in v${newVersion}:`)} (${result.added.length})`);
      for (const r of result.added.slice(0, 10)) {
        console.log(`  ${pc.green('+')} ${r.message}`);
      }
      if (result.added.length > 10) {
        console.log(`  ${pc.dim(`... and ${result.added.length - 10} more`)}`);
      }
      console.log();
    }

    if (result.changed.length > 0) {
      log.warn(`${pc.bold('Changed between versions:')} (${result.changed.length})`);
      for (const r of result.changed.slice(0, 10)) {
        console.log(`  ${pc.yellow('~')} ${r.message}`);
        console.log(`    ${pc.dim(`v${oldVersion}:`)} ${JSON.stringify(r.oldValue)}`);
        console.log(`    ${pc.dim(`v${newVersion}:`)} ${JSON.stringify(r.newValue)}`);
      }
      if (result.changed.length > 10) {
        console.log(`  ${pc.dim(`... and ${result.changed.length - 10} more`)}`);
      }
      console.log();
    }

    if (result.hasBreakingChanges) {
      log.warn(pc.yellow('⚠ Breaking changes detected!'));
    }
  } catch (error) {
    s.stop('Comparison failed');
    log.error(error instanceof Error ? error.message : String(error));
  }
}

async function runDocs(): Promise<void> {
  const specs = getAvailableSpecs(SPECS_PATH);

  if (specs.length === 0) {
    log.error('No spec versions found.');
    log.info('Run "extract" first to generate a spec from REDCap source.');
    return;
  }

  const version = await select({
    message: 'Select spec version to serve',
    options: specs.map((v) => ({ value: v, label: `v${v}` })),
  });

  if (isCancel(version)) {
    cancel('Operation cancelled');
    return;
  }

  const portInput = await text({
    message: 'Port to serve on',
    placeholder: '3000',
    defaultValue: '3000',
    validate: (value) => {
      const port = Number.parseInt(value, 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        return 'Please enter a valid port number (1-65535)';
      }
    },
  });

  if (isCancel(portInput)) {
    cancel('Operation cancelled');
    return;
  }

  const port = Number.parseInt(portInput as string, 10);
  const specPath = join(SPECS_PATH, `redcap-${version}.yaml`);

  log.info(`Starting documentation server for v${version}...`);

  serve({
    specPath,
    port,
    onStart: (urls) => {
      console.log(`
${pc.bold('REDCap API Documentation Server')}
${pc.dim('─'.repeat(40))}

  ${pc.bold('Home:')}         ${pc.cyan(urls.home)}
  ${pc.bold('Swagger UI:')}   ${pc.cyan(urls.swagger)}
  ${pc.bold('Redoc:')}        ${pc.cyan(urls.redoc)}
  ${pc.bold('OpenAPI YAML:')} ${pc.cyan(urls.yaml)}
  ${pc.bold('OpenAPI JSON:')} ${pc.cyan(urls.json)}

${pc.dim('Press Ctrl+C to stop')}
`);
    },
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Direct command execution
  if (args.length > 0) {
    const command = args[0] as Command;

    switch (command) {
      case 'extract':
        intro(pc.bold('REDCap API Extractor'));
        await runExtract();
        outro('Done!');
        break;

      case 'compare':
        intro(pc.bold('REDCap Spec Comparator'));
        await runCompare();
        outro('Done!');
        break;

      case 'docs':
        intro(pc.bold('REDCap Documentation Server'));
        await runDocs();
        break;

      default:
        console.log(`
${pc.bold('REDCap CLI')} - REDCap source analysis tools

${pc.bold('Usage:')}
  redcap <command>

${pc.bold('Commands:')}
  ${pc.cyan('extract')}   Extract OpenAPI spec from REDCap PHP source
  ${pc.cyan('compare')}   Compare two OpenAPI spec versions
  ${pc.cyan('docs')}      Serve API documentation

${pc.bold('Examples:')}
  redcap extract
  redcap compare
  redcap docs
`);
        process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1);
    }
    return;
  }

  // Interactive mode
  intro(pc.bold('REDCap CLI'));

  const command = await select<Command>({
    message: 'What would you like to do?',
    options: [
      {
        value: 'extract',
        label: 'Extract API',
        hint: 'Generate OpenAPI spec from REDCap source',
      },
      {
        value: 'compare',
        label: 'Compare specs',
        hint: 'Compare two OpenAPI spec versions',
      },
      {
        value: 'docs',
        label: 'Serve docs',
        hint: 'Start documentation server',
      },
      {
        value: 'exit',
        label: 'Exit',
      },
    ],
  });

  if (isCancel(command) || command === 'exit') {
    cancel('Goodbye!');
    process.exit(0);
  }

  switch (command) {
    case 'extract':
      await runExtract();
      break;
    case 'compare':
      await runCompare();
      break;
    case 'docs':
      await runDocs();
      break;
  }

  outro('Done!');
}

main().catch((error) => {
  console.error(pc.red('Error:'), error);
  process.exit(1);
});
