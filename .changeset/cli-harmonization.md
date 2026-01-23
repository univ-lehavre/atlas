---
"@univ-lehavre/atlas-crf": minor
"@univ-lehavre/atlas-net": minor
---

Harmonize CLI tools with @effect/cli and @clack/prompts

- Migrate all CLI tools (crf-redcap, crf-server, atlas-net) to @effect/cli
- Add shared CLI utilities for consistent behavior across tools
- Implement auto-detection of CI environments
- Add standard options: --ci, --json, --verbose, --quiet, --help, --version
- Create new crf-server CLI with port, host, and rate-limit options
- Document exit codes: 0=success, 1=error, 2=config, 3=network, 4=auth
- Add CLI.md documentation for both packages
