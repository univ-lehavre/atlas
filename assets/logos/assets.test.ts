import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const asset = (name: string) => resolve(dir, name);

describe("logos assets", () => {
  const expected = [
    "amarre.png",
    "amarre-icon.png",
    "ecrin-bw.png",
    "ecrin-color.png",
    "find-an-expert.svg",
    "ulhn.svg",
  ];

  for (const file of expected) {
    it(`${file} exists`, () => {
      expect(existsSync(asset(file))).toBe(true);
    });
  }
});
