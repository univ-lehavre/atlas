#!/usr/bin/env node
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (!target) {
  console.error("Usage: atlas-logos-install <target-dir>");
  process.exit(1);
}

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
await mkdir(target, { recursive: true });

const files = (await readdir(pkgRoot)).filter((f) => /\.(png|svg)$/.test(f));
await Promise.all(
  files.map((f) => copyFile(join(pkgRoot, f), join(target, f))),
);

console.log(`atlas-logos: copied ${files.length} file(s) to ${target}`);
