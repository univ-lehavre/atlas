---
"@univ-lehavre/atlas-amarre-sandbox": patch
---

Auto-fallback to fake seed when the prod REDCap is unreachable, instead of dying half-way through `pnpm bootstrap`.

`bootstrap.sh` under `set -e` previously exited 1 when `pull:prod` failed (off-VPN → 302 → 403 on the ULHN reverse proxy, rotated token, server down), leaving step [4/4] `apps/amarre/.env.local` unwritten and the sandbox in an unusable half-state. The script now probes `PROD_CRF_URL` with a 5s timeout `content=version` call before committing to `pull:prod` and falls back to `pnpm seed` (synthetic data) when the probe doesn't return HTTP 200. `SEED_MODE=prod` stays explicit when forced, but the auto-detection becomes resilient.

Out-of-band : recorded the SDK 25 + `appwrite/appwrite:1.9.0` alignment decision in `TODO.md` (downgrade ruled out, would break `apps/ecrin` which consumes `TablesDB` introduced in 1.9.x).
