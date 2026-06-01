#!/usr/bin/env node
/**
 * Entry point for atlas-researcher-profiles CLI
 */

import { runMain } from "@univ-lehavre/atlas-cli-toolkit";
import { main } from "../commands/index.js";

runMain(main);
