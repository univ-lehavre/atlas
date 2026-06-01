import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ROOTS,
  deps,
  internalDepsOf,
  buildDependencyGraph,
  detectCycles,
} from "./lib/workspace-index.mjs";

describe("ROOTS", () => {
  it("liste les huit catégories du monorepo", () => {
    assert.deepEqual(
      [...ROOTS].sort(),
      [
        "apps",
        "assets",
        "cli",
        "config",
        "packages",
        "sandbox",
        "services",
        "ui",
      ],
    );
  });
});

describe("deps", () => {
  it("fusionne les champs demandés", () => {
    const pkg = {
      dependencies: { a: "1" },
      devDependencies: { b: "2" },
      peerDependencies: { c: "3" },
    };
    assert.deepEqual(deps(pkg, "dependencies", "devDependencies"), {
      a: "1",
      b: "2",
    });
  });

  it("ignore les champs absents", () => {
    assert.deepEqual(deps({}, "dependencies", "optionalDependencies"), {});
  });
});

describe("internalDepsOf", () => {
  const workspaces = new Map([
    ["@scope/a", {}],
    ["@scope/b", {}],
    ["@scope/c", {}],
  ]);

  it("ne retient que les dépendances internes, triées", () => {
    const pkg = {
      dependencies: { "@scope/b": "workspace:*", lodash: "^4" },
      devDependencies: { "@scope/a": "workspace:*" },
    };
    assert.deepEqual(internalDepsOf(pkg, workspaces), ["@scope/a", "@scope/b"]);
  });

  it("retourne un tableau vide si aucune dépendance interne", () => {
    assert.deepEqual(internalDepsOf({ dependencies: { lodash: "^4" } }, workspaces), []);
  });
});

describe("buildDependencyGraph", () => {
  it("construit l'adjacence interne", () => {
    const workspaces = new Map([
      ["@scope/a", { packageJson: { dependencies: { "@scope/b": "workspace:*" } } }],
      ["@scope/b", { packageJson: {} }],
    ]);
    const graph = buildDependencyGraph(workspaces);
    assert.deepEqual([...graph.get("@scope/a")], ["@scope/b"]);
    assert.deepEqual([...graph.get("@scope/b")], []);
  });
});

describe("detectCycles", () => {
  it("ne détecte aucun cycle sur un graphe acyclique", () => {
    const graph = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set()],
    ]);
    assert.equal(detectCycles(graph).length, 0);
  });

  it("détecte un cycle direct", () => {
    const graph = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["a"])],
    ]);
    const cycles = detectCycles(graph);
    assert.ok(cycles.length >= 1);
    assert.ok(cycles[0].includes("a") && cycles[0].includes("b"));
  });

  it("détecte un cycle indirect (a→b→c→a)", () => {
    const graph = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set(["a"])],
    ]);
    assert.ok(detectCycles(graph).length >= 1);
  });
});
