---
"@univ-lehavre/atlas-crf": patch
---

Add extended test coverage for CRF package

- Add comprehensive tests for branded types (RedcapToken, RecordId, InstrumentName, Email, etc.)
- Add tests for error types (RedcapHttpError, RedcapApiError, RedcapNetworkError)
- Add tests for version parsing, formatting, and comparison utilities
- Add tests for version adapters (v14, v15, v16) and adapter selection
- Extend client tests with mock fetch for all API methods
- Add tests for Effect-to-Hono response handler
- Add tests for server middleware and validation schemas
