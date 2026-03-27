#!/usr/bin/env node
/**
 * Entry point for atlas-researcher-profiles CLI
 */

import { main } from "../cli/index.js";

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
