import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { zipSync, strToU8 } from 'fflate';

import { extractZip, getAvailableVersions } from './index.js';

// Décompression en pur JS (fflate) : ces tests verrouillent le remplacement du
// sous-processus `unzip` (non portable Windows / images de base), en construisant
// un ZIP en mémoire puis en vérifiant l'arborescence reconstruite sur disque.

const VERSION = '99.9.9';

function makeUpstream(): string {
  const upstream = mkdtempSync(join(tmpdir(), 'crf-openapi-upstream-'));
  const zip = zipSync({
    [`redcap/redcap_v${VERSION}/index.php`]: strToU8('<?php // entry'),
    [`redcap/redcap_v${VERSION}/lib/helper.php`]: strToU8('<?php // nested'),
  });
  writeFileSync(join(upstream, `redcap${VERSION}.zip`), zip);
  return upstream;
}

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

describe('extractZip', () => {
  it('extrait le ZIP et reconstruit l’arborescence imbriquée', () => {
    const upstream = makeUpstream();
    cleanups.push(upstream);

    const { sourcePath, tmpRoot } = extractZip(upstream, VERSION);
    cleanups.push(tmpRoot);

    expect(existsSync(join(sourcePath, 'index.php'))).toBe(true);
    expect(existsSync(join(sourcePath, 'lib', 'helper.php'))).toBe(true);
    expect(readFileSync(join(sourcePath, 'lib', 'helper.php'), 'utf8')).toContain('nested');
  });

  it('échoue clairement quand le ZIP est absent', () => {
    const upstream = mkdtempSync(join(tmpdir(), 'crf-openapi-empty-'));
    cleanups.push(upstream);
    expect(() => extractZip(upstream, VERSION)).toThrow(/ZIP not found/);
  });
});

describe('getAvailableVersions', () => {
  it('liste les versions à partir des fichiers redcap{version}.zip', () => {
    const upstream = mkdtempSync(join(tmpdir(), 'crf-openapi-versions-'));
    cleanups.push(upstream);
    mkdirSync(upstream, { recursive: true });
    writeFileSync(join(upstream, 'redcap1.2.3.zip'), '');
    writeFileSync(join(upstream, 'redcap10.0.1.zip'), '');
    writeFileSync(join(upstream, 'ignore.txt'), '');

    expect(getAvailableVersions(upstream)).toEqual(['1.2.3', '10.0.1']);
  });
});
