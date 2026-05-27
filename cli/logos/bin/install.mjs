#!/usr/bin/env node
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: atlas-logos-install <target-dir>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const assetsDir = dirname(
  require.resolve("@univ-lehavre/atlas-logos/package.json"),
);

await mkdir(target, { recursive: true });

const files = (await readdir(assetsDir)).filter((f) =>
  /\.(png|svg|jpg)$/.test(f),
);
await Promise.all(
  files.map((f) => copyFile(join(assetsDir, f), join(target, f))),
);

console.log(`atlas-logos: copied ${files.length} file(s) to ${target}`);
