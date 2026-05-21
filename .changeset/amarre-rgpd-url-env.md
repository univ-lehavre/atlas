---
"@univ-lehavre/atlas-amarre": patch
---

Externalize the RGPD notice URL displayed in the "Create request" modal.

The URL was hardcoded in `src/lib/ui/CreateRequest.svelte` and pointed at a specific survey id on `survey.univ-lehavre.fr`. It is now read from `PUBLIC_RGPD_NOTICE_URL` (exposed via `$env/static/public`), so prod / pre-prod / sandbox can each point at their own notice without forking the component.

**Action required after pulling** : add `PUBLIC_RGPD_NOTICE_URL` to your local `apps/amarre/.env*` files. The expected shape is documented in [`apps/amarre/.env.example`](apps/amarre/.env.example). The CI workflow copies `.env.example` → `.env`, so it picks the documented placeholder up automatically.
