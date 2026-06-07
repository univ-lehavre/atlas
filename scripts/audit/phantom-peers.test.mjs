import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { findPhantomPeers, OPTIONAL_EFFECT_PEERS } from "./phantom-peers.mjs";

const ws = (entries) => new Map(entries);
const neverImported = () => false;
const alwaysImported = () => true;

describe("OPTIONAL_EFFECT_PEERS", () => {
  it("covers the @effect/* peers removed by E4", () => {
    for (const dep of ["@effect/cluster", "@effect/rpc", "@effect/sql"]) {
      assert.ok(OPTIONAL_EFFECT_PEERS.has(dep), `${dep} should be tracked`);
    }
  });
});

describe("findPhantomPeers", () => {
  it("flags a declared-but-never-imported optional @effect/* peer", () => {
    const workspaces = ws([
      [
        "@univ-lehavre/atlas-net-cli",
        {
          dir: "cli/net",
          packageJson: { dependencies: { "@effect/sql": "~0.51.1" } },
        },
      ],
    ]);

    const findings = findPhantomPeers(workspaces, neverImported);

    assert.deepEqual(findings, [
      { pkg: "@univ-lehavre/atlas-net-cli", dep: "@effect/sql" },
    ]);
  });

  it("does NOT flag an optional peer that is actually imported", () => {
    const workspaces = ws([
      [
        "pkg",
        {
          dir: "cli/x",
          packageJson: { dependencies: { "@effect/sql": "~0.51.1" } },
        },
      ],
    ]);

    assert.deepEqual(findPhantomPeers(workspaces, alwaysImported), []);
  });

  it("respects knip.ignoreDependencies (ADR 0019 dérogation)", () => {
    const workspaces = ws([
      [
        "pkg",
        {
          dir: "packages/x",
          packageJson: {
            dependencies: { "@effect/experimental": "~0.60.0" },
            knip: { ignoreDependencies: ["@effect/experimental"] },
          },
        },
      ],
    ]);

    assert.deepEqual(findPhantomPeers(workspaces, neverImported), []);
  });

  it("ignores @effect/* packages that are NOT in the optional set", () => {
    // @effect/platform / @effect/cli are legitimate peers, not optional phantoms.
    const workspaces = ws([
      [
        "pkg",
        {
          dir: "cli/x",
          packageJson: {
            dependencies: {
              "@effect/platform": "~0.96.1",
              "@effect/cli": "~0.75.1",
            },
          },
        },
      ],
    ]);

    assert.deepEqual(findPhantomPeers(workspaces, neverImported), []);
  });

  it("scans both dependencies and devDependencies", () => {
    const workspaces = ws([
      [
        "pkg",
        {
          dir: "packages/x",
          packageJson: { devDependencies: { "@effect/rpc": "~0.75.1" } },
        },
      ],
    ]);

    assert.deepEqual(findPhantomPeers(workspaces, neverImported), [
      { pkg: "pkg", dep: "@effect/rpc" },
    ]);
  });

  it("returns empty when no optional peers are declared", () => {
    const workspaces = ws([
      [
        "pkg",
        {
          dir: "packages/x",
          packageJson: { dependencies: { effect: "~3.21.2" } },
        },
      ],
    ]);

    assert.deepEqual(findPhantomPeers(workspaces, neverImported), []);
  });
});
