# @univ-lehavre/atlas-researcher-profiles

## 1.4.0

### Minor Changes

- [#85](https://github.com/univ-lehavre/atlas/pull/85) [`a2162e7`](https://github.com/univ-lehavre/atlas/commit/a2162e7d68d378bde44f162e2da393327ea18016) Thanks [@chasset](https://github.com/chasset)! - Extract pure service layer into `packages/researcher-profiles`.

  **New package:**
  - `@univ-lehavre/atlas-researcher-profiles`: pure library containing services (csv, openalex, redcap, file-extractor, pdf-generator, reference-matcher), types, errors, and utils (`daysUntilNextUpdate`).

  **Changes:**
  - `@univ-lehavre/atlas-researcher-profiles-cli`: renamed from `@univ-lehavre/atlas-researcher-profiles`. Now a thin CLI — user interaction only, all business logic moved to the library package.

### Patch Changes

- [#85](https://github.com/univ-lehavre/atlas/pull/85) [`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f) Thanks [@chasset](https://github.com/chasset)! - Restructure monorepo into clear architectural categories

  **Breaking changes:**
  - `@univ-lehavre/atlas-crf`: now a pure HTTP service (Hono). The `./redcap` subpath export and CLI binaries (`crf-redcap`, `crf-server`) have been removed. Use `@univ-lehavre/atlas-redcap-client` for the REDCap API client and `@univ-lehavre/atlas-crf-cli` for the CLIs.
  - `@univ-lehavre/atlas-net`: now a pure network diagnostic library. The `./cli` subpath export and `atlas-net` binary have been removed. Use `@univ-lehavre/atlas-net-cli` for the CLI.

  **New packages:**
  - `@univ-lehavre/atlas-redcap-client`: Effect-based REDCap API client, extracted from `@univ-lehavre/atlas-crf`.
  - `@univ-lehavre/atlas-crf-cli`: CLI tools for REDCap connectivity testing and CRF server management (`crf-redcap`, `crf-server`).
  - `@univ-lehavre/atlas-net-cli`: Network diagnostic CLI (`atlas-net`).

- Updated dependencies [[`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f)]:
  - @univ-lehavre/atlas-redcap-client@2.0.0
