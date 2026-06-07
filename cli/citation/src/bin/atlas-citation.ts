#!/usr/bin/env node
import { runEffectCli } from "@univ-lehavre/atlas-cli-toolkit/effect";
import { program } from "../commands/index.js";

await runEffectCli(program);
