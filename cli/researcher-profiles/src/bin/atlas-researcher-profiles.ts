#!/usr/bin/env node
/**
 * Entry point for atlas-researcher-profiles CLI.
 *
 * This CLI keeps the non-Effect `runMain` wrapper (not `runEffectCli`) on
 * purpose: `main()` is an imperative `Promise<void>` orchestrating several
 * independent Effect steps internally, each with its own error domain and
 * `process.exit` semantics (per-row fetch/match). Collapsing those into a
 * single CLI runtime is explicitly cautioned against by the Effect audit
 * (écart E11 nuance) and is out of scope for the runtime unification —
 * `main()` is not an Effect program at the frontier.
 */

import { runMain } from "@univ-lehavre/atlas-cli-toolkit";
import { main } from "../commands/index.js";

runMain(main);
