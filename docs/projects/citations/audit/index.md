# Citations Audit

> **Last updated:** January 29, 2026

This document presents the audit of the Citations module.

## Current Status

| Metric | Value |
|--------|-------|
| Implemented clients | 2 (OpenAlex, Crossref) |
| Planned clients | 3 (HAL, ArXiv, ORCID) |
| Unified schema | In progress |
| Tests | To be defined |

## Areas of Attention

### Architecture

- Validation of the OpenAPI-first strategy
- Consistency of adapters between sources
- Rate limiting management

### Quality

- Test coverage to be improved
- TSDoc documentation to be completed

## Recommendations

1. Finalize the OpenAlex and Crossref clients before adding new sources
2. Implement integration tests with real APIs
3. Document behavioral differences between sources
