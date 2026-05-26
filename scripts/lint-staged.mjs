#!/usr/bin/env node
// Group eslint invocations per package root, so typescript-eslint can resolve
// tsconfigRootDir correctly when staged files span multiple packages
// (e.g. a merge commit). Without grouping, `pnpm exec eslint <files…>` runs
// from the repo root and fails with "multiple candidate TSConfigRootDirs".
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const files = process.argv.slice(2);
if (files.length === 0) process.exit(0);

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
	encoding: 'utf8',
}).trim();

const packageRootOf = (file) => {
	let dir = dirname(resolve(repoRoot, file));
	while (dir.length > repoRoot.length && !existsSync(join(dir, 'package.json'))) {
		dir = dirname(dir);
	}
	return dir;
};

const groups = new Map();
for (const f of files) {
	const root = packageRootOf(f);
	const bucket = groups.get(root) ?? [];
	bucket.push(f);
	groups.set(root, bucket);
}

let failed = false;
for (const [root, groupFiles] of groups) {
	const relFiles = groupFiles.map((f) => relative(root, resolve(repoRoot, f)));
	try {
		execFileSync('pnpm', ['exec', 'eslint', ...relFiles], {
			cwd: root,
			stdio: 'inherit',
		});
	} catch {
		failed = true;
	}
}

process.exit(failed ? 1 : 0);
